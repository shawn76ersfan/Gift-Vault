import { useMutation, useQuery } from 'convex/react';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { ModalHeader } from '@/components/ModalHeader';
import { Screen } from '@/components/Screen';
import { Skeleton } from '@/components/Skeleton';
import { TextField } from '@/components/TextField';
import { errorMessage } from '@/lib/format';
import { spacing, staggerMs, useTheme } from '@/theme';

const RELATIONSHIPS = ['Partner', 'Mom', 'Dad', 'Sibling', 'Friend', 'Kid', 'Grandparent', 'Coworker'];

export default function PersonFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const recipientId = id as Id<'recipients'> | undefined;
  const existing = useQuery(api.recipients.get, recipientId ? { recipientId } : 'skip');

  if (recipientId && existing === undefined) {
    return (
      <Screen tabBarPadding={false}>
        <ModalHeader title="Edit person" />
        <Skeleton height={56} />
        <Skeleton height={56} />
      </Screen>
    );
  }
  if (recipientId && existing === null) {
    return (
      <Screen tabBarPadding={false}>
        <ModalHeader title="Edit person" />
        <AppText muted>This person no longer exists.</AppText>
      </Screen>
    );
  }
  return <PersonForm recipientId={recipientId} initial={existing ?? undefined} />;
}

type Initial = { name: string; email?: string; phone?: string; relationship?: string; notes?: string };

function PersonForm({ recipientId, initial }: { recipientId?: Id<'recipients'>; initial?: Initial }) {
  const { colors } = useTheme();
  const create = useMutation(api.recipients.create);
  const update = useMutation(api.recipients.update);

  const [name, setName] = useState(initial?.name ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [relationship, setRelationship] = useState(initial?.relationship ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setError(null);
    const fields = { name, email, phone, relationship, notes };
    try {
      if (recipientId) {
        await update({ recipientId, ...fields });
        router.back();
      } else {
        const newId = await create(fields);
        router.back();
        router.push({ pathname: '/person/[id]', params: { id: newId } });
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const fieldsList = [
    <TextField key="name" label="Name" placeholder="Jordan Smith" value={name} onChangeText={setName} autoFocus={!recipientId} />,
    <TextField
      key="email"
      label="Email (where their gift card is sent)"
      placeholder="jordan@example.com"
      keyboardType="email-address"
      autoCapitalize="none"
      value={email}
      onChangeText={setEmail}
    />,
    <TextField key="phone" label="Phone (optional)" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />,
    <View key="rel" style={styles.group}>
      <AppText variant="caption" muted>
        Relationship
      </AppText>
      <View style={styles.chips}>
        {RELATIONSHIPS.map((r) => (
          <Chip key={r} label={r} selected={relationship === r} onPress={() => setRelationship(relationship === r ? '' : r)} />
        ))}
      </View>
    </View>,
    <TextField
      key="notes"
      label="Gift notes (optional)"
      placeholder="Loves coffee, hiking, and sci-fi novels"
      multiline
      value={notes}
      onChangeText={setNotes}
      style={styles.notes}
    />,
  ];

  return (
    <Screen tabBarPadding={false}>
      <ModalHeader title={recipientId ? 'Edit person' : 'Add a person'} subtitle="Tell us who you're celebrating" />
      {fieldsList.map((field, i) => (
        <Animated.View key={i} entering={FadeInDown.delay(i * staggerMs).springify().damping(16)}>
          {field}
        </Animated.View>
      ))}
      {error ? (
        <AppText color={colors.danger} accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
      <Button
        label={recipientId ? 'Save changes' : 'Add person'}
        loading={busy}
        disabled={name.trim().length === 0}
        onPress={() => void save().catch((e: unknown) => Alert.alert('Error', errorMessage(e)))}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  notes: { minHeight: 80, textAlignVertical: 'top' },
});
