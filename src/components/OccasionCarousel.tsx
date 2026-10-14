import type { FunctionReturnType } from 'convex/server';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import type { api } from '@convex/_generated/api';
import { formatCountdown, formatMoney, occasionEmoji, occasionTitle } from '@/lib/format';
import { radius, spacing, useTheme } from '@/theme';

import { AnimatedPressable } from './AnimatedPressable';
import { AppText } from './AppText';
import { Avatar } from './Avatar';
import { Chip } from './Chip';

type Item = FunctionReturnType<typeof api.occasions.upcoming>[number];

const CARD_WIDTH = 220;
const GAP = spacing.md;
const SNAP = CARD_WIDTH + GAP;

function OccasionCard({ item, index, scrollX }: { item: Item; index: number; scrollX: SharedValue<number> }) {
  const { colors } = useTheme();
  const input = [(index - 1) * SNAP, index * SNAP, (index + 1) * SNAP];

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(scrollX.value, input, [0.92, 1, 0.92], Extrapolation.CLAMP) },
      { translateY: interpolate(scrollX.value, input, [8, 0, 8], Extrapolation.CLAMP) },
    ],
    opacity: interpolate(scrollX.value, input, [0.7, 1, 0.7], Extrapolation.CLAMP),
  }));

  const emojiStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(scrollX.value, input, [-24, 0, 24], Extrapolation.CLAMP) },
      { rotate: `${interpolate(scrollX.value, input, [-15, 0, 15], Extrapolation.CLAMP)}deg` },
    ],
  }));

  const soon = item.daysUntil <= 7;

  return (
    <Animated.View style={[{ width: CARD_WIDTH }, cardStyle]}>
      <AnimatedPressable
        accessibilityLabel={`${item.recipientName}'s ${occasionTitle(item.occasion)}, ${formatCountdown(item.daysUntil)}`}
        onPress={() => router.push({ pathname: '/person/[id]', params: { id: item.occasion.recipientId } })}
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: colors.shadow }]}>
        <Animated.Text style={[styles.emoji, emojiStyle]}>{occasionEmoji(item.occasion.type)}</Animated.Text>
        <View style={styles.row}>
          <Avatar name={item.recipientName} size={36} />
          <View style={styles.flex}>
            <AppText variant="subheading" numberOfLines={1}>
              {item.recipientName}
            </AppText>
            <AppText variant="caption" muted numberOfLines={1}>
              {occasionTitle(item.occasion)}
            </AppText>
          </View>
        </View>
        <View style={styles.row}>
          <Chip label={formatCountdown(item.daysUntil)} tone={soon ? 'accent' : 'default'} />
          <AppText variant="bodyStrong">{formatMoney(item.occasion.amountCents)}</AppText>
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
}

export function OccasionCarousel({ items }: { items: Item[] }) {
  const scrollX = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollX.value = e.contentOffset.x;
  });

  return (
    <Animated.FlatList
      data={items}
      horizontal
      keyExtractor={(item) => item.occasion._id}
      showsHorizontalScrollIndicator={false}
      snapToInterval={SNAP}
      decelerationRate="fast"
      onScroll={onScroll}
      scrollEventThrottle={16}
      contentContainerStyle={styles.list}
      style={styles.bleed}
      ItemSeparatorComponent={() => <View style={{ width: GAP }} />}
      renderItem={({ item, index }) => <OccasionCard item={item} index={index} scrollX={scrollX} />}
    />
  );
}

const styles = StyleSheet.create({
  bleed: { marginHorizontal: -spacing.lg, overflow: 'visible' },
  list: { paddingHorizontal: spacing.lg, paddingVertical: spacing.xs },
  card: {
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    shadowOpacity: 0.1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
    overflow: 'hidden',
  },
  emoji: { position: 'absolute', right: -6, top: -10, fontSize: 56, opacity: 0.18 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  flex: { flex: 1 },
});
