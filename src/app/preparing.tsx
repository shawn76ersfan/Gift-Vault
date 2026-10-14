import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Gift } from 'lucide-react-native';

import { AppText } from '@/components/AppText';
import { gradients, palette, radius, spacing, useTheme } from '@/theme';

export default function PreparingScreen() {
  const { colors } = useTheme();
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [pulse]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: 1 + pulse.value * 0.08 }] }));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.View style={[styles.logo, style]}>
        <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fill}>
          <Gift size={40} color={palette.white} />
        </LinearGradient>
      </Animated.View>
      <AppText muted>Opening your vault…</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  logo: { width: 88, height: 88 },
  fill: { flex: 1, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center' },
});
