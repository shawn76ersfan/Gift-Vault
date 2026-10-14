import { router } from 'expo-router';
import { ChevronRight, Pencil, Trash2 } from 'lucide-react-native';
import { Alert, StyleSheet, View } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { useAnimatedStyle, interpolate, Extrapolation, type SharedValue } from 'react-native-reanimated';

import type { Doc } from '@convex/_generated/dataModel';
import { palette, radius, spacing, useTheme } from '@/theme';

import { AnimatedPressable } from './AnimatedPressable';
import { AppText } from './AppText';
import { Avatar } from './Avatar';

const ACTION_WIDTH = 72;

function Actions({ progress, onEdit, onDelete }: { progress: SharedValue<number>; onEdit: () => void; onDelete: () => void }) {
  const { colors } = useTheme();
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.6, 1], Extrapolation.CLAMP) }],
  }));

  return (
    <Animated.View style={[styles.actions, style]}>
      <AnimatedPressable onPress={onEdit} accessibilityLabel="Edit" style={[styles.action, { backgroundColor: colors.accentSoft }]}>
        <Pencil size={20} color={colors.accent} />
      </AnimatedPressable>
      <AnimatedPressable onPress={onDelete} accessibilityLabel="Delete" style={[styles.action, { backgroundColor: colors.danger }]}>
        <Trash2 size={20} color={palette.white} />
      </AnimatedPressable>
    </Animated.View>
  );
}

export function RecipientRow({ recipient, onDelete }: { recipient: Doc<'recipients'>; onDelete: (id: Doc<'recipients'>['_id']) => void }) {
  const { colors } = useTheme();

  const confirmDelete = () =>
    Alert.alert(`Remove ${recipient.name}?`, 'Their dates and any scheduled gifts will be removed too.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => onDelete(recipient._id) },
    ]);

  return (
    <ReanimatedSwipeable
      friction={1.6}
      rightThreshold={40}
      overshootRight={false}
      renderRightActions={(progress) => (
        <Actions
          progress={progress}
          onEdit={() => router.push({ pathname: '/person-form', params: { id: recipient._id } })}
          onDelete={confirmDelete}
        />
      )}>
      <AnimatedPressable
        onPress={() => router.push({ pathname: '/person/[id]', params: { id: recipient._id } })}
        accessibilityLabel={recipient.name}
        accessibilityHint="Swipe left for edit and delete"
        style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Avatar name={recipient.name} />
        <View style={styles.flex}>
          <AppText variant="subheading">{recipient.name}</AppText>
          <AppText variant="caption" muted numberOfLines={1}>
            {recipient.relationship ?? recipient.email ?? 'Tap to add their dates'}
          </AppText>
        </View>
        <ChevronRight size={20} color={colors.textMuted} />
      </AnimatedPressable>
    </ReanimatedSwipeable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  flex: { flex: 1, gap: 2 },
  actions: { flexDirection: 'row', gap: spacing.xs, paddingLeft: spacing.xs },
  action: { width: ACTION_WIDTH - spacing.xs, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
});
