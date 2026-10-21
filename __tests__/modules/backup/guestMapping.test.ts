import {
  guestToBackup,
  prepareGuestImport,
  GuestRows,
} from '../../../src/modules/backup/guestMapping';
import { decodeBackup, encodeBackup } from '../../../src/modules/backup';
import * as fx from './fixtures/backupFixtures';
const empty = (): GuestRows => ({
  categories: [],
  creditCards: [],
  subscriptions: [],
  expenses: [],
  incomes: [],
  savingsGoals: [],
});
describe('guest backup storage mapping', () => {
  it('restores all Compose entities, dates and savings movements, then exports without losing fields', () => {
    const payload = fx.payload({
      subscriptions: [fx.subscription({ billingCycle: 'yearly' })],
    });
    const { rows } = prepareGuestImport(empty(), payload, 'REPLACE');
    expect(rows.savingsGoals[0].transactions).toHaveLength(1);
    expect(rows.subscriptions[0].billingCycle).toBe('YEARLY');
    expect(guestToBackup(rows, payload.settings)).toEqual(payload);
    const result = decodeBackup(
      encodeBackup(guestToBackup(rows, payload.settings), 'test', 0),
    );
    expect(result.ok).toBe(true);
  });
  it('merges without removing unrepresented RN-only fields on skipped rows', () => {
    const restored = prepareGuestImport(empty(), fx.payload(), 'REPLACE').rows;
    restored.expenses[0].imageUrl = 'file:///receipt.jpg';
    const merged = prepareGuestImport(restored, fx.payload(), 'MERGE');
    expect(merged.rows.expenses[0].imageUrl).toBe('file:///receipt.jpg');
  });
  it('rejects unsupported cycles before building replacement', () => {
    expect(() =>
      prepareGuestImport(
        empty(),
        fx.payload({
          subscriptions: [fx.subscription({ billingCycle: 'hourly' })],
        }),
        'REPLACE',
      ),
    ).toThrow('UnsupportedBillingCycle');
  });
  it('refuses lossy receipt and financing export', () => {
    const rows = prepareGuestImport(empty(), fx.payload(), 'REPLACE').rows;
    rows.expenses[0].imageUrl = 'file:///receipt.jpg';
    expect(() => guestToBackup(rows, null)).toThrow('UnsupportedFields');
  });
  it('preserves existing savings movements in merge even when a goal is updated', () => {
    const current = prepareGuestImport(empty(), fx.payload(), 'REPLACE').rows;
    const file = fx.payload({
      savingsGoals: [fx.goal({ updatedAtMillis: 3000 })],
      savingsTransactions: [fx.goalTx({ id: 'another' })],
    });
    expect(
      prepareGuestImport(current, file, 'MERGE').rows.savingsGoals[0]
        .transactions,
    ).toHaveLength(2);
  });
});
