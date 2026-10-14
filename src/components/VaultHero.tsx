import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { formatMoney } from '@/lib/format';
import { gradients, palette, radius, spacing, springs } from '@/theme';

import { AppText } from './AppText';
import { ProgressRing } from './ProgressRing';
import { RollingNumber } from './RollingNumber';

function GiftBox() {
  const reduceMotion = useReducedMotion();
  const lid = useSharedValue(reduceMotion ? 1 : 0);
  const sparkle = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    lid.value = withDelay(350, withSpring(1, springs.bouncy));
    sparkle.value = withDelay(
      900,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
      ),
    );
  }, [lid, sparkle, reduceMotion]);

  const lidStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -lid.value * 14 }, { translateX: lid.value * 6 }, { rotate: `${lid.value * 14}deg` }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: lid.value * (0.5 + sparkle.value * 0.5),
    transform: [{ scale: 0.6 + lid.value * 0.4 + sparkle.value * 0.1 }],
  }));

  return (
    <View style={styles.giftBox} accessible={false}>
      <Animated.View style={[styles.glow, glowStyle]} />
      <Animated.View style={[styles.lid, lidStyle]}>
        <View style={styles.ribbonV} />
      </Animated.View>
      <View style={styles.box}>
        <View style={styles.ribbonV} />
      </View>
    </View>
  );
}

type Props = {
  balanceCents: number;
  monthlyBudgetCents: number;
  spentThisMonthCents: number;
  giftsSentThisMonth: number;
};

export function VaultHero({ balanceCents, monthlyBudgetCents, spentThisMonthCents, giftsSentThisMonth }: Props) {
  const progress = monthlyBudgetCents > 0 ? spentThisMonthCents / monthlyBudgetCents : 0;

  return (
    <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
      <View style={styles.bubbleA} />
      <View style={styles.bubbleB} />

      <View style={styles.top}>
        <View style={styles.flex}>
          <AppText variant="overline" color="rgba(255,255,255,0.85)">
            Vault balance
          </AppText>
          <RollingNumber cents={balanceCents} color={palette.white} />
          <AppText variant="caption" color="rgba(255,255,255,0.85)">
            Ready for your next gifts
          </AppText>
        </View>
        <GiftBox />
      </View>

      <View style={styles.bottom}>
        <ProgressRing progress={progress} size={72} strokeWidth={8}>
          <AppText variant="caption" color={palette.white}>
            {Math.round(Math.min(progress, 9.99) * 100)}%
          </AppText>
        </ProgressRing>
        <View style={styles.flex}>
          <AppText variant="bodyStrong" color={palette.white}>
            {formatMoney(spentThisMonthCents)} of {formatMoney(monthlyBudgetCents)} this month
          </AppText>
          <AppText variant="caption" color="rgba(255,255,255,0.85)">
            {giftsSentThisMonth === 0
              ? 'No gifts sent yet this month'
              : `${giftsSentThisMonth} gift${giftsSentThisMonth === 1 ? '' : 's'} delivered this month`}
          </AppText>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.xl, padding: spacing.xl, gap: spacing.xl, overflow: 'hidden' },
  flex: { flex: 1, gap: spacing.xxs },
  top: { flexDirection: 'row', alignItems: 'center' },
  bottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: radius.lg,
    padding: spacing.sm,
  },
  bubbleA: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.10)',
    top: -80,
    right: -60,
  },
  bubbleB: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.08)',
    bottom: -50,
    left: -30,
  },
  giftBox: { width: 86, height: 86, alignItems: 'center', justifyContent: 'flex-end' },
  glow: {
    position: 'absolute',
    top: 0,
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,240,200,0.55)',
  },
  lid: {
    width: 76,
    height: 18,
    borderRadius: 6,
    backgroundColor: palette.white,
    alignItems: 'center',
    zIndex: 1,
  },
  box: {
    width: 64,
    height: 48,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
  },
  ribbonV: { width: 12, height: '100%', backgroundColor: palette.magenta, opacity: 0.85 },
});
