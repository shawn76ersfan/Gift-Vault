import { LinearGradient } from 'expo-linear-gradient';
import { CalendarHeart, Gift, Sparkles, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { useOnboarding } from '@/lib/onboarding';
import { gradients, palette, radius, spacing, useTheme } from '@/theme';

type Slide = { icon: LucideIcon; title: string; body: string };

const SLIDES: Slide[] = [
  {
    icon: Gift,
    title: 'Your gifting vault',
    body: 'Set a budget once. GiftVault keeps it ready for every birthday, holiday, and anniversary.',
  },
  {
    icon: CalendarHeart,
    title: 'Never miss a moment',
    body: 'Add the people you love and their special dates. We remind you, or handle it for you.',
  },
  {
    icon: Sparkles,
    title: 'Gifts that arrive on time',
    body: 'Digital gift cards land in their inbox right on the day. You get the credit.',
  },
];

function SlideIllustration({ icon: Icon, index, scrollX, width }: { icon: LucideIcon; index: number; scrollX: SharedValue<number>; width: number }) {
  const input = [(index - 1) * width, index * width, (index + 1) * width];

  const blobStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(scrollX.value, input, [0.6, 1, 0.6], Extrapolation.CLAMP) },
      { rotate: `${interpolate(scrollX.value, input, [-30, 0, 30], Extrapolation.CLAMP)}deg` },
    ],
    opacity: interpolate(scrollX.value, input, [0, 1, 0], Extrapolation.CLAMP),
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(scrollX.value, input, [60, 0, -60], Extrapolation.CLAMP) },
      { scale: interpolate(scrollX.value, input, [0.4, 1, 0.4], Extrapolation.CLAMP) },
    ],
  }));

  return (
    <View style={styles.illustration}>
      <Animated.View style={[styles.blob, blobStyle]}>
        <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.blobFill} />
      </Animated.View>
      <Animated.View style={iconStyle}>
        <Icon size={88} color={palette.white} strokeWidth={1.6} />
      </Animated.View>
    </View>
  );
}

function SlideText({ slide, index, scrollX, width }: { slide: Slide; index: number; scrollX: SharedValue<number>; width: number }) {
  const input = [(index - 1) * width, index * width, (index + 1) * width];
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(scrollX.value, input, [0, 1, 0], Extrapolation.CLAMP),
    transform: [{ translateX: interpolate(scrollX.value, input, [width * 0.3, 0, -width * 0.3], Extrapolation.CLAMP) }],
  }));

  return (
    <Animated.View style={[styles.text, style]}>
      <AppText variant="display" center>
        {slide.title}
      </AppText>
      <AppText muted center style={styles.body}>
        {slide.body}
      </AppText>
    </Animated.View>
  );
}

function Dot({ index, scrollX, width }: { index: number; scrollX: SharedValue<number>; width: number }) {
  const { colors } = useTheme();
  const input = [(index - 1) * width, index * width, (index + 1) * width];
  const style = useAnimatedStyle(() => ({
    width: interpolate(scrollX.value, input, [8, 28, 8], Extrapolation.CLAMP),
    opacity: interpolate(scrollX.value, input, [0.35, 1, 0.35], Extrapolation.CLAMP),
  }));
  return <Animated.View style={[styles.dot, { backgroundColor: colors.accent }, style]} />;
}

export default function OnboardingScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { complete } = useOnboarding();
  const scrollX = useSharedValue(0);
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const [page, setPage] = useState(0);

  const onScroll = useAnimatedScrollHandler((e) => {
    scrollX.value = e.contentOffset.x;
  });

  const isLast = page === SLIDES.length - 1;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom + spacing.lg }]}>
      <View style={styles.skipRow}>
        {!isLast ? <Button label="Skip" variant="ghost" onPress={complete} /> : <View style={{ height: 52 }} />}
      </View>

      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}>
        {SLIDES.map((slide, i) => (
          <View key={slide.title} style={[styles.slide, { width }]}>
            <SlideIllustration icon={slide.icon} index={i} scrollX={scrollX} width={width} />
            <SlideText slide={slide} index={i} scrollX={scrollX} width={width} />
          </View>
        ))}
      </Animated.ScrollView>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((s, i) => (
            <Dot key={s.title} index={i} scrollX={scrollX} width={width} />
          ))}
        </View>
        <Button
          label={isLast ? 'Get started' : 'Next'}
          onPress={() => {
            if (isLast) {
              complete();
              return;
            }
            scrollRef.current?.scrollTo({ x: (page + 1) * width, animated: true });
            setPage(page + 1);
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  skipRow: { alignItems: 'flex-end', paddingHorizontal: spacing.md },
  slide: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl, gap: spacing.xxl },
  illustration: { width: 240, height: 240, alignItems: 'center', justifyContent: 'center' },
  blob: { position: 'absolute', width: 220, height: 220 },
  blobFill: { flex: 1, borderRadius: radius.xl * 3, transform: [{ rotate: '12deg' }] },
  text: { gap: spacing.sm, alignItems: 'center' },
  body: { maxWidth: 320 },
  footer: { paddingHorizontal: spacing.xl, gap: spacing.xl },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xs },
  dot: { height: 8, borderRadius: 4 },
});
