import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';

import { palette } from '@/theme';

import { AppText } from './AppText';

const GRADIENTS: readonly (readonly [string, string])[] = [
  [palette.coral, palette.magenta],
  [palette.magenta, palette.violet],
  [palette.violet, '#60A5FA'],
  ['#F59E0B', palette.coral],
  ['#22C55E', '#14B8A6'],
];

function hash(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function Avatar({ name, size = 48 }: { name: string; size?: number }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
  const colors = GRADIENTS[hash(name) % GRADIENTS.length] ?? GRADIENTS[0]!;

  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <AppText variant="subheading" color={palette.white} style={{ fontSize: size * 0.36 }}>
        {initials || '?'}
      </AppText>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: 'center', justifyContent: 'center' },
});
