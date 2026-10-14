import { Check, CreditCard, Gift, Send } from 'lucide-react-native';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import type { Doc } from '@convex/_generated/dataModel';
import { palette, radius, spacing, springs, useTheme } from '@/theme';

import { AppText } from './AppText';

const STEPS = [
  { key: 'charging', label: 'Charging your card', icon: CreditCard },
  { key: 'charged', label: 'Issuing the gift card', icon: Gift },
  { key: 'sent', label: 'Delivered to their inbox', icon: Send },
] as const;

function stepIndex(status: Doc<'gifts'>['status']): number {
  switch (status) {
    case 'scheduled':
    case 'charging':
      return 0;
    case 'charged':
      return 1;
    case 'sent':
      return 3;
    default:
      return -1;
  }
}

function StepDot({ state, icon: Icon }: { state: 'done' | 'active' | 'todo'; icon: typeof Gift }) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(0);
  const fill = useSharedValue(state === 'done' ? 1 : 0);

  useEffect(() => {
    fill.value = withSpring(state === 'done' ? 1 : 0, springs.bouncy);
    pulse.value = state === 'active' && !reduceMotion ? withRepeat(withTiming(1, { duration: 800 }), -1, true) : withTiming(0);
  }, [state, fill, pulse, reduceMotion]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * 0.25 }],
    opacity: 0.4 * (1 - pulse.value),
  }));
  const fillStyle = useAnimatedStyle(() => ({ transform: [{ scale: fill.value }] }));

  return (
    <View style={styles.dotWrap}>
      {state === 'active' ? <Animated.View style={[styles.ring, { backgroundColor: colors.accent }, ringStyle]} /> : null}
      <View style={[styles.dot, { backgroundColor: state === 'todo' ? colors.surface : colors.accentSoft, borderColor: colors.border }]}>
        <Icon size={18} color={state === 'todo' ? colors.textMuted : colors.accent} />
        <Animated.View style={[styles.dotFill, { backgroundColor: colors.accent }, fillStyle]}>
          <Check size={18} color={palette.white} strokeWidth={3} />
        </Animated.View>
      </View>
    </View>
  );
}

export function GiftProgress({ status }: { status: Doc<'gifts'>['status'] }) {
  const current = stepIndex(status);
  return (
    <View style={styles.list}>
      {STEPS.map((step, i) => {
        const state = current > i ? 'done' : current === i ? 'active' : 'todo';
        return (
          <View key={step.key} style={styles.row}>
            <StepDot state={state} icon={step.icon} />
            <AppText variant={state === 'active' ? 'bodyStrong' : 'body'} muted={state === 'todo'}>
              {step.label}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  dotWrap: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 44, height: 44, borderRadius: radius.pill },
  dot: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  dotFill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill },
});
