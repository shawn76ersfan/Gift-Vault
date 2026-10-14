import { useQuery } from 'convex/react';
import { router } from 'expo-router';
import { CalendarHeart } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { api } from '@convex/_generated/api';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { AppText } from '@/components/AppText';
import { Avatar } from '@/components/Avatar';
import { Chip } from '@/components/Chip';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { SkeletonList } from '@/components/Skeleton';
import { formatCountdown, formatMoney, MONTHS, occasionEmoji, occasionTitle, todayString } from '@/lib/format';
import { radius, spacing, staggerMs, useTheme } from '@/theme';

export default function EventsScreen() {
  const { colors } = useTheme();
  const [today] = useState(todayString);
  const upcoming = useQuery(api.occasions.upcoming, { today, limit: 200 });

  const groups = new Map<string, NonNullable<typeof upcoming>>();
  for (const item of upcoming ?? []) {
    const [year, month] = item.nextDate.split('-');
    const key = `${MONTHS[Number(month) - 1]} ${year}`;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  let index = 0;

  return (
    <Screen title="Events" subtitle="Every celebration on your calendar">
      {upcoming === undefined ? (
        <SkeletonList rows={6} />
      ) : upcoming.length === 0 ? (
        <EmptyState
          icon={CalendarHeart}
          title="Your calendar is clear"
          message="Add birthdays, anniversaries, and holidays for the people you love."
          actionLabel="Add a person"
          onAction={() => router.push('/person-form')}
        />
      ) : (
        [...groups.entries()].map(([month, items]) => (
          <View key={month} style={styles.group}>
            <AppText variant="overline" muted>
              {month}
            </AppText>
            {items.map((item) => {
              const delay = Math.min(index++, 12) * staggerMs;
              const [, , day] = item.nextDate.split('-');
              return (
                <Animated.View key={item.occasion._id} entering={FadeInDown.delay(delay).springify().damping(16)}>
                  <AnimatedPressable
                    onPress={() => router.push({ pathname: '/person/[id]', params: { id: item.occasion.recipientId } })}
                    accessibilityLabel={`${item.recipientName}, ${occasionTitle(item.occasion)}`}
                    style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={[styles.date, { backgroundColor: colors.accentSoft }]}>
                      <AppText variant="heading" color={colors.accent}>
                        {Number(day)}
                      </AppText>
                    </View>
                    <Avatar name={item.recipientName} size={36} />
                    <View style={styles.flex}>
                      <AppText variant="subheading" numberOfLines={1}>
                        {occasionEmoji(item.occasion.type)} {item.recipientName}
                      </AppText>
                      <AppText variant="caption" muted numberOfLines={1}>
                        {occasionTitle(item.occasion)} · {formatMoney(item.occasion.amountCents)}
                        {item.occasion.autoSend ? ' · Auto' : ''}
                      </AppText>
                    </View>
                    <Chip label={formatCountdown(item.daysUntil)} tone={item.daysUntil <= 7 ? 'accent' : 'default'} />
                  </AnimatedPressable>
                </Animated.View>
              );
            })}
          </View>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  group: { gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  date: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
});
