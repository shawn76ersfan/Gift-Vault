import { useMutation, useQuery } from 'convex/react';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Plus, Search, Users } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';

import { api } from '@convex/_generated/api';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { EmptyState } from '@/components/EmptyState';
import { RecipientRow } from '@/components/RecipientRow';
import { Screen } from '@/components/Screen';
import { SkeletonList } from '@/components/Skeleton';
import { errorMessage } from '@/lib/format';
import { fonts, gradients, minTapTarget, palette, radius, spacing, staggerMs, useTheme } from '@/theme';

export default function PeopleScreen() {
  const { colors } = useTheme();
  const recipients = useQuery(api.recipients.list);
  const remove = useMutation(api.recipients.remove);
  const [search, setSearch] = useState('');

  const filtered = recipients?.filter((r) => r.name.toLowerCase().includes(search.trim().toLowerCase()));

  const addButton = (
    <AnimatedPressable onPress={() => router.push('/person-form')} accessibilityLabel="Add person" haptic="medium">
      <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.add}>
        <Plus size={22} color={palette.white} />
      </LinearGradient>
    </AnimatedPressable>
  );

  return (
    <Screen title="People" subtitle="The ones you never want to forget" right={addButton}>
      {recipients && recipients.length > 4 ? (
        <View style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Search size={18} color={colors.textMuted} />
          <TextInput
            placeholder="Search"
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            style={[styles.searchInput, { color: colors.text }]}
            accessibilityLabel="Search people"
          />
        </View>
      ) : null}

      {filtered === undefined ? (
        <SkeletonList rows={5} />
      ) : recipients?.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Who do you love?"
          message="Add family and friends so GiftVault can remember their special days for you."
          actionLabel="Add your first person"
          onAction={() => router.push('/person-form')}
        />
      ) : (
        <View style={styles.list}>
          {filtered.map((recipient, i) => (
            <Animated.View
              key={recipient._id}
              entering={FadeInDown.delay(Math.min(i, 10) * staggerMs).springify().damping(16)}
              exiting={FadeOut.duration(200)}
              layout={LinearTransition.springify().damping(18)}>
              <RecipientRow
                recipient={recipient}
                onDelete={(id) => remove({ recipientId: id }).catch((e: unknown) => Alert.alert('Could not remove', errorMessage(e)))}
              />
            </Animated.View>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  add: { width: minTapTarget + 4, height: minTapTarget + 4, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  list: { gap: spacing.sm },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: minTapTarget,
  },
  searchInput: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 15 },
});
