import { useMutation, usePaginatedQuery } from 'convex/react';
import { router } from 'expo-router';
import { ArrowLeft, Gift } from 'lucide-react-native';
import { Alert, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';

import { api } from '@convex/_generated/api';
import type { Doc } from '@convex/_generated/dataModel';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { AppText } from '@/components/AppText';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { SkeletonList } from '@/components/Skeleton';
import { errorMessage, formatMoney } from '@/lib/format';
import { minTapTarget, radius, spacing, staggerMs, useTheme } from '@/theme';

const STATUS: Record<Doc<'gifts'>['status'], { label: string; tone: 'default' | 'accent' | 'success' | 'warning' | 'danger' }> = {
  scheduled: { label: 'Scheduled', tone: 'accent' },
  charging: { label: 'Processing', tone: 'warning' },
  charged: { label: 'Processing', tone: 'warning' },
  sent: { label: 'Delivered', tone: 'success' },
  failed: { label: 'Failed', tone: 'danger' },
  canceled: { label: 'Canceled', tone: 'default' },
};

export default function GiftHistoryScreen() {
  const { colors } = useTheme();
  const { results, status, loadMore } = usePaginatedQuery(api.gifts.list, {}, { initialNumItems: 20 });
  const cancel = useMutation(api.gifts.cancel);

  const confirmCancel = (gift: Doc<'gifts'>, name: string) =>
    Alert.alert(`Cancel gift to ${name}?`, 'Nothing will be charged.', [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Cancel gift',
        style: 'destructive',
        onPress: () => cancel({ giftId: gift._id }).catch((e: unknown) => Alert.alert('Could not cancel', errorMessage(e))),
      },
    ]);

  return (
    <Screen tabBarPadding={false}>
      <View style={styles.header}>
        <AnimatedPressable
          onPress={() => router.back()}
          accessibilityLabel="Back"
          style={[styles.back, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <ArrowLeft size={20} color={colors.text} />
        </AnimatedPressable>
        <AppText variant="title">Gift history</AppText>
      </View>

      {status === 'LoadingFirstPage' ? (
        <SkeletonList rows={6} />
      ) : results.length === 0 ? (
        <EmptyState icon={Gift} title="No gifts yet" message="Scheduled and delivered gifts will appear here." />
      ) : (
        <View style={styles.list}>
          {results.map(({ gift, recipientName }, i) => {
            const s = STATUS[gift.status];
            return (
              <Animated.View
                key={gift._id}
                entering={FadeInDown.delay(Math.min(i, 10) * staggerMs).springify().damping(16)}
                layout={LinearTransition}>
                <AnimatedPressable
                  haptic="none"
                  onLongPress={gift.status === 'scheduled' ? () => confirmCancel(gift, recipientName) : undefined}
                  accessibilityHint={gift.status === 'scheduled' ? 'Long press to cancel' : undefined}
                  style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Avatar name={recipientName} size={44} />
                  <View style={styles.flex}>
                    <AppText variant="subheading">{recipientName}</AppText>
                    <AppText variant="caption" muted numberOfLines={2}>
                      {new Date(gift.sendDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      {gift.failureReason ? ` · ${gift.failureReason}` : ''}
                    </AppText>
                  </View>
                  <View style={styles.right}>
                    <AppText variant="bodyStrong">{formatMoney(gift.amountCents)}</AppText>
                    <Chip label={s.label} tone={s.tone} />
                  </View>
                </AnimatedPressable>
              </Animated.View>
            );
          })}
          {status === 'CanLoadMore' ? <Button label="Load more" variant="ghost" onPress={() => loadMore(20)} /> : null}
          {status === 'LoadingMore' ? <SkeletonList rows={2} /> : null}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  back: {
    width: minTapTarget,
    height: minTapTarget,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  list: { gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  right: { alignItems: 'flex-end', gap: spacing.xxs },
});
