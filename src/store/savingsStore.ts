import { create } from 'zustand';
import {
    addSavingsFunds,
    createSavingsGoal,
    deleteSavingsGoal as deleteSavingsGoalRequest,
    getSavingsGoals,
    getSavingsTransactions,
    updateSavingsGoal as updateSavingsGoalRequest,
    withdrawSavingsFunds,
} from '../api/resources/savings';
import {
    AddSavingsFundsPayload,
    CreateSavingsGoalPayload,
    DeleteSavingsGoalResponse,
    SavingsFundsResponse,
    SavingsGoal,
    SavingsTransaction,
    UpdateSavingsGoalPayload,
    WithdrawSavingsFundsPayload,
} from '../types/index';
import {
    extractApiMessage,
    getApiErrorData,
    getErrorMessage,
} from '../utils/platform/api';
import {
    mergeSavingsTransactions,
    sortSavingsGoals,
    sortSavingsTransactions,
} from '../utils/domain/savings';

type SavingsErrorAction =
    | 'loadGoals'
    | 'createGoal'
    | 'addFunds'
    | 'withdrawFunds'
    | 'updateGoal'
    | 'deleteGoal'
    | 'loadTransactions';

type SavingsErrors = {
    loadGoals: string | null;
    createGoal: string | null;
    addFunds: string | null;
    withdrawFunds: string | null;
    updateGoal: string | null;
    deleteGoal: string | null;
    loadTransactionsByGoal: Record<string, string | null>;
};

interface SavingsState {
    goals: SavingsGoal[];
    transactionsByGoal: Record<string, SavingsTransaction[]>;
    isLoadingGoals: boolean;
    isCreatingGoal: boolean;
    isAddingFunds: boolean;
    isWithdrawingFunds: boolean;
    isUpdatingGoal: boolean;
    isDeletingGoal: boolean;
    isLoadingTransactions: boolean;
    loadingTransactionsGoalId: string | null;
    errors: SavingsErrors;
    fetchGoals: (options?: { silent?: boolean }) => Promise<SavingsGoal[]>;
    createGoal: (payload: CreateSavingsGoalPayload) => Promise<SavingsGoal>;
    addFunds: (
        goalId: string,
        payload: AddSavingsFundsPayload,
    ) => Promise<SavingsFundsResponse>;
    withdrawFunds: (
        goalId: string,
        payload: WithdrawSavingsFundsPayload,
    ) => Promise<SavingsFundsResponse>;
    updateGoal: (
        goalId: string,
        payload: UpdateSavingsGoalPayload,
    ) => Promise<SavingsGoal>;
    deleteGoal: (goalId: string) => Promise<DeleteSavingsGoalResponse>;
    fetchTransactions: (
        goalId: string,
        options?: { silent?: boolean },
    ) => Promise<SavingsTransaction[]>;
    clearError: (action: SavingsErrorAction, goalId?: string) => void;
    reset: () => void;
}

function getRequestErrorMessage(error: unknown): string | null {
    const payload = getApiErrorData(error);
    const apiMessage = extractApiMessage(payload);

    if (apiMessage) {
        return apiMessage;
    }

    const message = getErrorMessage(error) ?? '';

    if (!message) {
        return null;
    }

    if (message === 'Network Error') {
        return message;
    }

    if (/^Request failed with status code \d{3}$/i.test(message)) {
        return null;
    }

    return message;
}

function mergeGoalCollections(
    currentGoals: SavingsGoal[],
    incomingGoals: SavingsGoal[],
): SavingsGoal[] {
    const merged = new Map<string, SavingsGoal>();

    for (const goal of currentGoals) {
        merged.set(goal.id, goal);
    }

    for (const goal of incomingGoals) {
        const currentGoal = merged.get(goal.id);
        merged.set(goal.id, {
            ...currentGoal,
            ...goal,
            transactions:
                goal.transactions && goal.transactions.length > 0
                    ? mergeSavingsTransactions(currentGoal?.transactions ?? [], goal.transactions)
                    : currentGoal?.transactions ?? [],
        });
    }

    return sortSavingsGoals(Array.from(merged.values()));
}

function mergeGoalTransactions(
    currentTransactionsByGoal: Record<string, SavingsTransaction[]>,
    goals: SavingsGoal[],
): Record<string, SavingsTransaction[]> {
    const nextTransactionsByGoal = { ...currentTransactionsByGoal };

    for (const goal of goals) {
        if (!Array.isArray(goal.transactions)) {
            continue;
        }

        nextTransactionsByGoal[goal.id] = mergeSavingsTransactions(
            currentTransactionsByGoal[goal.id] ?? [],
            goal.transactions,
        );
    }

    return nextTransactionsByGoal;
}

function upsertGoal(
    currentGoals: SavingsGoal[],
    nextGoal: SavingsGoal,
    nextTransactions?: SavingsTransaction[],
): SavingsGoal[] {
    const existingGoal = currentGoals.find((goal) => goal.id === nextGoal.id);
    const mergedGoal: SavingsGoal = {
        ...existingGoal,
        ...nextGoal,
        transactions:
            nextTransactions
            ?? nextGoal.transactions
            ?? existingGoal?.transactions
            ?? [],
    };

    return sortSavingsGoals([
        mergedGoal,
        ...currentGoals.filter((goal) => goal.id !== nextGoal.id),
    ]);
}

const initialErrors = (): SavingsErrors => ({
    loadGoals: null,
    createGoal: null,
    addFunds: null,
    withdrawFunds: null,
    updateGoal: null,
    deleteGoal: null,
    loadTransactionsByGoal: {},
});

export const useSavingsStore = create<SavingsState>((set, get) => ({
    goals: [],
    transactionsByGoal: {},
    isLoadingGoals: false,
    isCreatingGoal: false,
    isAddingFunds: false,
    isWithdrawingFunds: false,
    isUpdatingGoal: false,
    isDeletingGoal: false,
    isLoadingTransactions: false,
    loadingTransactionsGoalId: null,
    errors: initialErrors(),

    fetchGoals: async ({ silent = false } = {}) => {
        if (!silent) {
            set((state) => ({
                isLoadingGoals: true,
                errors: {
                    ...state.errors,
                    loadGoals: null,
                },
            }));
        } else {
            set((state) => ({
                errors: {
                    ...state.errors,
                    loadGoals: null,
                },
            }));
        }

        try {
            const goals = await getSavingsGoals();
            set((state) => ({
                goals: mergeGoalCollections(state.goals, goals),
                transactionsByGoal: mergeGoalTransactions(
                    state.transactionsByGoal,
                    goals,
                ),
            }));
            return goals;
        } catch (error) {
            const message = getRequestErrorMessage(error);
            set((state) => ({
                errors: {
                    ...state.errors,
                    loadGoals: message,
                },
            }));
            throw error;
        } finally {
            if (!silent) {
                set({ isLoadingGoals: false });
            }
        }
    },

    createGoal: async (payload) => {
        if (get().isCreatingGoal) {
            throw new Error('Savings goal creation already in progress');
        }

        set((state) => ({
            isCreatingGoal: true,
            errors: {
                ...state.errors,
                createGoal: null,
            },
        }));

        try {
            const goal = await createSavingsGoal(payload);
            set((state) => ({
                goals: upsertGoal(state.goals, goal, []),
                transactionsByGoal: {
                    ...state.transactionsByGoal,
                    [goal.id]: state.transactionsByGoal[goal.id] ?? [],
                },
            }));

            get().fetchGoals({ silent: true }).catch(() => undefined);
            return goal;
        } catch (error) {
            const message = getRequestErrorMessage(error);
            set((state) => ({
                errors: {
                    ...state.errors,
                    createGoal: message,
                },
            }));
            throw error;
        } finally {
            set({ isCreatingGoal: false });
        }
    },

    addFunds: async (goalId, payload) => {
        if (get().isAddingFunds) {
            throw new Error('Savings deposit already in progress');
        }

        set((state) => ({
            isAddingFunds: true,
            errors: {
                ...state.errors,
                addFunds: null,
            },
        }));

        try {
            const result = await addSavingsFunds(goalId, payload);
            set((state) => {
                const currentTransactions = state.transactionsByGoal[goalId] ?? [];
                const mergedTransactions = mergeSavingsTransactions(
                    currentTransactions,
                    [result.transaction],
                );

                return {
                    goals: upsertGoal(
                        state.goals,
                        result.goal,
                        mergedTransactions.slice(0, 10),
                    ),
                    transactionsByGoal: {
                        ...state.transactionsByGoal,
                        [goalId]: mergedTransactions,
                    },
                };
            });

            get().fetchGoals({ silent: true }).catch(() => undefined);
            get().fetchTransactions(goalId, { silent: true }).catch(() => undefined);

            return result;
        } catch (error) {
            const message = getRequestErrorMessage(error);
            set((state) => ({
                errors: {
                    ...state.errors,
                    addFunds: message,
                },
            }));
            throw error;
        } finally {
            set({ isAddingFunds: false });
        }
    },

    withdrawFunds: async (goalId, payload) => {
        if (get().isWithdrawingFunds) {
            throw new Error('Savings withdrawal already in progress');
        }

        set((state) => ({
            isWithdrawingFunds: true,
            errors: {
                ...state.errors,
                withdrawFunds: null,
            },
        }));

        try {
            const result = await withdrawSavingsFunds(goalId, payload);
            set((state) => {
                const currentTransactions = state.transactionsByGoal[goalId] ?? [];
                const mergedTransactions = mergeSavingsTransactions(
                    currentTransactions,
                    [result.transaction],
                );

                return {
                    goals: upsertGoal(
                        state.goals,
                        result.goal,
                        mergedTransactions.slice(0, 10),
                    ),
                    transactionsByGoal: {
                        ...state.transactionsByGoal,
                        [goalId]: mergedTransactions,
                    },
                };
            });

            get().fetchGoals({ silent: true }).catch(() => undefined);
            get().fetchTransactions(goalId, { silent: true }).catch(() => undefined);

            return result;
        } catch (error) {
            const message = getRequestErrorMessage(error);
            set((state) => ({
                errors: {
                    ...state.errors,
                    withdrawFunds: message,
                },
            }));
            throw error;
        } finally {
            set({ isWithdrawingFunds: false });
        }
    },

    updateGoal: async (goalId, payload) => {
        if (get().isUpdatingGoal) {
            throw new Error('Savings goal update already in progress');
        }

        set((state) => ({
            isUpdatingGoal: true,
            errors: {
                ...state.errors,
                updateGoal: null,
            },
        }));

        try {
            const goal = await updateSavingsGoalRequest(goalId, payload);
            set((state) => {
                const existingGoal = state.goals.find((item) => item.id === goalId);
                const nextTransactions = goal.transactions && goal.transactions.length > 0
                    ? mergeSavingsTransactions(
                        state.transactionsByGoal[goalId] ?? [],
                        goal.transactions,
                    )
                    : state.transactionsByGoal[goalId]
                        ?? existingGoal?.transactions
                        ?? [];

                return {
                    goals: upsertGoal(state.goals, goal, nextTransactions),
                    transactionsByGoal: {
                        ...state.transactionsByGoal,
                        [goalId]: nextTransactions,
                    },
                };
            });

            get().fetchGoals({ silent: true }).catch(() => undefined);
            return goal;
        } catch (error) {
            const message = getRequestErrorMessage(error);
            set((state) => ({
                errors: {
                    ...state.errors,
                    updateGoal: message,
                },
            }));
            throw error;
        } finally {
            set({ isUpdatingGoal: false });
        }
    },

    deleteGoal: async (goalId) => {
        if (get().isDeletingGoal) {
            throw new Error('Savings goal deletion already in progress');
        }

        set((state) => ({
            isDeletingGoal: true,
            errors: {
                ...state.errors,
                deleteGoal: null,
            },
        }));

        try {
            const result = await deleteSavingsGoalRequest(goalId);
            set((state) => {
                const nextTransactionsByGoal = { ...state.transactionsByGoal };
                delete nextTransactionsByGoal[goalId];

                return {
                    goals: state.goals.filter((item) => item.id !== goalId),
                    transactionsByGoal: nextTransactionsByGoal,
                };
            });

            get().fetchGoals({ silent: true }).catch(() => undefined);
            return result;
        } catch (error) {
            const message = getRequestErrorMessage(error);
            set((state) => ({
                errors: {
                    ...state.errors,
                    deleteGoal: message,
                },
            }));
            throw error;
        } finally {
            set({ isDeletingGoal: false });
        }
    },

    fetchTransactions: async (goalId, { silent = false } = {}) => {
        if (!silent) {
            set((state) => ({
                isLoadingTransactions: true,
                loadingTransactionsGoalId: goalId,
                errors: {
                    ...state.errors,
                    loadTransactionsByGoal: {
                        ...state.errors.loadTransactionsByGoal,
                        [goalId]: null,
                    },
                },
            }));
        } else {
            set((state) => ({
                errors: {
                    ...state.errors,
                    loadTransactionsByGoal: {
                        ...state.errors.loadTransactionsByGoal,
                        [goalId]: null,
                    },
                },
            }));
        }

        try {
            const transactions = sortSavingsTransactions(
                await getSavingsTransactions(goalId),
            );

            set((state) => ({
                transactionsByGoal: {
                    ...state.transactionsByGoal,
                    [goalId]: transactions,
                },
                goals: state.goals.map((goal) =>
                    goal.id === goalId
                        ? {
                            ...goal,
                            transactions: transactions.slice(0, 10),
                        }
                        : goal,
                ),
            }));

            return transactions;
        } catch (error) {
            const message = getRequestErrorMessage(error);
            set((state) => ({
                errors: {
                    ...state.errors,
                    loadTransactionsByGoal: {
                        ...state.errors.loadTransactionsByGoal,
                        [goalId]: message,
                    },
                },
            }));
            throw error;
        } finally {
            if (!silent) {
                set((state) => ({
                    isLoadingTransactions:
                        state.loadingTransactionsGoalId === goalId
                            ? false
                            : state.isLoadingTransactions,
                    loadingTransactionsGoalId:
                        state.loadingTransactionsGoalId === goalId
                            ? null
                            : state.loadingTransactionsGoalId,
                }));
            }
        }
    },

    clearError: (action, goalId) => {
        set((state) => {
            if (action === 'loadTransactions' && goalId) {
                return {
                    errors: {
                        ...state.errors,
                        loadTransactionsByGoal: {
                            ...state.errors.loadTransactionsByGoal,
                            [goalId]: null,
                        },
                    },
                };
            }

            if (action === 'loadGoals') {
                return {
                    errors: {
                        ...state.errors,
                        loadGoals: null,
                    },
                };
            }

            if (action === 'createGoal') {
                return {
                    errors: {
                        ...state.errors,
                        createGoal: null,
                    },
                };
            }

            if (action === 'withdrawFunds') {
                return {
                    errors: {
                        ...state.errors,
                        withdrawFunds: null,
                    },
                };
            }

            if (action === 'updateGoal') {
                return {
                    errors: {
                        ...state.errors,
                        updateGoal: null,
                    },
                };
            }

            if (action === 'deleteGoal') {
                return {
                    errors: {
                        ...state.errors,
                        deleteGoal: null,
                    },
                };
            }

            return {
                errors: {
                    ...state.errors,
                    addFunds: null,
                },
            };
        });
    },

    reset: () =>
        set({
            goals: [],
            transactionsByGoal: {},
            isLoadingGoals: false,
            isCreatingGoal: false,
            isAddingFunds: false,
            isWithdrawingFunds: false,
            isUpdatingGoal: false,
            isDeletingGoal: false,
            isLoadingTransactions: false,
            loadingTransactionsGoalId: null,
            errors: initialErrors(),
        }),
}));
