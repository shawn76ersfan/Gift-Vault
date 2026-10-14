import { useUser } from '@clerk/expo';
import { usePaginatedQuery, useQuery } from 'convex/react';
import { router } from 'expo-router';
import { CalendarPlus, CreditCard, Gift, PiggyBank, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { api } from '@convex/_generated/api';
import { AddFundsSheet } from '@/components/AddFundsSheet';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { AppText } from '@/components/AppText';
import { EmptyState } from '@/components/EmptyState';
import { GradientCard } from '@/components/GradientCard';
import { LedgerRow } from '@/components/LedgerRow';
import { OccasionCarousel } from '@/components/OccasionCarousel';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { Skeleton } from '@/components/Skeleton';
import { VaultHero } from '@/components/VaultHero';
import { monthStartMs, todayString } from '@/lib/format';
import { radius, spacing, staggerMs, useTheme } from '@/theme';

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function QuickAction({ icon: Icon, label, onPress, index }: { icon: typeof Gift; label: string; onPress: () => void; index: number }) {
  const { colors } = useTheme();
  return (
    <Animated.View entering={FadeInDown.delay(200 + index * staggerMs).springify()} style={styles.flex}>
      <AnimatedPressable
        onPress={onPress}
        accessibilityLabel={label}
        style={[styles.quick, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.quickIcon, { backgroundColor: colors.accentSoft }]}>
          <Icon size={20} color={colors.accent} />
        </View>
        <AppText variant="caption" center>
          {label}
        </AppText>
      </AnimatedPressable>
    </Animated.View>
  );
}

export default function VaultScreen() {
  const { user } = useUser();
  const [dates] = useState(() => ({ today: todayString(), monthStart: monthStartMs() }));
  const summary = useQuery(api.vault.summary, { monthStartMs: dates.monthStart });
  const upcoming = useQuery(api.occasions.upcoming, { today: dates.today, limit: 10 });
  const history = usePaginatedQuery(api.vault.history, {}, { initialNumItems: 5 });
  const [addFundsOpen, setAddFundsOpen] = useState(false);

  return (
    <Screen title={`${greeting()}${user?.firstName ? `, ${user.firstName}` : ''}`} subtitle="Here's your gifting at a glance">
      <Animated.View entering={FadeInDown.delay(80).springify().damping(16)}>
        {summary ? (
          <VaultHero
            balanceCents={summary.balanceCents}
            monthlyBudgetCents={summary.monthlyBudgetCents}
            spentThisMonthCents={summary.spentThisMonthCents}
            giftsSentThisMonth={summary.giftsSentThisMonth}
          />
        ) : (
          <Skeleton height={232} radius={radius.xl} />
        )}
      </Animated.View>

      <View style={styles.quickRow}>
        <QuickAction index={0} icon={PiggyBank} label="Add funds" onPress={() => setAddFundsOpen(true)} />
        <QuickAction index={1} icon={Plus} label="Add person" onPress={() => router.push('/person-form')} />
        <QuickAction index={2} icon={Gift} label="Gift history" onPress={() => router.push('/gifts')} />
      </View>

      {summary && !summary.hasPaymentMethod ? (
        <Animated.View entering={FadeInDown.delay(300)}>
          <AnimatedPressable onPress={() => router.push('/settings')}>
            <GradientCard variant="soft" style={styles.banner}>
              <CreditCard size={22} color="#8A3B52" />
              <View style={styles.flex}>
                <AppText variant="bodyStrong" color="#3B1730">
                  Add a card to turn on auto-gifting
                </AppText>
                <AppText variant="caption" color="#5B3A4C">
                  You&apos;re only charged when a gift is sent.
                </AppText>
              </View>
            </GradientCard>
          </AnimatedPressable>
        </Animated.View>
      ) : null}

      <View style={styles.section}>
        <SectionHeader title="Coming up" actionLabel="See all" onAction={() => router.push('/events')} />
        {upcoming === undefined ? (
          <View style={styles.quickRow}>
            <Skeleton width={220} height={130} radius={radius.lg} />
            <Skeleton width={120} height={130} radius={radius.lg} />
          </View>
        ) : upcoming.length === 0 ? (
          <EmptyState
            icon={CalendarPlus}
            title="No dates yet"
            message="Add someone you love and their birthday or anniversary to get started."
            actionLabel="Add a person"
            onAction={() => router.push('/person-form')}
          />
        ) : (
          <OccasionCarousel items={upcoming} />
        )}
      </View>

      <View style={styles.section}>
        <SectionHeader title="Recent activity" />
        <GradientCard>
          {history.status === 'LoadingFirstPage' ? (
            <View style={{ gap: spacing.sm }}>
              <Skeleton height={40} />
              <Skeleton height={40} />
            </View>
          ) : history.results.length === 0 ? (
            <AppText muted>Your vault activity will show up here.</AppText>
          ) : (
            history.results.map((entry, i) => (
              <Animated.View key={entry._id} entering={FadeInDown.delay(i * staggerMs)}>
                <LedgerRow entry={entry} />
              </Animated.View>
            ))
          )}
        </GradientCard>
      </View>

      <AddFundsSheet visible={addFundsOpen} onClose={() => setAddFundsOpen(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  section: { gap: spacing.sm },
  quickRow: { flexDirection: 'row', gap: spacing.sm },
  quick: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 88,
    justifyContent: 'center',
  },
  quickIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  banner: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
