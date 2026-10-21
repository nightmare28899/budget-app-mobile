import type {
    BackupCategory,
    BackupCreditCard,
    BackupExpense,
    BackupIncome,
    BackupPayload,
    BackupSavingsGoal,
    BackupSavingsTransaction,
    BackupSettings,
    BackupSubscription,
} from '../../../../src/modules/backup';

/** Small, internally consistent payload (all ids resolve, all values already clean). Mirrors the Compose test fixtures. */
export function category(overrides: Partial<BackupCategory> = {}): BackupCategory {
    return { id: 'cat-1', name: 'Food', icon: 'restaurant', color: '#FF8800', budgetAmount: 1500.5, ...overrides };
}

export function card(overrides: Partial<BackupCreditCard> = {}): BackupCreditCard {
    return {
        id: 'card-1', name: 'Main', bank: 'Bank', brand: 'VISA', last4: '1234', color: '#112233',
        creditLimit: 20000, closingDay: 10, paymentDueDay: 28, currency: 'MXN', isActive: true,
        createdAtMillis: 1000, updatedAtMillis: 2000, ...overrides,
    };
}

export function subscription(overrides: Partial<BackupSubscription> = {}): BackupSubscription {
    return {
        id: 'sub-1', name: 'Streaming', cost: 199, currency: 'MXN', billingCycle: 'monthly',
        nextPaymentEpochDay: 20000, anchorEpochDay: 19990, reminderDays: 3, isActive: true,
        paymentMethod: 'CREDIT_CARD', categoryId: 'cat-1', hexColor: '#AA00FF',
        logoUrl: 'https://example.com/logo.png', createdAtMillis: 1000, updatedAtMillis: 2000,
        creditCardId: 'card-1', ...overrides,
    };
}

export function expense(overrides: Partial<BackupExpense> = {}): BackupExpense {
    return {
        id: 'exp-1', title: 'Coffee', cost: 45.5, currency: 'MXN', dateMillis: 1_700_000_000_000,
        merchantName: 'Cafe', locationLabel: 'CDMX', note: 'line1\nline2', paymentMethod: 'CREDIT_CARD',
        creditCardId: 'card-1', categoryId: 'cat-1', isInstallment: true, installmentGroupId: 'grp',
        installmentCount: 3, installmentIndex: 1, installmentTotalAmount: 136.5,
        createdAtMillis: 1000, updatedAtMillis: 2000, subscriptionId: 'sub-1', ...overrides,
    };
}

export function income(overrides: Partial<BackupIncome> = {}): BackupIncome {
    return {
        id: 'inc-1', title: 'Salary', amount: 3000, currency: 'USD', dateMillis: 1_700_000_000_000,
        note: null, createdAtMillis: 1000, updatedAtMillis: 2000, ...overrides,
    };
}

export function goal(overrides: Partial<BackupSavingsGoal> = {}): BackupSavingsGoal {
    return {
        id: 'goal-1', title: 'Trip', targetAmount: 10000, currentAmount: 2500, targetEpochDay: 20500,
        icon: 'flight', color: '#00AA00', createdAtMillis: 1000, updatedAtMillis: 2000, ...overrides,
    };
}

export function goalTx(overrides: Partial<BackupSavingsTransaction> = {}): BackupSavingsTransaction {
    return { id: 'gtx-1', goalId: 'goal-1', amount: 500, type: 'DEPOSIT', createdAtMillis: 1500, ...overrides };
}

export function settings(overrides: Partial<BackupSettings> = {}): BackupSettings {
    return {
        themeMode: 'dark', language: 'es', currency: 'EUR', budgetAmount: 9000, budgetPeriod: 'period',
        budgetPeriodStart: '2026-01-01', budgetPeriodEnd: '2026-01-31', guestName: 'Ana',
        dynamicColor: true, reminderLeadDays: 3, ...overrides,
    };
}

export function emptyPayload(): BackupPayload {
    return {
        categories: [], creditCards: [], subscriptions: [], expenses: [], incomes: [],
        savingsGoals: [], savingsTransactions: [], settings: null,
    };
}

export function payload(overrides: Partial<BackupPayload> = {}): BackupPayload {
    return {
        categories: [category()],
        creditCards: [card()],
        subscriptions: [subscription()],
        expenses: [
            expense(),
            expense({ id: 'exp-2', currency: 'USD', cost: 10, creditCardId: null, subscriptionId: null }),
        ],
        incomes: [income()],
        savingsGoals: [goal()],
        savingsTransactions: [goalTx()],
        settings: settings(),
        ...overrides,
    };
}
