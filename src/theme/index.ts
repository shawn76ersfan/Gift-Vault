import { useColorScheme } from 'react-native';

import { darkColors, gradients, lightColors, type ColorTokens } from './colors';

export * from './colors';
export * from './motion';
export * from './spacing';
export * from './typography';

export type Theme = {
  dark: boolean;
  colors: ColorTokens;
  softGradient: readonly [string, string, string];
};

export function useTheme(): Theme {
  const dark = useColorScheme() === 'dark';
  return {
    dark,
    colors: dark ? darkColors : lightColors,
    softGradient: dark ? gradients.softDark : gradients.soft,
  };
}
