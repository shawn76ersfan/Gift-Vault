import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing, useTheme } from '@/theme';

import { AppText } from './AppText';

type Props = {
  title?: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
  scroll?: boolean;
  tabBarPadding?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
};

export const TAB_BAR_SPACE = 110;

export function Screen({ title, subtitle, right, children, scroll = true, tabBarPadding = true, refreshing, onRefresh }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const header = title ? (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
      <View style={styles.headerText}>
        <AppText variant="title">{title}</AppText>
        {subtitle ? <AppText muted>{subtitle}</AppText> : null}
      </View>
      {right}
    </Animated.View>
  ) : null;

  const contentStyle = {
    paddingTop: insets.top + spacing.md,
    paddingBottom: tabBarPadding ? TAB_BAR_SPACE + insets.bottom : insets.bottom + spacing.xl,
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  };

  if (!scroll) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background }, contentStyle]}>
        {header}
        {children}
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: colors.background }]}
      contentContainerStyle={contentStyle}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.accent} /> : undefined
      }>
      {header}
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  headerText: { flex: 1, gap: 2 },
});
