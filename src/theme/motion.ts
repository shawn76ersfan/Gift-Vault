import type { WithSpringConfig } from 'react-native-reanimated';

export const durations = {
  fast: 150,
  base: 250,
  slow: 450,
  hero: 900,
} as const;

export const springs = {
  press: { damping: 15, stiffness: 400, mass: 0.6 },
  gentle: { damping: 18, stiffness: 180 },
  bouncy: { damping: 10, stiffness: 160 },
  snappy: { damping: 20, stiffness: 300 },
} satisfies Record<string, WithSpringConfig>;

export const pressScale = 0.96;

export const staggerMs = 60;
