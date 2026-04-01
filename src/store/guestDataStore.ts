import { create } from 'zustand';
import {
    Category,
    CreditCard,
    Expense,
    SavingsGoal,
    SavingsTransaction,
    Subscription,
} from '../types';
import { CATEGORY_DEFAULTS } from '../utils/constants';
import { createSecureStorage, migrateLegacyStringStore } from './secureStorage';

const STORAGE_ID = 'guest-data-storage';
const storage = createSecureStorage(STORAGE_ID);
migrateLegacyStringStore(STORAGE_ID, storage);
const SNAPSHOT_KEY = 'guestDataSnapshot';
const GUEST_USER_ID = 'guest-local';
const SCHEMA_VERSION = 1;

type GuestDataSnapshot = {
    schemaVersion: number;
    categories: Category[];
    expenses: Expense[];
    subscriptions: Subscription[];
    creditCards: CreditCard[];
    savingsGoals: SavingsGoal[];
};

interface GuestDataState {
    isHydrated: boolean;
    categories: Category[];
    expenses: Expense[];
    subscriptions: Subscription[];
    creditCards: CreditCard[];
    savingsGoals: SavingsGoal[];
    hydrate: () => void;
    reset: () => void;
    addCategory: (category: Category) => Category;
    addExpenses: (expenses: Expense[]) => Expense[];
    updateExpense: (id: string, updater: (expense: Expense) => Expense) => Expense | null;
    removeExpenses: (ids: string[]) => string[];
    addSubscription: (subscription: Subscription) => Subscription;
    updateSubscription: (
        id: string,
        updater: (subscription: Subscription) => Subscription,
    ) => Subscription | null;
    removeSubscription: (id: string) => boolean;
    addCreditCard: (card: CreditCard) => CreditCard;
    updateCreditCard: (id: string, updater: (card: CreditCard) => CreditCard) => CreditCard | null;
    removeCreditCard: (id: string) => CreditCard | null;
    addSavingsGoal: (goal: SavingsGoal) => SavingsGoal;
    updateSavingsGoal: (id: string, updater: (goal: SavingsGoal) => SavingsGoal) => SavingsGoal | null;
    removeSavingsGoal: (id: string) => boolean;
    setSavingsTransactions: (goalId: string, transactions: SavingsTransaction[]) => SavingsGoal | null;
}

function createLocalId(prefix: string) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function getGuestUserId() {
    return GUEST_USER_ID;
}

export function createGuestCategoryDefaults(): Category[] {
    return CATEGORY_DEFAULTS.map((item) => ({
        id: createLocalId('category'),
        name: item.name,
        icon: item.icon,
        color: item.color,
        userId: GUEST_USER_ID,
    }));
}

function buildInitialSnapshot(): GuestDataSnapshot {
    return {
        schemaVersion: SCHEMA_VERSION,
        categories: createGuestCategoryDefaults(),
        expenses: [],
        subscriptions: [],
        creditCards: [],
        savingsGoals: [],
    };
}

function normalizeSnapshot(value?: Partial<GuestDataSnapshot> | null): GuestDataSnapshot {
    const base = buildInitialSnapshot();

    if (!value || typeof value !== 'object') {
        return base;
    }

    return {
        schemaVersion: SCHEMA_VERSION,
        categories:
            Array.isArray(value.categories) && value.categories.length > 0
                ? value.categories
                : base.categories,
        expenses: Array.isArray(value.expenses) ? value.expenses : [],
        subscriptions: Array.isArray(value.subscriptions) ? value.subscriptions : [],
        creditCards: Array.isArray(value.creditCards) ? value.creditCards : [],
        savingsGoals: Array.isArray(value.savingsGoals) ? value.savingsGoals : [],
    };
}

function readSnapshot(): GuestDataSnapshot {
    const raw = storage.getString(SNAPSHOT_KEY);
    if (!raw) {
        return buildInitialSnapshot();
    }

    try {
        return normalizeSnapshot(JSON.parse(raw) as GuestDataSnapshot);
    } catch {
        return buildInitialSnapshot();
    }
}

function persistSnapshot(snapshot: GuestDataSnapshot) {
    storage.set(SNAPSHOT_KEY, JSON.stringify(snapshot));
}

function buildSnapshotFromState(state: Pick<
    GuestDataState,
    'categories' | 'expenses' | 'subscriptions' | 'creditCards' | 'savingsGoals'
>): GuestDataSnapshot {
    return {
        schemaVersion: SCHEMA_VERSION,
        categories: state.categories,
        expenses: state.expenses,
        subscriptions: state.subscriptions,
        creditCards: state.creditCards,
        savingsGoals: state.savingsGoals,
    };
}

export const useGuestDataStore = create<GuestDataState>((set, get) => ({
    isHydrated: false,
    categories: [],
    expenses: [],
    subscriptions: [],
    creditCards: [],
    savingsGoals: [],

    hydrate: () => {
        const snapshot = readSnapshot();
        persistSnapshot(snapshot);
        set({
            isHydrated: true,
            categories: snapshot.categories,
            expenses: snapshot.expenses,
            subscriptions: snapshot.subscriptions,
            creditCards: snapshot.creditCards,
            savingsGoals: snapshot.savingsGoals,
        });
    },

    reset: () => {
        const snapshot = buildInitialSnapshot();
        persistSnapshot(snapshot);
        set({
            isHydrated: true,
            categories: snapshot.categories,
            expenses: snapshot.expenses,
            subscriptions: snapshot.subscriptions,
            creditCards: snapshot.creditCards,
            savingsGoals: snapshot.savingsGoals,
        });
    },

    addCategory: (category) => {
        const next = [...get().categories, category];
        const snapshot = buildSnapshotFromState({
            ...get(),
            categories: next,
        });
        persistSnapshot(snapshot);
        set({ categories: next });
        return category;
    },

    addExpenses: (expenses) => {
        const next = [...get().expenses, ...expenses];
        const snapshot = buildSnapshotFromState({
            ...get(),
            expenses: next,
        });
        persistSnapshot(snapshot);
        set({ expenses: next });
        return expenses;
    },

    updateExpense: (id, updater) => {
        let updatedExpense: Expense | null = null;
        const next = get().expenses.map((expense) => {
            if (expense.id !== id) {
                return expense;
            }

            updatedExpense = updater(expense);
            return updatedExpense;
        });

        if (!updatedExpense) {
            return null;
        }

        const snapshot = buildSnapshotFromState({
            ...get(),
            expenses: next,
        });
        persistSnapshot(snapshot);
        set({ expenses: next });
        return updatedExpense;
    },

    removeExpenses: (ids) => {
        const removable = new Set(ids);
        const next = get().expenses.filter((expense) => !removable.has(expense.id));
        const removedIds = get()
            .expenses
            .filter((expense) => removable.has(expense.id))
            .map((expense) => expense.id);
        const snapshot = buildSnapshotFromState({
            ...get(),
            expenses: next,
        });
        persistSnapshot(snapshot);
        set({ expenses: next });
        return removedIds;
    },

    addSubscription: (subscription) => {
        const next = [...get().subscriptions, subscription];
        const snapshot = buildSnapshotFromState({
            ...get(),
            subscriptions: next,
        });
        persistSnapshot(snapshot);
        set({ subscriptions: next });
        return subscription;
    },

    updateSubscription: (id, updater) => {
        let updatedSubscription: Subscription | null = null;
        const next = get().subscriptions.map((subscription) => {
            if (subscription.id !== id) {
                return subscription;
            }

            updatedSubscription = updater(subscription);
            return updatedSubscription;
        });

        if (!updatedSubscription) {
            return null;
        }

        const snapshot = buildSnapshotFromState({
            ...get(),
            subscriptions: next,
        });
        persistSnapshot(snapshot);
        set({ subscriptions: next });
        return updatedSubscription;
    },

    removeSubscription: (id) => {
        const next = get().subscriptions.filter((subscription) => subscription.id !== id);
        if (next.length === get().subscriptions.length) {
            return false;
        }

        const snapshot = buildSnapshotFromState({
            ...get(),
            subscriptions: next,
        });
        persistSnapshot(snapshot);
        set({ subscriptions: next });
        return true;
    },

    addCreditCard: (card) => {
        const next = [...get().creditCards, card];
        const snapshot = buildSnapshotFromState({
            ...get(),
            creditCards: next,
        });
        persistSnapshot(snapshot);
        set({ creditCards: next });
        return card;
    },

    updateCreditCard: (id, updater) => {
        let updatedCard: CreditCard | null = null;
        const next = get().creditCards.map((card) => {
            if (card.id !== id) {
                return card;
            }

            updatedCard = updater(card);
            return updatedCard;
        });

        if (!updatedCard) {
            return null;
        }

        const snapshot = buildSnapshotFromState({
            ...get(),
            creditCards: next,
        });
        persistSnapshot(snapshot);
        set({ creditCards: next });
        return updatedCard;
    },

    removeCreditCard: (id) => {
        const existingCard = get().creditCards.find((card) => card.id === id) ?? null;
        if (!existingCard) {
            return null;
        }

        const next = get().creditCards.filter((card) => card.id !== id);
        const snapshot = buildSnapshotFromState({
            ...get(),
            creditCards: next,
        });
        persistSnapshot(snapshot);
        set({ creditCards: next });
        return existingCard;
    },

    addSavingsGoal: (goal) => {
        const next = [...get().savingsGoals, goal];
        const snapshot = buildSnapshotFromState({
            ...get(),
            savingsGoals: next,
        });
        persistSnapshot(snapshot);
        set({ savingsGoals: next });
        return goal;
    },

    updateSavingsGoal: (id, updater) => {
        let updatedGoal: SavingsGoal | null = null;
        const next = get().savingsGoals.map((goal) => {
            if (goal.id !== id) {
                return goal;
            }

            updatedGoal = updater(goal);
            return updatedGoal;
        });

        if (!updatedGoal) {
            return null;
        }

        const snapshot = buildSnapshotFromState({
            ...get(),
            savingsGoals: next,
        });
        persistSnapshot(snapshot);
        set({ savingsGoals: next });
        return updatedGoal;
    },

    removeSavingsGoal: (id) => {
        const next = get().savingsGoals.filter((goal) => goal.id !== id);
        if (next.length === get().savingsGoals.length) {
            return false;
        }

        const snapshot = buildSnapshotFromState({
            ...get(),
            savingsGoals: next,
        });
        persistSnapshot(snapshot);
        set({ savingsGoals: next });
        return true;
    },

    setSavingsTransactions: (goalId, transactions) => {
        let updatedGoal: SavingsGoal | null = null;
        const next = get().savingsGoals.map((goal) => {
            if (goal.id !== goalId) {
                return goal;
            }

            updatedGoal = {
                ...goal,
                transactions,
                updatedAt: new Date().toISOString(),
            };
            return updatedGoal;
        });

        if (!updatedGoal) {
            return null;
        }

        const snapshot = buildSnapshotFromState({
            ...get(),
            savingsGoals: next,
        });
        persistSnapshot(snapshot);
        set({ savingsGoals: next });
        return updatedGoal;
    },
}));

export function ensureGuestDataHydrated() {
    const state = useGuestDataStore.getState();
    if (!state.isHydrated) {
        state.hydrate();
    }

    return useGuestDataStore.getState();
}
