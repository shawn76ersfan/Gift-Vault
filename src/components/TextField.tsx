import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { durations, fonts, minTapTarget, radius, spacing, useTheme } from '@/theme';

import { AppText } from './AppText';

type Props = TextInputProps & {
  label: string;
  error?: string;
};

export function TextField({ label, error, style, onFocus, onBlur, ...rest }: Props) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);

  const borderStyle = useAnimatedStyle(() => ({
    borderColor: withTiming(error ? colors.danger : focused ? colors.accent : colors.border, {
      duration: durations.fast,
    }),
    transform: [{ scale: withTiming(focused ? 1.01 : 1, { duration: durations.fast }) }],
  }));

  return (
    <View style={styles.container}>
      <AppText variant="caption" muted>
        {label}
      </AppText>
      <Animated.View style={[styles.field, { backgroundColor: colors.surface }, borderStyle]}>
        <TextInput
          placeholderTextColor={colors.textMuted}
          style={[styles.input, { color: colors.text }, style]}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />
      </Animated.View>
      {error ? (
        <AppText variant="caption" color={colors.danger}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xxs + 2 },
  field: { borderWidth: 1.5, borderRadius: radius.md, minHeight: minTapTarget + 8, justifyContent: 'center' },
  input: { fontFamily: fonts.bodyMedium, fontSize: 16, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
});
