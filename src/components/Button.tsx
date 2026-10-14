import { LinearGradient } from 'expo-linear-gradient';
import type { LucideIcon } from 'lucide-react-native';
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { gradients, minTapTarget, palette, radius, spacing, useTheme } from '@/theme';

import { AnimatedPressable } from './AnimatedPressable';
import { AppText } from './AppText';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: LucideIcon;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({ label, onPress, variant = 'primary', icon: Icon, loading, disabled, style }: Props) {
  const { colors } = useTheme();
  const isPrimary = variant === 'primary';
  const textColor =
    isPrimary ? palette.white : variant === 'danger' ? colors.danger : variant === 'ghost' ? colors.accent : colors.text;

  const content = (
    <View style={styles.row}>
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <>
          {Icon ? <Icon size={18} color={textColor} /> : null}
          <AppText variant="bodyStrong" color={textColor}>
            {label}
          </AppText>
        </>
      )}
    </View>
  );

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled || loading}
      haptic={isPrimary ? 'medium' : 'light'}
      accessibilityLabel={label}
      style={[
        styles.base,
        variant === 'secondary' && { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
        variant === 'danger' && { backgroundColor: colors.accentSoft },
        style,
      ]}>
      {isPrimary ? (
        <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fill}>
          {content}
        </LinearGradient>
      ) : (
        <View style={styles.fill}>{content}</View>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.pill, overflow: 'hidden', minHeight: minTapTarget + 8 },
  fill: { flex: 1, paddingHorizontal: spacing.xl, justifyContent: 'center', minHeight: minTapTarget + 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
});
