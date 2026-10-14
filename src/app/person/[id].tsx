import { useQuery } from 'convex/react';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, CalendarPlus, Gift, Mail, Pencil, Repeat, StickyNote } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition, ZoomIn } from 'react-native-reanimated';

import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { AppText } from '@/components/AppText';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { EmptyState } from '@/components/EmptyState';
import { GradientCard } from '@/components/GradientCard';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { Skeleton } from '@/components/Skeleton';
import { formatMoney, formatMonthDay, occasionEmoji, occasionTitle } from '@/lib/format';
import { minTapTarget, radius, spacing, staggerMs, useTheme } from '@/theme';

export default function PersonScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const recipientId = id as Id<'recipients'>;
  const recipient = useQuery(api.recipients.get, { recipientId });
  const occasions = useQuery(api.occasions.listForRecipient, recipient ? { recipientId } : 'skip');

  const topBar = (
    <View style={styles.topBar}>
      <AnimatedPressable
        onPress={() => router.back()}
        accessibilityLabel="Back"
        style={[styles.iconButton, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <ArrowLeft size={20} color={colors.text} />
      </AnimatedPressable>
      <AnimatedPressable
        onPress={() => router.push({ pathname: '/person-form', params: { id: recipientId } })}
        accessibilityLabel="Edit person"
        style={[styles.iconButton, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Pencil size={18} color={colors.text} />
      </AnimatedPressable>
    </View>
  );

  if (recipient === null) {
    return (
      <Screen tabBarPadding={false}>
        {topBar}
        <EmptyState icon={Gift} title="Person not found" message="They may have been removed." />
      </Screen>
    );
  }

  return (
    <Screen tabBarPadding={false}>
      {topBar}

      {recipient === undefined ? (
        <View style={styles.hero}>
          <Skeleton width={96} height={96} radius={48} />
          <Skeleton width={160} height={24} />
        </View>
      ) : (
        <View style={styles.hero}>
          <Animated.View entering={ZoomIn.springify().damping(12)}>
            <Avatar name={recipient.name} size={96} />
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(100)} style={styles.heroText}>
            <AppText variant="title" center>
              {recipient.name}
            </AppText>
            {recipient.relationship ? <Chip label={recipient.relationship} tone="accent" /> : null}
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(180)} style={styles.meta}>
            <Mail size={14} color={colors.textMuted} />
            <AppText variant="caption" muted>
              {recipient.email ?? 'No email yet. Add one to send gift cards.'}
            </AppText>
          </Animated.View>
        </View>
      )}

      <Animated.View entering={FadeInDown.delay(220)}>
        <Button
          label="Send a gift now"
          icon={Gift}
          onPress={() => router.push({ pathname: '/send-gift', params: { recipientId } })}
        />
      </Animated.View>

      {recipient?.notes ? (
        <Animated.View entering={FadeInDown.delay(260)}>
          <GradientCard variant="soft" style={styles.notes}>
            <StickyNote size={18} color="#8A3B52" />
            <AppText color="#3B1730" style={styles.flex}>
              {recipient.notes}
            </AppText>
          </GradientCard>
        </Animated.View>
      ) : null}

      <View style={styles.section}>
        <SectionHeader
          title="Special dates"
          actionLabel="Add date"
          onAction={() => router.push({ pathname: '/occasion-form', params: { recipientId } })}
        />
        {occasions === undefined ? (
          <Skeleton height={76} radius={radius.lg} />
        ) : occasions.length === 0 ? (
          <EmptyState
            icon={CalendarPlus}
            title="No dates yet"
            message="Add a birthday or anniversary and we'll take care of the rest."
            actionLabel="Add a date"
            onAction={() => router.push({ pathname: '/occasion-form', params: { recipientId } })}
          />
        ) : (
          occasions.map((occasion, i) => (
            <Animated.View key={occasion._id} entering={FadeInDown.delay(i * staggerMs).springify()} layout={LinearTransition}>
              <AnimatedPressable
                onPress={() =>
                  router.push({ pathname: '/occasion-form', params: { recipientId, occasionId: occasion._id } })
                }
                accessibilityLabel={`Edit ${occasionTitle(occasion)}`}
                style={[styles.occasion, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={[styles.emojiBubble, { backgroundColor: colors.accentSoft }]}>
                  <AppText style={styles.emoji}>{occasionEmoji(occasion.type)}</AppText>
                </View>
                <View style={styles.flex}>
                  <AppText variant="subheading">{occasionTitle(occasion)}</AppText>
                  <AppText variant="caption" muted>
                    {formatMonthDay(occasion.month, occasion.day)} · {formatMoney(occasion.amountCents)}
                  </AppText>
                </View>
                {occasion.autoSend ? (
                  <View style={styles.auto}>
                    <Repeat size={14} color={colors.success} />
                    <AppText variant="caption" color={colors.success}>
                      Auto
                    </AppText>
                  </View>
                ) : (
                  <AppText variant="caption" muted>
                    Reminder
                  </AppText>
                )}
              </AnimatedPressable>
            </Animated.View>
          ))
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between' },
  iconButton: {
    width: minTapTarget,
    height: minTapTarget,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  hero: { alignItems: 'center', gap: spacing.sm },
  heroText: { alignItems: 'center', gap: spacing.xs },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  notes: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  section: { gap: spacing.sm },
  occasion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  emojiBubble: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 24, lineHeight: 30 },
  auto: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
