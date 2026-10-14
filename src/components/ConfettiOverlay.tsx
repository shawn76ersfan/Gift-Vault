import * as Haptics from 'expo-haptics';
import { Gift } from 'lucide-react-native';
import { useEffect, useMemo } from 'react';
import { Modal, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';

import { LinearGradient } from 'expo-linear-gradient';

import { gradients, palette, radius, spacing, springs, useTheme } from '@/theme';

import { AnimatedPressable } from './AnimatedPressable';
import { AppText } from './AppText';

const COLORS = [palette.coral, palette.magenta, palette.violet, palette.amber, palette.mint, '#60A5FA'];
const PIECES = 36;

type Piece = { x: number; delay: number; color: string; size: number; spin: number; drift: number };

function ConfettiPiece({ piece, height }: { piece: Piece; height: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(piece.delay, withTiming(1, { duration: 2600, easing: Easing.out(Easing.quad) }));
  }, [piece.delay, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: 1 - progress.value * 0.8,
    transform: [
      { translateY: -40 + progress.value * (height + 80) },
      { translateX: Math.sin(progress.value * Math.PI * 3) * piece.drift },
      { rotate: `${progress.value * piece.spin}deg` },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.piece,
        { left: piece.x, width: piece.size, height: piece.size * 1.6, backgroundColor: piece.color },
        style,
      ]}
    />
  );
}

type Props = {
  visible: boolean;
  title: string;
  subtitle?: string;
  onDone: () => void;
};

export function ConfettiOverlay({ visible, title, subtitle, onDone }: Props) {
  const { width, height } = useWindowDimensions();
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const lid = useSharedValue(0);

  const pieces = useMemo<Piece[]>(
    () =>
      Array.from({ length: PIECES }, (_, i) => ({
        x: Math.random() * width,
        delay: Math.random() * 500,
        color: COLORS[i % COLORS.length] ?? palette.coral,
        size: 6 + Math.random() * 6,
        spin: 360 + Math.random() * 720,
        drift: 10 + Math.random() * 30,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visible, width],
  );

  useEffect(() => {
    if (!visible) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    lid.value = 0;
    lid.value = withDelay(300, withSequence(withSpring(1, springs.bouncy), withTiming(1, { duration: 400 })));
  }, [visible, lid]);

  const lidStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -lid.value * 26 }, { rotate: `${-lid.value * 18}deg` }],
  }));

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onDone} statusBarTranslucent>
      <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut} style={styles.backdrop}>
        {!reduceMotion && pieces.map((p, i) => <ConfettiPiece key={i} piece={p} height={height} />)}

        <Animated.View entering={ZoomIn.springify().damping(12)} style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.giftWrap}>
            <Animated.View style={[styles.lid, lidStyle]}>
              <LinearGradient colors={gradients.hero} style={styles.lidFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
            </Animated.View>
            <LinearGradient colors={gradients.hero} style={styles.box} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Gift color={palette.white} size={40} />
            </LinearGradient>
          </View>
          <AppText variant="title" center>
            {title}
          </AppText>
          {subtitle ? (
            <AppText muted center>
              {subtitle}
            </AppText>
          ) : null}
          <AnimatedPressable onPress={onDone} style={styles.button}>
            <AppText variant="bodyStrong" color={palette.white}>
              Yay!
            </AppText>
          </AnimatedPressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(20,8,24,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  piece: { position: 'absolute', top: 0, borderRadius: 2 },
  card: {
    width: '82%',
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  giftWrap: { alignItems: 'center', marginBottom: spacing.sm, marginTop: spacing.md },
  lid: { width: 112, height: 22, zIndex: 1 },
  lidFill: { flex: 1, borderRadius: 8 },
  box: {
    width: 96,
    height: 80,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    marginTop: -2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    marginTop: spacing.sm,
    backgroundColor: palette.magenta,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    minHeight: 44,
    justifyContent: 'center',
  },
});
