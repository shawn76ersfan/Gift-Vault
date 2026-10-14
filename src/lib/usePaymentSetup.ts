import { useStripe } from '@stripe/stripe-react-native';
import { useAction } from 'convex/react';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';

import { api } from '@convex/_generated/api';

import { errorMessage } from './format';

export function usePaymentSetup() {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const createSetupIntent = useAction(api.stripe.createSetupIntent);
  const syncPaymentMethod = useAction(api.stripe.syncPaymentMethod);
  const removePaymentMethod = useAction(api.stripe.removePaymentMethod);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addCard(): Promise<boolean> {
    setBusy(true);
    setError(null);
    try {
      const { setupIntentClientSecret, ephemeralKeySecret, customerId } = await createSetupIntent({});
      const init = await initPaymentSheet({
        merchantDisplayName: 'GiftVault',
        customerId,
        customerEphemeralKeySecret: ephemeralKeySecret,
        setupIntentClientSecret,
        returnURL: 'giftvault://stripe-redirect',
        applePay: { merchantCountryCode: 'US' },
        googlePay: { merchantCountryCode: 'US', testEnv: __DEV__ },
      });
      if (init.error) throw new Error(init.error.message);

      const result = await presentPaymentSheet();
      if (result.error) {
        if (result.error.code !== 'Canceled') setError(result.error.message);
        return false;
      }
      await syncPaymentMethod({});
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return true;
    } catch (e) {
      setError(errorMessage(e));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function removeCard() {
    setBusy(true);
    setError(null);
    try {
      await removePaymentMethod({});
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return { addCard, removeCard, busy, error };
}
