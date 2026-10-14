import { useClerk } from '@clerk/expo';
import { useMutation, useQuery } from 'convex/react';
import { router } from 'expo-router';
import { ChevronRight, CreditCard, History, LogOut, ShieldCheck, Wallet } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { api } from '@convex/_generated/api';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { AppText } from '@/components/AppText';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { GradientCard } from '@/components/GradientCard';
import { Screen } from '@/components/Screen';
import { Skeleton } from '@/components/Skeleton';
import { errorMessage, formatMoney } from '@/lib/format';
import { usePaymentSetup } from '@/lib/usePaymentSetup';
import { radius, spacing, staggerMs, useTheme } from '@/theme';

const BUDGETS = [5000, 10000, 20000, 50000];

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function SettingsScreen() {
  const { colors } = useTheme();
  const { signOut } = useClerk();
  const user = useQuery(api.users.current);
  const setBudget = useMutation(api.users.setMonthlyBudget);
  const payments = usePaymentSetup();
  const [budgetDraft, setBudgetDraft] = useState<number | null>(null);
  const budget = budgetDraft ?? user?.monthlyBudgetCents ?? null;

  const saveBudget = (cents: number) => {
    setBudgetDraft(cents);
    setBudget({ monthlyBudgetCents: cents }).catch((e: unknown) => Alert.alert('Could not update budget', errorMessage(e)));
  };

  const confirmRemoveCard = () =>
    Alert.alert('Remove card?', 'Auto-gifts will pause until you add a new card.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => void payments.removeCard() },
    ]);

  return (
    <Screen title="Settings">
      <Animated.View entering={FadeInDown.springify().damping(16)}>
        <GradientCard style={styles.profile}>
          {user ? <Avatar name={user.name} size={56} /> : <Skeleton width={56} height={56} radius={28} />}
          <View style={styles.flex}>
            <AppText variant="heading">{user?.name ?? ' '}</AppText>
            <AppText variant="caption" muted>
              {user?.email}
            </AppText>
          </View>
        </GradientCard>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(staggerMs).springify().damping(16)} style={styles.section}>
        <AppText variant="overline" muted>
          Payment method
        </AppText>
        <GradientCard style={styles.cardBox}>
          {user?.cardLast4 ? (
            <Animated.View entering={FadeIn} style={styles.row}>
              <View style={[styles.iconBubble, { backgroundColor: colors.accentSoft }]}>
                <CreditCard size={20} color={colors.accent} />
              </View>
              <View style={styles.flex}>
                <AppText variant="bodyStrong">
                  {capitalize(user.cardBrand ?? 'Card')} ending in {user.cardLast4}
                </AppText>
                <AppText variant="caption" muted>
                  Charged only when a gift is sent
                </AppText>
              </View>
            </Animated.View>
          ) : (
            <View style={styles.row}>
              <View style={[styles.iconBubble, { backgroundColor: colors.accentSoft }]}>
                <Wallet size={20} color={colors.accent} />
              </View>
              <AppText muted style={styles.flex}>
                No card yet. Add one to turn on automatic gifting.
              </AppText>
            </View>
          )}
          <Button
            label={user?.cardLast4 ? 'Replace card' : 'Add a card'}
            icon={CreditCard}
            variant={user?.cardLast4 ? 'secondary' : 'primary'}
            loading={payments.busy}
            onPress={() => void payments.addCard()}
          />
          {user?.cardLast4 ? <Button label="Remove card" variant="ghost" onPress={confirmRemoveCard} /> : null}
          {payments.error ? <AppText color={colors.danger}>{payments.error}</AppText> : null}
          <View style={styles.consent}>
            <ShieldCheck size={14} color={colors.textMuted} />
            <AppText variant="caption" muted style={styles.flex}>
              By adding a card you authorize GiftVault to charge it automatically for gifts you schedule. Payments are
              processed securely by Stripe.
            </AppText>
          </View>
        </GradientCard>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(2 * staggerMs).springify().damping(16)} style={styles.section}>
        <AppText variant="overline" muted>
          Monthly gift budget
        </AppText>
        <GradientCard style={styles.cardBox}>
          <AppText muted>Used to track how much of your budget has gone to gifts each month.</AppText>
          <View style={styles.chips}>
            {BUDGETS.map((b) => (
              <Chip key={b} label={formatMoney(b)} selected={budget === b} onPress={() => saveBudget(b)} />
            ))}
          </View>
        </GradientCard>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(3 * staggerMs).springify().damping(16)} style={styles.section}>
        <AnimatedPressable
          onPress={() => router.push('/gifts')}
          style={[styles.link, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <History size={20} color={colors.text} />
          <AppText variant="bodyStrong" style={styles.flex}>
            Gift history
          </AppText>
          <ChevronRight size={20} color={colors.textMuted} />
        </AnimatedPressable>
        <AnimatedPressable
          onPress={() => void signOut()}
          style={[styles.link, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <LogOut size={20} color={colors.danger} />
          <AppText variant="bodyStrong" color={colors.danger} style={styles.flex}>
            Sign out
          </AppText>
        </AnimatedPressable>
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  profile: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  section: { gap: spacing.xs },
  cardBox: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconBubble: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  consent: { flexDirection: 'row', gap: spacing.xs, alignItems: 'flex-start' },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 56,
  },
});
