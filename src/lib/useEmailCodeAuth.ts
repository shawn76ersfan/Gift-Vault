import { isClerkAPIResponseError } from '@clerk/expo';
import { useSignIn, useSignUp } from '@clerk/expo/legacy';
import { useState } from 'react';

type Step = 'email' | 'code';
type Mode = 'signIn' | 'signUp';

const NOT_FOUND_CODES = ['form_identifier_not_found', 'invitation_account_not_exists'];

function readError(error: unknown): string {
  if (isClerkAPIResponseError(error)) {
    return error.errors[0]?.longMessage ?? error.errors[0]?.message ?? 'Something went wrong. Please try again.';
  }
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

export function useEmailCodeAuth() {
  const signInState = useSignIn();
  const signUpState = useSignUp();
  const [step, setStep] = useState<Step>('email');
  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = signInState.isLoaded && signUpState.isLoaded;

  async function startSignUp(emailAddress: string) {
    if (!signUpState.isLoaded) return;
    await signUpState.signUp.create({ emailAddress });
    await signUpState.signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
    setMode('signUp');
    setStep('code');
  }

  async function submitEmail(value: string) {
    if (!signInState.isLoaded) return;
    const identifier = value.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)) {
      setError('Please enter a valid email address');
      return;
    }
    setEmail(identifier);
    setBusy(true);
    setError(null);
    try {
      const attempt = await signInState.signIn.create({ identifier });
      const factor = attempt.supportedFirstFactors?.find((f) => f.strategy === 'email_code');
      if (!factor || !('emailAddressId' in factor)) {
        setError('Email codes are not enabled for this account. Enable "Email verification code" in Clerk.');
        return;
      }
      await signInState.signIn.prepareFirstFactor({ strategy: 'email_code', emailAddressId: factor.emailAddressId });
      setMode('signIn');
      setStep('code');
    } catch (err) {
      if (isClerkAPIResponseError(err) && err.errors.some((e) => NOT_FOUND_CODES.includes(e.code))) {
        try {
          await startSignUp(identifier);
        } catch (signUpError) {
          setError(readError(signUpError));
        }
      } else {
        setError(readError(err));
      }
    } finally {
      setBusy(false);
    }
  }

  async function submitCode(code: string) {
    if (!signInState.isLoaded || !signUpState.isLoaded) return;
    setBusy(true);
    setError(null);
    try {
      if (mode === 'signIn') {
        const result = await signInState.signIn.attemptFirstFactor({ strategy: 'email_code', code: code.trim() });
        if (result.status === 'complete') {
          await signInState.setActive({ session: result.createdSessionId });
        } else {
          setError('Additional verification is required. Please finish signing in on the web.');
        }
      } else {
        const result = await signUpState.signUp.attemptEmailAddressVerification({ code: code.trim() });
        if (result.status === 'complete') {
          await signUpState.setActive({ session: result.createdSessionId });
        } else {
          setError('Your account needs more details. Check required fields in your Clerk dashboard.');
        }
      }
    } catch (err) {
      setError(readError(err));
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setError(null);
    if (mode === 'signUp') {
      if (!signUpState.isLoaded) return;
      await signUpState.signUp.prepareEmailAddressVerification({ strategy: 'email_code' }).catch((e: unknown) => setError(readError(e)));
    } else {
      await submitEmail(email);
    }
  }

  function reset() {
    setStep('email');
    setError(null);
  }

  return { ready, step, mode, email, busy, error, submitEmail, submitCode, resend, reset };
}
