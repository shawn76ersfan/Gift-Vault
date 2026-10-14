import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Gift, Mail } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  FadeInUp,
  FadeOutUp,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimatedPressable } from '@/components/AnimatedPressable';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { useEmailCodeAuth } from '@/lib/useEmailCodeAuth';
import { gradients, palette, radius, spacing, useTheme } from '@/theme';

function FloatingGift() {
  const reduceMotion = useReducedMotion();
  const t = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    t.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    );
  }, [t, reduceMotion]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: -10 * t.value }, { rotate: `${-6 + t.value * 12}deg` }],
  }));

  return (
    <Animated.View style={[styles.logo, style]}>
      <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.logoFill}>
        <Gift size={44} color={palette.white} strokeWidth={1.8} />
      </LinearGradient>
    </Animated.View>
  );
}

export default function SignInScreen() {
  const { colors, softGradient } = useTheme();
  const insets = useSafeAreaInsets();
  const auth = useEmailCodeAuth();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');

  return (
    <LinearGradient colors={softGradient} style={styles.flex}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.flex, { paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom + spacing.xl }]}>
        <View style={styles.hero}>
          <FloatingGift />
          <Animated.View entering={FadeInDown.delay(150).duration(500)}>
            <AppText variant="display" center>
              GiftVault
            </AppText>
            <AppText muted center>
              The most thoughtful person you know. Automatically.
            </AppText>
          </Animated.View>
        </View>

        <Animated.View
          entering={FadeInUp.delay(250).springify().damping(16)}
          style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {auth.step === 'email' ? (
            <Animated.View key="email" entering={FadeInDown} exiting={FadeOutUp} style={styles.form}>
              <AppText variant="heading">Sign in or create an account</AppText>
              <TextField
                label="Email"
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
                value={email}
                onChangeText={setEmail}
                onSubmitEditing={() => void auth.submitEmail(email)}
                returnKeyType="send"
                error={auth.error ?? undefined}
              />
              <Button
                label="Email me a code"
                icon={Mail}
                loading={auth.busy}
                disabled={!auth.ready || email.length === 0}
                onPress={() => void auth.submitEmail(email)}
              />
            </Animated.View>
          ) : (
            <Animated.View key="code" entering={FadeInDown} exiting={FadeOutUp} style={styles.form}>
              <AnimatedPressable onPress={auth.reset} style={styles.back} accessibilityLabel="Use a different email">
                <ArrowLeft size={18} color={colors.textMuted} />
                <AppText variant="caption" muted>
                  {auth.email}
                </AppText>
              </AnimatedPressable>
              <AppText variant="heading">{auth.mode === 'signUp' ? 'Welcome! Check your email' : 'Welcome back'}</AppText>
              <AppText muted>We sent a 6-digit code to {auth.email}.</AppText>
              <TextField
                label="Verification code"
                placeholder="123456"
                keyboardType="number-pad"
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                maxLength={6}
                value={code}
                onChangeText={setCode}
                onSubmitEditing={() => void auth.submitCode(code)}
                error={auth.error ?? undefined}
                style={styles.code}
              />
              <Button label="Continue" loading={auth.busy} disabled={code.length < 6} onPress={() => void auth.submitCode(code)} />
              <Button label="Resend code" variant="ghost" onPress={() => void auth.resend()} />
            </Animated.View>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg, paddingHorizontal: spacing.xl },
  logo: { width: 96, height: 96 },
  logoFill: { flex: 1, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center' },
  sheet: {
    marginHorizontal: spacing.lg,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: StyleSheet.hairlineWidth,
  },
  form: { gap: spacing.md },
  back: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, alignSelf: 'flex-start', minHeight: 32 },
  code: { letterSpacing: 8, fontSize: 22, textAlign: 'center' },
});
