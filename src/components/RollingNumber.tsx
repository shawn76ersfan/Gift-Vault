import { useEffect } from 'react';
import { StyleSheet, TextInput, type TextStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { durations, typography, useTheme } from '@/theme';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

function formatCents(cents: number): string {
  'worklet';
  const negative = cents < 0;
  const abs = Math.round(Math.abs(cents));
  const dollars = Math.floor(abs / 100);
  const remainder = abs % 100;
  const grouped = dollars.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${negative ? '-' : ''}$${grouped}.${remainder < 10 ? '0' : ''}${remainder}`;
}

type Props = {
  cents: number;
  style?: TextStyle;
  color?: string;
};

export function RollingNumber({ cents, style, color }: Props) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const value = useSharedValue(0);

  useEffect(() => {
    value.value = reduceMotion
      ? cents
      : withTiming(cents, { duration: durations.hero * 1.4, easing: Easing.out(Easing.cubic) });
  }, [cents, reduceMotion, value]);

  const animatedProps = useAnimatedProps(() => {
    const text = formatCents(value.value);
    return { text, defaultValue: text } as object;
  });

  return (
    <AnimatedTextInput
      editable={false}
      underlineColorAndroid="transparent"
      accessibilityLabel={formatCents(cents)}
      animatedProps={animatedProps}
      defaultValue={formatCents(0)}
      style={[styles.base, typography.display, { color: color ?? colors.text }, style]}
    />
  );
}

export { formatCents };

const styles = StyleSheet.create({
  base: { padding: 0, margin: 0 },
});
