import { useMutation, useQuery } from 'convex/react';
import { router, useLocalSearchParams } from 'expo-router';
import { AlertCircle, Gift } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';

import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import { AppText } from '@/components/AppText';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { ConfettiOverlay } from '@/components/ConfettiOverlay';
import { GiftProgress } from '@/components/GiftProgress';
import { GradientCard } from '@/components/GradientCard';
import { ModalHeader } from '@/components/ModalHeader';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { errorMessage, formatMoney, monthStartMs, parseDollarsToCents } from '@/lib/format';
import { spacing, staggerMs, useTheme } from '@/theme';

const AMOUNTS = [2500, 5000, 7500, 10000];

export default function SendGiftScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ recipientId: string; occasionId?: string }>();
  const recipientId = params.recipientId as Id<'recipients'>;
  const occasionId = params.occasionId as Id<'occasions'> | undefined;

  const recipient = useQuery(api.recipients.get, { recipientId });
  const [monthStart] = useState(monthStartMs);
  const summary = useQuery(api.vault.summary, { monthStartMs: monthStart });
  const sendNow = useMutation(api.gifts.sendNow);

  const [amount, setAmount] = useState('50');
  const [message, setMessage] = useState('');
  const [giftId, setGiftId] = useState<Id<'gifts'> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [celebrated, setCelebrated] = useState(false);
  const gift = useQuery(api.gifts.get, giftId ? { giftId } : 'skip');

  const cents = parseDollarsToCents(amount);
  const balance = summary?.balanceCents ?? 0;

  const send = async () => {
    if (!cents) {
      setError('Enter an amount');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      setGiftId(await sendNow({ recipientId, amountCents: cents, message: message || undefined, occasionId }));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const name = recipient?.name ?? '';

  if (giftId) {
    const failed = gift?.status === 'failed' || gift?.status === 'canceled';
    return (
      <Screen tabBarPadding={false}>
        <ModalHeader title={failed ? 'Gift not sent' : `Sending to ${name}`} />
        <Animated.View entering={ZoomIn.springify()} style={styles.center}>
          <Avatar name={name || '?'} size={88} />
          <AppText variant="display">{cents ? formatMoney(cents) : ''}</AppText>
        </Animated.View>
        {failed ? (
          <Animated.View entering={FadeIn}>
            <GradientCard style={styles.errorCard}>
              <AlertCircle size={22} color={colors.danger} />
              <AppText style={styles.flex}>{gift?.failureReason ?? 'This gift was canceled.'}</AppText>
            </GradientCard>
          </Animated.View>
        ) : (
          <GradientCard>
            <GiftProgress status={gift?.status ?? 'scheduled'} />
          </GradientCard>
        )}
        <Button label={gift?.status === 'sent' || failed ? 'Done' : 'Close (it will keep going)'} variant="secondary" onPress={() => router.back()} />
        <ConfettiOverlay
          visible={gift?.status === 'sent' && !celebrated}
          title="Gift delivered!"
          subtitle={`${name} just got a ${cents ? formatMoney(cents) : ''} gift card from you.`}
          onDone={() => {
            setCelebrated(true);
            router.back();
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen tabBarPadding={false}>
      <ModalHeader title="Send a gift" subtitle={name ? `To ${name}` : undefined} />

      <Animated.View entering={FadeInDown.springify().damping(16)} style={styles.center}>
        <Avatar name={name || '?'} size={72} />
        <AppText variant="caption" muted>
          {recipient?.email ? `Delivered by email to ${recipient.email}` : 'Add an email to this person first'}
        </AppText>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(staggerMs).springify().damping(16)} style={styles.group}>
        <AppText variant="caption" muted>
          Amount
        </AppText>
        <View style={styles.chips}>
          {AMOUNTS.map((a) => (
            <Chip key={a} label={formatMoney(a)} selected={cents === a} onPress={() => setAmount(String(a / 100))} />
          ))}
        </View>
        <TextField label="Custom amount (USD)" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(2 * staggerMs).springify().damping(16)}>
        <TextField
          label="Personal note (optional)"
          placeholder="Happy birthday! Treat yourself."
          multiline
          maxLength={280}
          value={message}
          onChangeText={setMessage}
          style={styles.message}
        />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(3 * staggerMs)}>
        <GradientCard variant="soft" style={styles.balance}>
          <Gift size={20} color="#8A3B52" />
          <AppText color="#3B1730" style={styles.flex}>
            Vault balance: {formatMoney(balance, { showCents: true })}
            {cents && cents > balance ? '. Add funds on the Vault tab first.' : ''}
          </AppText>
        </GradientCard>
      </Animated.View>

      {error ? <AppText color={colors.danger}>{error}</AppText> : null}

      <Button
        label={cents ? `Send ${formatMoney(cents)} gift card` : 'Send gift card'}
        icon={Gift}
        loading={busy}
        disabled={!recipient?.email || !cents}
        onPress={() => void send()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', gap: spacing.sm },
  group: { gap: spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  message: { minHeight: 80, textAlignVertical: 'top' },
  balance: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  errorCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
