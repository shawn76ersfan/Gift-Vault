import type { LucideIcon } from 'lucide-react-native';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { radius, spacing, useTheme } from '@/theme';

import { AppText } from './AppText';
import { Button } from './Button';

type Props = {
  icon: LucideIcon;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ icon: Icon, title, message, actionLabel, onAction }: Props) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const float = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    float.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    );
  }, [float, reduceMotion]);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -8 * float.value }, { rotate: `${(float.value - 0.5) * 8}deg` }],
  }));

  return (
    <Animated.View entering={FadeInDown.duration(500)} style={styles.container}>
      <Animated.View style={[styles.iconBubble, { backgroundColor: colors.accentSoft }, floatStyle]}>
        <Icon size={36} color={colors.accent} />
      </Animated.View>
      <AppText variant="heading" center>
        {title}
      </AppText>
      <AppText muted center style={styles.message}>
        {message}
      </AppText>
      {actionLabel && onAction ? (
        <View style={styles.action}>
          <Button label={actionLabel} onPress={onAction} />
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: spacing.xxxl, paddingHorizontal: spacing.xl, gap: spacing.xs },
  iconBubble: {
    width: 88,
    height: 88,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  message: { maxWidth: 280 },
  action: { marginTop: spacing.lg, alignSelf: 'stretch' },
});
