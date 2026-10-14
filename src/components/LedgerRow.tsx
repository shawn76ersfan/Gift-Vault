import { ArrowDownLeft, ArrowUpRight, RotateCcw } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import type { Doc } from '@convex/_generated/dataModel';
import { formatMoney } from '@/lib/format';
import { radius, spacing, useTheme } from '@/theme';

import { AppText } from './AppText';

const LABELS: Record<Doc<'vaultLedger'>['type'], string> = {
  budget_add: 'Budget added',
  gift_charge: 'Gift sent',
  refund: 'Refund',
};

export function LedgerRow({ entry }: { entry: Doc<'vaultLedger'> }) {
  const { colors } = useTheme();
  const outgoing = entry.type === 'gift_charge';
  const Icon = entry.type === 'budget_add' ? ArrowDownLeft : entry.type === 'refund' ? RotateCcw : ArrowUpRight;
  const tint = outgoing ? colors.accent : colors.success;

  return (
    <View style={styles.row}>
      <View style={[styles.icon, { backgroundColor: colors.accentSoft }]}>
        <Icon size={18} color={tint} />
      </View>
      <View style={styles.flex}>
        <AppText variant="bodyStrong">{entry.note ?? LABELS[entry.type]}</AppText>
        <AppText variant="caption" muted>
          {new Date(entry._creationTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </AppText>
      </View>
      <AppText variant="bodyStrong" color={tint}>
        {outgoing ? '-' : '+'}
        {formatMoney(entry.amountCents, { showCents: true })}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  icon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
});
