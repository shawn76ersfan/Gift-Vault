import { router } from 'expo-router';
import { X } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { minTapTarget, radius, spacing, useTheme } from '@/theme';

import { AnimatedPressable } from './AnimatedPressable';
import { AppText } from './AppText';

export function ModalHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <View style={styles.flex}>
        <AppText variant="title">{title}</AppText>
        {subtitle ? <AppText muted>{subtitle}</AppText> : null}
      </View>
      <AnimatedPressable
        onPress={() => router.back()}
        accessibilityLabel="Close"
        style={[styles.close, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <X size={20} color={colors.text} />
      </AnimatedPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  flex: { flex: 1, gap: 2 },
  close: {
    width: minTapTarget,
    height: minTapTarget,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
});
