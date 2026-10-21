import { BackupPayload, planImport } from '../../../src/modules/backup';
import * as fx from './fixtures/backupFixtures';

const device = (p: Partial<BackupPayload> = {}) => ({
  ...fx.emptyPayload(),
  ...p,
});

describe('planImport', () => {
  it('REPLACE restores everything and leaves links intact', () => {
    const plan = planImport(
      device({ expenses: [fx.expense({ id: 'old' })] }),
      fx.payload(),
      'REPLACE',
    );
    expect(plan.replace).toBe(true);
    expect(plan.summary.unlinkedReferences).toBe(0);
    expect(plan.upserts.expenses.map(e => e.id)).toEqual(['exp-1', 'exp-2']);
    expect(plan.summary.results.expenses).toEqual({
      added: 2,
      updated: 0,
      skipped: 0,
    });
    expect(plan.summary.results.savingsTransactions).toEqual({
      added: 1,
      updated: 0,
      skipped: 0,
    });
  });

  it('MERGE into an empty device adds every row', () => {
    const plan = planImport(device(), fx.payload(), 'MERGE');
    expect(plan.replace).toBe(false);
    expect(plan.summary.results.categories.added).toBe(1);
    expect(plan.summary.results.creditCards.added).toBe(1);
    expect(plan.summary.results.subscriptions.added).toBe(1);
    expect(plan.summary.results.incomes.added).toBe(1);
    expect(plan.summary.results.savingsGoals.added).toBe(1);
  });

  it('MERGE is idempotent: importing what is already there skips everything', () => {
    const file = fx.payload();
    const plan = planImport(file, file, 'MERGE');
    for (const result of Object.values(plan.summary.results)) {
      expect(result.added).toBe(0);
      expect(result.updated).toBe(0);
    }
    expect(plan.upserts.expenses).toEqual([]);
  });

  it('MERGE overwrites a row only when the file copy is newer', () => {
    const current = device({
      categories: [fx.category()],
      expenses: [
        fx.expense({ title: 'Local', updatedAtMillis: 5000 }),
        fx.expense({ id: 'exp-2', title: 'Old', updatedAtMillis: 1 }),
      ],
    });
    const file = device({
      categories: [fx.category()],
      expenses: [
        fx.expense({ title: 'File', updatedAtMillis: 4000 }),
        fx.expense({ id: 'exp-2', title: 'New', updatedAtMillis: 9 }),
      ],
    });
    const plan = planImport(current, file, 'MERGE');
    expect(plan.summary.results.expenses).toEqual({
      added: 0,
      updated: 1,
      skipped: 1,
    });
    expect(plan.upserts.expenses.map(e => e.title)).toEqual(['New']);
  });

  it('MERGE maps a category with the same name onto the existing one', () => {
    const current = device({
      categories: [fx.category({ id: 'mine', name: '  FOOD ' })],
    });
    const file = device({
      categories: [fx.category({ id: 'theirs', name: 'food' })],
      expenses: [
        fx.expense({
          categoryId: 'theirs',
          creditCardId: null,
          subscriptionId: null,
        }),
      ],
    });
    const plan = planImport(current, file, 'MERGE');
    expect(plan.summary.remappedCategories).toBe(1);
    expect(plan.summary.results.categories).toEqual({
      added: 0,
      updated: 0,
      skipped: 1,
    });
    expect(plan.upserts.categories).toEqual([]);
    expect(plan.upserts.expenses[0].categoryId).toBe('mine');
  });

  it('same category id wins over a name match', () => {
    const current = device({
      categories: [fx.category({ id: 'c', name: 'Local' })],
    });
    const file = device({
      categories: [fx.category({ id: 'c', name: 'Other' })],
    });
    const plan = planImport(current, file, 'MERGE');
    expect(plan.summary.remappedCategories).toBe(0);
    expect(plan.summary.results.categories.skipped).toBe(1);
  });

  it('clears and counts references to rows that will not exist', () => {
    const file = device({
      subscriptions: [
        fx.subscription({ categoryId: 'ghost', creditCardId: 'ghost' }),
      ],
      expenses: [
        fx.expense({
          categoryId: 'ghost',
          creditCardId: 'ghost',
          subscriptionId: 'ghost',
        }),
      ],
    });
    const plan = planImport(device(), file, 'MERGE');
    expect(plan.summary.unlinkedReferences).toBe(5);
    expect(plan.upserts.subscriptions[0].categoryId).toBeNull();
    expect(plan.upserts.subscriptions[0].creditCardId).toBeNull();
    expect(plan.upserts.expenses[0]).toMatchObject({
      categoryId: null,
      creditCardId: null,
      subscriptionId: null,
    });
  });

  it('links to rows already on the device', () => {
    const current = device({
      creditCards: [fx.card()],
      categories: [fx.category()],
      subscriptions: [fx.subscription()],
    });
    const file = device({ expenses: [fx.expense({ id: 'new' })] });
    const plan = planImport(current, file, 'MERGE');
    expect(plan.summary.unlinkedReferences).toBe(0);
    expect(plan.upserts.expenses[0].creditCardId).toBe('card-1');
  });

  it('savings movements are skipped when duplicated or when the goal is missing', () => {
    const current = device({
      savingsGoals: [fx.goal()],
      savingsTransactions: [fx.goalTx()],
    });
    const file = device({
      savingsGoals: [fx.goal({ updatedAtMillis: 1 })],
      savingsTransactions: [fx.goalTx(), fx.goalTx({ id: 'gtx-2' })],
    });
    const plan = planImport(current, file, 'MERGE');
    expect(plan.summary.results.savingsTransactions).toEqual({
      added: 1,
      updated: 0,
      skipped: 1,
    });
    expect(plan.upserts.savingsTransactions.map(t => t.id)).toEqual(['gtx-2']);
  });

  it('only REPLACE carries preferences; the plan says whether the file has any', () => {
    const file = fx.payload();
    expect(planImport(device(), file, 'REPLACE').settings).toEqual(
      file.settings,
    );
    expect(planImport(device(), file, 'MERGE').settings).toBeNull();
    expect(planImport(device(), device(), 'REPLACE').settings).toBeNull();
  });
});
