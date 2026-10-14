import { StyleSheet, View } from 'react-native';

import { spacing } from '@/theme';

import { AppText } from './AppText';

export function SetupNeeded({ missing }: { missing: string[] }) {
  return (
    <View style={styles.container}>
      <AppText variant="title" center>
        Almost there
      </AppText>
      <AppText muted center>
        Add these values to .env.local and restart the dev server:
      </AppText>
      {missing.map((name) => (
        <AppText key={name} variant="bodyStrong" center>
          {name}
        </AppText>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.xl },
});
