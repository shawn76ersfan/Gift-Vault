import { useMutation, useQuery } from 'convex/react';
import { router, useLocalSearchParams } from 'expo-router';
import { Trash2 } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';

import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { GradientCard } from '@/components/GradientCard';
import { ModalHeader } from '@/components/ModalHeader';
import { Screen } from '@/components/Screen';
import { Skeleton } from '@/components/Skeleton';
import { TextField } from '@/components/TextField';
import {
  errorMessage,
  formatMoney,
  formatMonthDay,
  MONTHS,
  OCCASION_TYPES,
  parseDollarsToCents,
  type OccasionType,
} from '@/lib/format';
import { palette, spacing, staggerMs, useTheme } from '@/theme';

const AMOUNTS = [2500, 5000, 7500, 10000];
const LEAD_DAYS = [0, 1, 3, 7, 14];
const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function Field({ label, children, index }: { label: string; children: ReactNode; index: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(index * staggerMs).springify().damping(16)} style={styles.group}>
      <AppText variant="caption" muted>
        {label}
      </AppText>
      {children}
    </Animated.View>
  );
}

export default function OccasionFormScreen() {
  const params = useLocalSearchParams<{ recipientId: string; occasionId?: string }>();
  const recipientId = params.recipientId as Id<'recipients'>;
  const occasionId = params.occasionId as Id<'occasions'> | undefined;

  const occasions = useQuery(api.occasions.listForRecipient, occasionId ? { recipientId } : 'skip');
  const existing = occasions?.find((o) => o._id === occasionId);

  if (occasionId && occasions === undefined) {
    return (
      <Screen tabBarPadding={false}>
        <ModalHeader title="Edit date" />
        <Skeleton height={56} />
        <Skeleton height={56} />
      </Screen>
    );
  }
  if (occasionId && !existing) {
    return (
      <Screen tabBarPadding={false}>
        <ModalHeader title="Edit date" />
        <AppText muted>This date no longer exists.</AppText>
      </Screen>
    );
  }
  return <OccasionForm recipientId={recipientId} occasionId={occasionId} initial={existing} />;
}

type Initial = {
  type: OccasionType;
  label?: string;
  month: number;
  day: number;
  amountCents: number;
  leadDays: number;
  autoSend: boolean;
};

function OccasionForm({
  recipientId,
  occasionId,
  initial,
}: {
  recipientId: Id<'recipients'>;
  occasionId?: Id<'occasions'>;
  initial?: Initial;
}) {
  const { colors } = useTheme();
  const recipient = useQuery(api.recipients.get, { recipientId });

  const create = useMutation(api.occasions.create);
  const update = useMutation(api.occasions.update);
  const remove = useMutation(api.occasions.remove);

  const [type, setType] = useState<OccasionType>(initial?.type ?? 'birthday');
  const [label, setLabel] = useState(initial?.label ?? '');
  const [month, setMonthRaw] = useState(() => initial?.month ?? new Date().getMonth() + 1);
  const [day, setDay] = useState(() => initial?.day ?? new Date().getDate());
  const [amount, setAmount] = useState(initial ? String(initial.amountCents / 100) : '50');
  const [leadDays, setLeadDays] = useState(initial?.leadDays ?? 3);
  const [autoSend, setAutoSend] = useState(initial?.autoSend ?? true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxDay = DAYS_IN_MONTH[month - 1] ?? 31;
  const setMonth = (next: number) => {
    setMonthRaw(next);
    setDay((d) => Math.min(d, DAYS_IN_MONTH[next - 1] ?? 31));
  };

  const amountCents = parseDollarsToCents(amount);
  const needsLabel = type === 'holiday' || type === 'custom';

  const save = async () => {
    if (!amountCents) {
      setError('Enter a gift amount');
      return;
    }
    setBusy(true);
    setError(null);
    const fields = { type, label: needsLabel ? label : undefined, month, day, amountCents, leadDays, autoSend };
    try {
      if (occasionId) await update({ occasionId, ...fields });
      else await create({ recipientId, ...fields });
      router.back();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = () => {
    if (!occasionId) return;
    Alert.alert('Delete this date?', 'Any scheduled gift for it will be canceled.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          remove({ occasionId })
            .then(() => router.back())
            .catch((e: unknown) => Alert.alert('Could not delete', errorMessage(e))),
      },
    ]);
  };

  const name = recipient?.name ?? 'them';

  return (
    <Screen tabBarPadding={false}>
      <ModalHeader title={occasionId ? 'Edit date' : 'Add a special date'} subtitle={`For ${name}`} />

      <Field label="Occasion" index={0}>
        <View style={styles.chips}>
          {OCCASION_TYPES.map((t) => (
            <Chip key={t.value} label={`${t.emoji} ${t.label}`} selected={type === t.value} onPress={() => setType(t.value)} />
          ))}
        </View>
      </Field>

      {needsLabel ? (
        <Animated.View entering={FadeInDown} layout={LinearTransition}>
          <TextField
            label="Name this occasion"
            placeholder={type === 'holiday' ? "Mother's Day" : 'Graduation'}
            value={label}
            onChangeText={setLabel}
          />
        </Animated.View>
      ) : null}

      <Field label="Month" index={1}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollChips}>
          {MONTHS.map((m, i) => (
            <Chip key={m} label={m.slice(0, 3)} selected={month === i + 1} onPress={() => setMonth(i + 1)} />
          ))}
        </ScrollView>
      </Field>

      <Field label="Day" index={2}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollChips}>
          {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => (
            <Chip key={d} label={String(d)} selected={day === d} onPress={() => setDay(d)} />
          ))}
        </ScrollView>
      </Field>

      <Field label="Gift card amount" index={3}>
        <View style={styles.chips}>
          {AMOUNTS.map((a) => (
            <Chip key={a} label={formatMoney(a)} selected={amountCents === a} onPress={() => setAmount(String(a / 100))} />
          ))}
        </View>
        <TextField label="Custom amount (USD, $5 to $500)" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} />
      </Field>

      <Field label="Schedule it this many days ahead (you can cancel until it sends)" index={4}>
        <View style={styles.chips}>
          {LEAD_DAYS.map((d) => (
            <Chip key={d} label={d === 0 ? 'Same day' : `${d} day${d === 1 ? '' : 's'}`} selected={leadDays === d} onPress={() => setLeadDays(d)} />
          ))}
        </View>
      </Field>

      <Animated.View entering={FadeInDown.delay(5 * staggerMs)} style={[styles.switchRow, { borderColor: colors.border }]}>
        <View style={styles.flex}>
          <AppText variant="bodyStrong">Send automatically</AppText>
          <AppText variant="caption" muted>
            Off means we&apos;ll only remind you.
          </AppText>
        </View>
        <Switch
          value={autoSend}
          onValueChange={setAutoSend}
          trackColor={{ true: colors.accent, false: colors.border }}
          thumbColor={palette.white}
          accessibilityLabel="Send automatically"
        />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(6 * staggerMs)} layout={LinearTransition}>
        <GradientCard variant="soft">
          <AppText variant="bodyStrong" color="#3B1730">
            {autoSend
              ? `Every ${formatMonthDay(month, day)}, ${name} gets a ${amountCents ? formatMoney(amountCents) : ''} gift card from you.`
              : `We'll remind you before ${name}'s ${formatMonthDay(month, day)} ${needsLabel && label ? label : OCCASION_TYPES.find((t) => t.value === type)?.label.toLowerCase()}.`}
          </AppText>
        </GradientCard>
      </Animated.View>

      {error ? <AppText color={colors.danger}>{error}</AppText> : null}

      <Button label={occasionId ? 'Save changes' : 'Save date'} loading={busy} onPress={() => void save()} />
      {occasionId ? <Button label="Delete date" variant="danger" icon={Trash2} onPress={confirmDelete} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  group: { gap: spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  scrollChips: { gap: spacing.xs, paddingRight: spacing.lg },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
