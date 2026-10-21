import { useAuthStore } from '../store/authStore';
import {
  ensureGuestDataHydrated,
  useGuestDataStore,
} from '../store/guestDataStore';
import { usePreferencesStore } from '../store/preferencesStore';
import { useReminderSettingsStore } from '../store/reminderSettingsStore';
import {
  BackupPayload,
  BackupSettings,
  decodeBackup,
  encodeBackup,
  entities,
  sanitizePayload,
} from '../modules/backup';
import {
  guestToBackup,
  prepareGuestImport,
} from '../modules/backup/guestMapping';
import type { ImportMode } from '../modules/backup';
import type { BudgetPeriod } from '../types/index';
import type { ThemeMode } from '../theme/themes';
export function requireGuestSession() {
  if (useAuthStore.getState().sessionMode !== 'guest')
    throw Error('AccountMode');
}
function readSettings(): BackupSettings {
  const auth = useAuthStore.getState();
  const prefs = usePreferencesStore.getState();
  const user = auth.guestUser;
  return {
    themeMode: prefs.themeMode,
    language: prefs.language,
    currency: user.currency ?? null,
    budgetAmount: user.budgetAmount ?? null,
    budgetPeriod: user.budgetPeriod ?? null,
    budgetPeriodStart: user.budgetPeriodStart ?? null,
    budgetPeriodEnd: user.budgetPeriodEnd ?? null,
    guestName: user.name ?? null,
    dynamicColor: useGuestDataStore.getState().backupDynamicColor ?? null,
    reminderLeadDays: useReminderSettingsStore.getState().leadDays,
  };
}
function applySettings(s: BackupSettings) {
  requireGuestSession();
  const prefs = usePreferencesStore.getState();
  if (s.language === 'en' || s.language === 'es') prefs.setLanguage(s.language);
  if (s.themeMode) prefs.setThemeMode(s.themeMode as ThemeMode);
  if (s.reminderLeadDays !== null)
    useReminderSettingsStore.getState().setLeadDays(s.reminderLeadDays);
  const auth = useAuthStore.getState();
  auth.setUser({
    ...auth.guestUser,
    ...(s.guestName !== null ? { name: s.guestName } : {}),
    ...(s.currency !== null ? { currency: s.currency } : {}),
    ...(s.budgetAmount !== null && s.budgetPeriod !== null
      ? {
          budgetAmount: s.budgetAmount,
          budgetPeriod: s.budgetPeriod as BudgetPeriod,
        }
      : {}),
    ...(s.budgetPeriodStart !== null || s.budgetPeriodEnd !== null
      ? {
          budgetPeriodStart: s.budgetPeriodStart,
          budgetPeriodEnd: s.budgetPeriodEnd,
        }
      : {}),
  });
}
export function createGuestBackup() {
  requireGuestSession();
  const payload = guestToBackup(ensureGuestDataHydrated(), readSettings());
  const text = encodeBackup(payload, '0.0.1', Date.now());
  const checked = decodeBackup(text);
  if (!checked.ok) throw Error(checked.error.kind);
  return text;
}
export function guestBackupCounts() {
  requireGuestSession();
  const rows = ensureGuestDataHydrated();
  return {
    categories: rows.categories.length,
    creditCards: rows.creditCards.length,
    subscriptions: rows.subscriptions.length,
    expenses: rows.expenses.length,
    incomes: rows.incomes.length,
    savingsGoals: rows.savingsGoals.length,
    savingsTransactions: rows.savingsGoals.reduce(
      (n, g) => n + (g.transactions?.length ?? 0),
      0,
    ),
  };
}
/** Synchronous apply prevents interleaving guest edits; data uses a single persist-before-publish snapshot. */
export function restoreGuestBackup(payload: BackupPayload, mode: ImportMode) {
  requireGuestSession();
  const before = ensureGuestDataHydrated();
  const previousSettings = readSettings();
  const preferences = usePreferencesStore.getState();
  const previousUser = useAuthStore.getState().guestUser;
  const { rows, plan } = prepareGuestImport(
    before,
    sanitizePayload(payload as unknown as Record<string, unknown>),
    mode,
  );
  const previousRows = {
    categories: before.categories,
    creditCards: before.creditCards,
    subscriptions: before.subscriptions,
    expenses: before.expenses,
    incomes: before.incomes,
    savingsGoals: before.savingsGoals,
    backupDynamicColor: before.backupDynamicColor,
  };
  // Validate/materialize the complete plan before any storage mutation.
  requireGuestSession();
  let persisted = false;
  try {
    before.restoreSnapshot({
      ...rows,
      backupDynamicColor:
        plan.settings?.dynamicColor ?? before.backupDynamicColor,
    });
    persisted = true;
    if (plan.settings) applySettings(plan.settings);
  } catch (error) {
    if (persisted) {
      try {
        before.restoreSnapshot(previousRows);
        applySettings(previousSettings);
        useAuthStore.getState().setUser(previousUser);
        usePreferencesStore
          .getState()
          .setLanguage(preferences.language, preferences.languageSource);
      } catch {
        throw Error('RollbackFailed');
      }
    }
    throw error;
  }
  return {
    ...plan.summary,
    settingsRestored: plan.settings !== null,
    counts: Object.fromEntries(entities.map(e => [e, plan.summary.results[e]])),
  };
}
