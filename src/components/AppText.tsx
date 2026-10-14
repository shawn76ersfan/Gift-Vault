import { Text, type TextProps } from 'react-native';

import { typography, useTheme, type TypographyVariant } from '@/theme';

type Props = TextProps & {
  variant?: TypographyVariant;
  color?: string;
  muted?: boolean;
  center?: boolean;
};

export function AppText({ variant = 'body', color, muted, center, style, ...rest }: Props) {
  const { colors } = useTheme();
  return (
    <Text
      style={[
        typography[variant],
        { color: color ?? (muted ? colors.textMuted : colors.text) },
        center && { textAlign: 'center' },
        style,
      ]}
      {...rest}
    />
  );
}
