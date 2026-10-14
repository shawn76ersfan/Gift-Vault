import { StyleSheet } from 'react-native';

import { minTapTarget, palette, radius, spacing, useTheme } from '@/theme';

import { AnimatedPressable } from './AnimatedPressable';
import { AppText } from './AppText';

type Props = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  tone?: 'default' | 'accent' | 'success' | 'warning' | 'danger';
};

export function Chip({ label, selected, onPress, tone = 'default' }: Props) {
  const { colors } = useTheme();
  const toneColor = {
    default: colors.textMuted,
    accent: colors.accent,
    success: colors.success,
    warning: colors.warning,
    danger: colors.danger,
  }[tone];

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={!onPress}
      haptic={onPress ? 'light' : 'none'}
      accessibilityState={{ selected }}
      style={[
        styles.chip,
        onPress && { minHeight: minTapTarget - 8 },
        selected
          ? { backgroundColor: colors.accent, borderColor: colors.accent }
          : { backgroundColor: colors.surface, borderColor: colors.border },
      ]}>
      <AppText variant="caption" color={selected ? palette.white : toneColor}>
        {label}
      </AppText>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs + 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignSelf: 'flex-start',
    justifyContent: 'center',
  },
});
