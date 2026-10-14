import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { gradients, radius, spacing, useTheme } from '@/theme';

type Props = {
  children: ReactNode;
  variant?: 'hero' | 'soft' | 'plain';
  style?: StyleProp<ViewStyle>;
};

export function GradientCard({ children, variant = 'plain', style }: Props) {
  const { colors, softGradient, dark } = useTheme();

  const shadow = {
    shadowColor: colors.shadow,
    shadowOpacity: dark ? 0.4 : 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  };

  if (variant === 'plain') {
    return (
      <View
        style={[
          styles.card,
          shadow,
          { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth },
          style,
        ]}>
        {children}
      </View>
    );
  }

  return (
    <LinearGradient
      colors={variant === 'hero' ? gradients.hero : softGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, shadow, style]}>
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    overflow: 'hidden',
  },
});
