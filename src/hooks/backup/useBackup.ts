import { useEffect, useRef, useState } from 'react';
import { Alert, InteractionManager } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useI18n } from '../shared/useI18n';
import { useAuthStore } from '../../store/authStore';
import {
  createGuestBackup,
  guestBackupCounts,
  requireGuestSession,
  restoreGuestBackup,
} from '../../services/backupData';
import {
  exportBackupFile,
  importBackupFile,
  isBackupCancelled,
} from '../../services/backupFiles';
import {
  BackupFile,
  ImportMode,
  decodeBackup,
  entities,
} from '../../modules/backup';
import type { TranslationKey } from '../../i18n/index';
const afterInteractions = () =>
  new Promise<void>(resolve => {
    InteractionManager.runAfterInteractions(() => resolve());
  });
export function useBackup() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const isGuest = useAuthStore(s => s.sessionMode === 'guest');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [pending, setPending] = useState<BackupFile | null>(null);
  const sessionEpoch = useRef(0);
  useEffect(
    () =>
      useAuthStore.subscribe((next, previous) => {
        if (next.sessionMode !== previous.sessionMode) {
          sessionEpoch.current += 1;
          setPending(null);
        }
      }),
    [],
  );

  const errorMessage = (error: unknown) => {
    const raw = error instanceof Error ? error.message : 'ReadFailed';
    const kind = raw.split(':')[0];
    const keys: Record<string, TranslationKey> = {
      AccountMode: 'backup.account',
      TooLarge: 'backup.tooLarge',
      NewerSchema: 'backup.newerSchema',
      ChecksumMismatch: 'backup.checksum',
      UnsupportedFields: 'backup.unsupportedFields',
      UnsupportedBillingCycle: 'backup.unsupportedCycle',
      UnsupportedEntity: 'backup.unsupportedEntity',
      RollbackFailed: 'backup.rollbackFailed',
    };
    return t(keys[kind] ?? 'backup.failed');
  };
  const run = async (task: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true;
    const epoch = sessionEpoch.current;
    setBusy(true);
    try {
      requireGuestSession();
      await afterInteractions();
      requireGuestSession();
      if (epoch !== sessionEpoch.current) throw Error('AccountMode');
      await task();
    } catch (error) {
      if (!isBackupCancelled(error))
        Alert.alert(t('common.error'), errorMessage(error));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const exportBackup = () =>
    run(async () => {
      const text = createGuestBackup();
      requireGuestSession();
      await exportBackupFile(text);
      Alert.alert(t('common.success'), t('backup.exported'));
    });
  const importBackup = () =>
    run(async () => {
      const epoch = sessionEpoch.current;
      const text = await importBackupFile();
      requireGuestSession();
      if (epoch !== sessionEpoch.current) throw Error('AccountMode');
      const result = decodeBackup(text);
      if (!result.ok) throw Error(result.error.kind);
      setPending(result.file);
    });
  const apply = (mode: ImportMode) =>
    run(async () => {
      if (!pending) return;
      const summary = restoreGuestBackup(pending.payload, mode);
      setPending(null);
      await queryClient.invalidateQueries();
      const totals = Object.values(summary.results).reduce(
        (a, r) => ({
          added: a.added + r.added,
          updated: a.updated + r.updated,
          skipped: a.skipped + r.skipped,
        }),
        { added: 0, updated: 0, skipped: 0 },
      );
      Alert.alert(
        t('common.success'),
        t('backup.result', {
          ...totals,
          unlinked: summary.unlinkedReferences,
          remapped: summary.remappedCategories,
        }) +
          (summary.settingsRestored
            ? '\n' + t('backup.settingsRestored')
            : '') +
          (pending.payload.settings?.dynamicColor != null && mode === 'REPLACE'
            ? '\n' + t('backup.dynamicColor')
            : ''),
      );
    });
  const replace = () => {
    try {
      const counts = guestBackupCounts();
      const rows = entities.reduce((sum, e) => sum + counts[e], 0);
      Alert.alert(
        t('backup.replace'),
        t('backup.replaceConfirm', { count: rows }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('backup.replace'),
            style: 'destructive',
            onPress: () => apply('REPLACE'),
          },
        ],
      );
    } catch (error) {
      Alert.alert(t('common.error'), errorMessage(error));
    }
  };
  return {
    t,
    isGuest,
    busy,
    pending,
    exportBackup,
    importBackup,
    merge: () => apply('MERGE'),
    replace,
    cancel: () => setPending(null),
  };
}
