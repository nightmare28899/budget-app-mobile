import type {
  Category,
  CreditCard,
  Expense,
  Income,
  SavingsGoal,
  Subscription,
  PaymentMethodValue,
} from '../../types/index';
import { BackupPayload, BackupSettings } from './models';
import { planImport, ImportMode } from './planner';
export type GuestRows = {
  categories: Category[];
  creditCards: CreditCard[];
  expenses: Expense[];
  incomes: Income[];
  subscriptions: Subscription[];
  savingsGoals: SavingsGoal[];
};
const millis = (date: string | undefined) => {
  if (!date) return 0;
  const n = Date.parse(date);
  if (!Number.isFinite(n)) throw Error('Invalid local date');
  return n;
};
const epoch = (date: string) =>
  Math.floor(Date.parse(date.slice(0, 10) + 'T00:00:00Z') / 86400000);
const iso = (n: number) => new Date(n).toISOString();
const day = (n: number) => iso(n * 86400000).slice(0, 10);
/** Refuse data that v1 cannot carry. A successful backup must not quietly lose receipts or financing terms. */
export function assertExportSupported(rows: GuestRows) {
  for (const e of rows.expenses) {
    const unsupported = [
      'imageUrl',
      'imagePresignedUrl',
      'financingPlan',
      'installmentPurchaseDate',
      'installmentFirstPaymentDate',
      'installmentFrequency',
    ] as const;
    const fields = unsupported.filter(
      k =>
        e[k] != null &&
        e[k] !== '' &&
        !(k === 'installmentFrequency' && e[k] === 'MONTHLY'),
    );
    if (fields.length) throw Error(`UnsupportedFields: ${fields.join(', ')}`);
  }
}
export function guestToBackup(
  rows: GuestRows,
  settings: BackupSettings | null,
): BackupPayload {
  assertExportSupported(rows);
  return {
    categories: rows.categories.map(c => ({
      id: c.id,
      name: c.name,
      icon: c.icon ?? null,
      color: c.color ?? null,
      budgetAmount: c.budgetAmount ?? null,
    })),
    creditCards: rows.creditCards.map(c => ({
      id: c.id,
      name: c.name,
      bank: c.bank,
      brand: c.brand,
      last4: c.last4,
      color: c.color ?? null,
      creditLimit: c.creditLimit ?? null,
      closingDay: c.closingDay ?? null,
      paymentDueDay: c.paymentDueDay ?? null,
      currency: c.currency ?? null,
      isActive: c.isActive,
      createdAtMillis: millis(c.createdAt),
      updatedAtMillis: millis(c.updatedAt),
    })),
    subscriptions: rows.subscriptions.map(s => ({
      id: s.id,
      name: s.name,
      cost: s.cost,
      currency: s.currency,
      billingCycle: { MONTHLY: 'monthly', YEARLY: 'yearly', WEEKLY: 'weekly' }[
        s.billingCycle
      ],
      nextPaymentEpochDay: epoch(s.nextPaymentDate),
      anchorEpochDay: epoch(s.chargeDate || s.nextPaymentDate),
      reminderDays: s.reminderDays,
      isActive: s.isActive,
      paymentMethod: s.paymentMethod ?? null,
      categoryId: s.categoryId ?? s.category?.id ?? null,
      hexColor: s.hexColor ?? s.color ?? null,
      logoUrl: s.logoUrl ?? null,
      createdAtMillis: millis(s.createdAt),
      updatedAtMillis: millis(s.updatedAt),
      creditCardId: s.creditCardId ?? null,
    })),
    expenses: rows.expenses.map(e => ({
      id: e.id,
      title: e.title,
      cost: e.cost,
      currency: e.currency,
      dateMillis: millis(e.date),
      merchantName: e.merchantName ?? null,
      locationLabel: e.locationLabel ?? null,
      note: e.note ?? null,
      paymentMethod: e.paymentMethod ?? null,
      creditCardId: e.creditCardId ?? null,
      categoryId: e.categoryId ?? e.category?.id ?? null,
      isInstallment: e.isInstallment ?? false,
      installmentGroupId: e.installmentGroupId ?? null,
      installmentCount: e.installmentCount ?? null,
      installmentIndex: e.installmentIndex ?? null,
      installmentTotalAmount: e.installmentTotalAmount ?? null,
      createdAtMillis: millis(e.createdAt),
      updatedAtMillis: millis(e.updatedAt),
      subscriptionId: e.subscriptionId ?? null,
    })),
    incomes: rows.incomes.map(i => ({
      id: i.id,
      title: i.title,
      amount: i.amount,
      currency: i.currency,
      dateMillis: millis(i.date),
      note: i.note ?? null,
      createdAtMillis: millis(i.createdAt),
      updatedAtMillis: millis(i.updatedAt),
    })),
    savingsGoals: rows.savingsGoals.map(g => ({
      id: g.id,
      title: g.title,
      targetAmount: g.targetAmount,
      currentAmount: g.currentAmount,
      targetEpochDay: g.targetDate ? epoch(g.targetDate) : null,
      icon: g.icon ?? null,
      color: g.color ?? null,
      createdAtMillis: millis(g.createdAt),
      updatedAtMillis: millis(g.updatedAt),
    })),
    savingsTransactions: rows.savingsGoals.flatMap(g =>
      (g.transactions ?? []).map(tx => ({
        id: tx.id,
        goalId: g.id,
        amount: tx.amount,
        type: tx.type,
        createdAtMillis: millis(tx.createdAt),
      })),
    ),
    settings,
  };
}
const cycles: Record<string, Subscription['billingCycle']> = {
  monthly: 'MONTHLY',
  annual: 'YEARLY',
  yearly: 'YEARLY',
  weekly: 'WEEKLY',
};
export function prepareGuestImport(
  current: GuestRows,
  payload: BackupPayload,
  mode: ImportMode,
) {
  // Planning may inspect old rows containing RN-only metadata; retain those originals unchanged below.
  const planningRows = {
    ...current,
    expenses: current.expenses.map(e => ({
      ...e,
      imageUrl: undefined,
      imagePresignedUrl: undefined,
      financingPlan: undefined,
      installmentPurchaseDate: undefined,
      installmentFirstPaymentDate: undefined,
      installmentFrequency: undefined,
    })),
  };
  const plan = planImport(guestToBackup(planningRows, null), payload, mode);
  for (const s of plan.upserts.subscriptions)
    if (!cycles[s.billingCycle.toLowerCase()])
      throw Error(`UnsupportedBillingCycle: ${s.billingCycle}`);
  const userId = 'guest-local';
  const p = plan.upserts;
  const rows: GuestRows = {
    categories: p.categories.map(c => ({
      ...c,
      icon: c.icon ?? undefined,
      color: c.color ?? undefined,
      userId,
    })),
    creditCards: p.creditCards.map(c => ({
      ...c,
      currency: c.currency ?? undefined,
      createdAt: iso(c.createdAtMillis),
      updatedAt: iso(c.updatedAtMillis),
    })),
    subscriptions: p.subscriptions.map(s => ({
      ...s,
      category: undefined,
      creditCard: undefined,
      paymentMethod: (s.paymentMethod ?? undefined) as
        | PaymentMethodValue
        | undefined,
      billingCycle: cycles[s.billingCycle.toLowerCase()],
      nextPaymentDate: day(s.nextPaymentEpochDay),
      chargeDate: day(s.anchorEpochDay),
      color: s.hexColor ?? '#95A5A6',
      icon: 'repeat-outline',
      createdAt: iso(s.createdAtMillis),
      updatedAt: iso(s.updatedAtMillis),
      userId,
    })),
    expenses: p.expenses.map(e => ({
      ...e,
      category: undefined,
      creditCard: undefined,
      note: e.note ?? undefined,
      paymentMethod: (e.paymentMethod ?? undefined) as
        | PaymentMethodValue
        | undefined,
      date: iso(e.dateMillis),
      createdAt: iso(e.createdAtMillis),
      updatedAt: iso(e.updatedAtMillis),
      userId,
    })),
    incomes: p.incomes.map(i => ({
      ...i,
      date: iso(i.dateMillis),
      createdAt: iso(i.createdAtMillis),
      updatedAt: iso(i.updatedAtMillis),
      userId,
    })),
    savingsGoals: p.savingsGoals.map(g => ({
      ...g,
      targetDate: g.targetEpochDay === null ? null : day(g.targetEpochDay),
      createdAt: iso(g.createdAtMillis),
      updatedAt: iso(g.updatedAtMillis),
      userId,
    })),
  };
  for (const entity of [
    'categories',
    'creditCards',
    'subscriptions',
    'expenses',
    'incomes',
    'savingsGoals',
  ] as const) {
    const merged = new Map<string, unknown>(
      (mode === 'MERGE' ? current[entity] : []).map(r => [r.id, r]),
    );
    rows[entity].forEach(r =>
      merged.set(r.id, { ...((merged.get(r.id) as object) ?? {}), ...r }),
    );
    (rows[entity] as unknown[]) = Array.from(merged.values());
  }
  const txs = new Map<string, NonNullable<SavingsGoal['transactions']>[number]>(
    (mode === 'MERGE'
      ? current.savingsGoals.flatMap(g => g.transactions ?? [])
      : []
    ).map(tx => [tx.id, tx]),
  );
  p.savingsTransactions.forEach(tx =>
    txs.set(tx.id, {
      id: tx.id,
      goalId: tx.goalId,
      amount: tx.amount,
      type: tx.type as 'DEPOSIT' | 'WITHDRAW',
      createdAt: iso(tx.createdAtMillis),
    }),
  );
  const transactionsByGoal = new Map<
    string,
    NonNullable<SavingsGoal['transactions']>
  >();
  for (const tx of txs.values()) {
    const group = transactionsByGoal.get(tx.goalId) ?? [];
    group.push(tx);
    transactionsByGoal.set(tx.goalId, group);
  }
  rows.savingsGoals = rows.savingsGoals.map(g => ({
    ...g,
    transactions: transactionsByGoal.get(g.id) ?? [],
  }));
  return { rows, plan };
}
