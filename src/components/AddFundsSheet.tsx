import { useMutation } from 'convex/react';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '@convex/_generated/api';
import { errorMessage, formatMoney, parseDollarsToCents } from '@/lib/format';
import { radius, spacing, useTheme } from '@/theme';

import { AppText } from './AppText';
import { Button } from './Button';
import { Chip } from './Chip';
import { TextField } from './TextField';

const PRESETS = [2500, 5000, 10000, 25000];

export function AddFundsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const addFunds = useMutation(api.vault.addFunds);
  const [amount, setAmount] = useState('50');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cents = parseDollarsToCents(amount);

  const submit = async () => {
    if (!cents) {
      setError('Enter an amount');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await addFunds({ amountCents: cents });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View entering={FadeIn} style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Animated.View
            entering={SlideInDown.springify().damping(18)}
            style={[styles.sheet, { backgroundColor: colors.surface, paddingBottom: insets.bottom + spacing.lg }]}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <AppText variant="heading">Add to your gift budget</AppText>
            <AppText muted>
              This sets aside budget in your vault. Your card is only charged when a gift is actually sent.
            </AppText>
            <View style={styles.presets}>
              {PRESETS.map((p) => (
                <Chip key={p} label={formatMoney(p)} selected={cents === p} onPress={() => setAmount(String(p / 100))} />
              ))}
            </View>
            <TextField label="Amount (USD)" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} error={error ?? undefined} />
            <Button label={cents ? `Add ${formatMoney(cents)}` : 'Add funds'} loading={busy} onPress={() => void submit()} />
          </Animated.View>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(20,8,24,0.45)' },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.md,
  },
  handle: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3 },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
});
