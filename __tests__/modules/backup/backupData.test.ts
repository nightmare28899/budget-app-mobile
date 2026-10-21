import {
  createGuestBackup,
  restoreGuestBackup,
} from '../../../src/services/backupData';
import * as fx from './fixtures/backupFixtures';
const mockRestore = jest.fn();
const mockSetUser = jest.fn();
const mockLanguage = jest.fn();
const mockTheme = jest.fn();
const mockLead = jest.fn();
let mockSession = 'guest';
let mockRows: Record<string, unknown>;
const mockUser = {
  id: 'guest-local',
  name: 'Before',
  currency: 'USD',
  budgetAmount: 10,
  budgetPeriod: 'monthly',
  budgetPeriodStart: null,
  budgetPeriodEnd: null,
};
jest.mock('../../../src/store/authStore', () => ({
  useAuthStore: {
    getState: () => ({
      sessionMode: mockSession,
      guestUser: mockUser,
      setUser: mockSetUser,
    }),
  },
}));
jest.mock('../../../src/store/guestDataStore', () => ({
  ensureGuestDataHydrated: () => mockRows,
  useGuestDataStore: { getState: () => mockRows },
}));
jest.mock('../../../src/store/preferencesStore', () => ({
  usePreferencesStore: {
    getState: () => ({
      language: 'en',
      languageSource: 'device',
      themeMode: 'light',
      setLanguage: mockLanguage,
      setThemeMode: mockTheme,
    }),
  },
}));
jest.mock('../../../src/store/reminderSettingsStore', () => ({
  useReminderSettingsStore: {
    getState: () => ({ leadDays: 1, setLeadDays: mockLead }),
  },
}));
beforeEach(() => {
  jest.clearAllMocks();
  mockSession = 'guest';
  mockRows = {
    categories: [],
    creditCards: [],
    subscriptions: [],
    expenses: [],
    incomes: [],
    savingsGoals: [],
    restoreSnapshot: mockRestore,
  };
  mockRestore.mockReset();
  mockTheme.mockReset();
});
describe('backup persistence boundary', () => {
  it('does not mutate or export authenticated account data', () => {
    mockSession = 'authenticated';
    expect(() => createGuestBackup()).toThrow('AccountMode');
    expect(() => restoreGuestBackup(fx.payload(), 'REPLACE')).toThrow(
      'AccountMode',
    );
    expect(mockRestore).not.toHaveBeenCalled();
    expect(mockSetUser).not.toHaveBeenCalled();
  });
  it('publishes all rows in a single persisted snapshot before applying settings', () => {
    restoreGuestBackup(fx.payload(), 'REPLACE');
    expect(mockRestore).toHaveBeenCalledTimes(1);
    const snapshot = mockRestore.mock.calls[0][0];
    expect(snapshot.expenses).toHaveLength(2);
    expect(snapshot.savingsGoals[0].transactions).toHaveLength(1);
    expect(mockRestore.mock.invocationCallOrder[0]).toBeLessThan(
      mockSetUser.mock.invocationCallOrder[0],
    );
  });
  it('never writes settings if data persistence fails', () => {
    mockRestore.mockImplementationOnce(() => {
      throw Error('disk full');
    });
    expect(() => restoreGuestBackup(fx.payload(), 'REPLACE')).toThrow(
      'disk full',
    );
    expect(mockSetUser).not.toHaveBeenCalled();
    expect(mockTheme).not.toHaveBeenCalled();
  });
  it('restores prior data and preferences if a settings write fails', () => {
    mockTheme.mockImplementationOnce(() => {
      throw Error('settings');
    });
    expect(() => restoreGuestBackup(fx.payload(), 'REPLACE')).toThrow(
      'settings',
    );
    expect(mockRestore).toHaveBeenCalledTimes(2);
    expect(mockRestore.mock.calls[1][0].expenses).toEqual([]);
    expect(mockSetUser).toHaveBeenLastCalledWith(mockUser);
    expect(mockLanguage).toHaveBeenLastCalledWith('en', 'device');
  });
  it('reports rollback failure rather than a false successful restore', () => {
    mockTheme.mockImplementationOnce(() => {
      throw Error('settings');
    });
    mockRestore
      .mockImplementationOnce(() => {})
      .mockImplementationOnce(() => {
        throw Error('rollback disk');
      });
    expect(() => restoreGuestBackup(fx.payload(), 'REPLACE')).toThrow(
      'RollbackFailed',
    );
  });
  it('merge does not change preferences', () => {
    restoreGuestBackup(fx.payload(), 'MERGE');
    expect(mockSetUser).not.toHaveBeenCalled();
    expect(mockLanguage).not.toHaveBeenCalled();
  });
  it('rejects invalid incoming rows before storage mutation', () => {
    expect(() =>
      restoreGuestBackup(
        fx.payload({ expenses: [fx.expense({ currency: 'oops' })] }),
        'REPLACE',
      ),
    ).toThrow();
    expect(mockRestore).not.toHaveBeenCalled();
  });
});
