export const palette = {
  coral: '#FF7A59',
  magenta: '#E8466B',
  violet: '#8B5CF6',
  plum: '#1A1024',
  plumRaised: '#251733',
  plumElevated: '#2F1F40',
  cream: '#FFF7F3',
  white: '#FFFFFF',
  mint: '#22C55E',
  amber: '#F59E0B',
  red: '#EF4444',
} as const;

export const gradients = {
  hero: [palette.coral, palette.magenta, palette.violet] as const,
  soft: ['#FFE4DA', '#FBD3E0', '#E6DBFF'] as const,
  softDark: ['#3A1F33', '#3A1C3A', '#2B2048'] as const,
};

export type ColorTokens = {
  background: string;
  surface: string;
  surfaceElevated: string;
  border: string;
  text: string;
  textMuted: string;
  textOnAccent: string;
  accent: string;
  accentSoft: string;
  success: string;
  warning: string;
  danger: string;
  skeleton: string;
  skeletonHighlight: string;
  shadow: string;
};

export const lightColors: ColorTokens = {
  background: palette.cream,
  surface: palette.white,
  surfaceElevated: '#FFFDFB',
  border: '#F1E4DE',
  text: '#24131F',
  textMuted: '#7A6670',
  textOnAccent: palette.white,
  accent: palette.magenta,
  accentSoft: '#FDE3EA',
  success: '#16A34A',
  warning: '#B45309',
  danger: '#DC2626',
  skeleton: '#F3E8E3',
  skeletonHighlight: '#FFFFFF',
  shadow: '#8A3B52',
};

export const darkColors: ColorTokens = {
  background: palette.plum,
  surface: palette.plumRaised,
  surfaceElevated: palette.plumElevated,
  border: '#3B2A4C',
  text: '#FBF1F6',
  textMuted: '#B9A6C2',
  textOnAccent: palette.white,
  accent: '#FF6F91',
  accentSoft: '#45223A',
  success: palette.mint,
  warning: palette.amber,
  danger: '#F87171',
  skeleton: '#2D1E3B',
  skeletonHighlight: '#3D2A4F',
  shadow: '#000000',
};
