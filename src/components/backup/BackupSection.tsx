import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Button } from '../ui/primitives/Button';
import { useBackup } from '../../hooks/backup/useBackup';
import { useTheme } from '../../theme/index';
export function BackupSection() {
  const vm = useBackup();
  const { colors } = useTheme();
  return (
    <View style={[styles.section, { borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        {vm.t('backup.title')}
      </Text>
      <Text style={[styles.copy, { color: colors.textSecondary }]}>
        {vm.t(vm.isGuest ? 'backup.description' : 'backup.account')}
      </Text>
      {vm.isGuest ? (
        <>
          <Text style={[styles.copy, { color: colors.warning }]}>
            {vm.t('backup.sensitive')}
          </Text>
          <Button
            title={vm.t('backup.export')}
            onPress={vm.exportBackup}
            disabled={vm.busy || vm.pending !== null}
          />
          <Button
            title={vm.t('backup.import')}
            onPress={vm.importBackup}
            disabled={vm.busy || vm.pending !== null}
          />
        </>
      ) : null}
      {vm.busy ? (
        <ActivityIndicator
          accessibilityLabel={vm.t('common.loading')}
          color={colors.primaryAction}
        />
      ) : null}
      {vm.pending ? (
        <>
          <Text style={[styles.copy, { color: colors.textPrimary }]}>
            {vm.t('backup.preview', {
              count: Object.values(vm.pending.payload).reduce<number>(
                (n, v) => n + (Array.isArray(v) ? v.length : 0),
                0,
              ),
              date: new Date(vm.pending.createdAtMillis).toLocaleDateString(),
            })}
          </Text>
          <Button
            title={vm.t('backup.merge')}
            onPress={vm.merge}
            disabled={vm.busy}
          />
          <Button
            title={vm.t('backup.replace')}
            onPress={vm.replace}
            disabled={vm.busy}
          />
          <Button
            title={vm.t('common.cancel')}
            onPress={vm.cancel}
            disabled={vm.busy}
          />
        </>
      ) : null}
    </View>
  );
}
const styles = StyleSheet.create({
  section: { borderTopWidth: 1, paddingVertical: 16, gap: 12 },
  title: { fontWeight: '600', fontSize: 18 },
  copy: { fontSize: 14, lineHeight: 20 },
});
