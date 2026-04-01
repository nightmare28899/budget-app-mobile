import apiClient from './client';
import {
    AddSavingsFundsPayload,
    CreateSavingsGoalPayload,
    DeleteSavingsGoalResponse,
    SavingsFundsResponse,
    SavingsGoal,
    SavingsTransaction,
    UpdateSavingsGoalPayload,
    WithdrawSavingsFundsPayload,
} from '../types';
import { toNum } from '../utils/number';
import { isLocalMode } from '../modules/access/localMode';
import { ensureGuestDataHydrated } from '../store/guestDataStore';
import { useAuthStore } from '../store/authStore';

function requireSavingsGoalId(goalId: string): string {
    const normalized = goalId.trim();
    if (!normalized) {
        throw new Error('Savings goal id is required');
    }

    return normalized;
}

function normalizeSavingsTransaction(item: any): SavingsTransaction {
    return {
        id: String(item?.id ?? ''),
        amount: toNum(item?.amount),
        type: item?.type === 'WITHDRAW' ? 'WITHDRAW' : 'DEPOSIT',
        goalId: String(item?.goalId ?? item?.goal?.id ?? ''),
        createdAt:
            typeof item?.createdAt === 'string'
                ? item.createdAt
                : new Date().toISOString(),
    };
}

function normalizeSavingsGoal(item: any): SavingsGoal {
    return {
        id: String(item?.id ?? ''),
        title: typeof item?.title === 'string' ? item.title : '',
        targetAmount: toNum(item?.targetAmount),
        currentAmount: toNum(item?.currentAmount),
        targetDate:
            typeof item?.targetDate === 'string'
                ? item.targetDate
                : null,
        icon:
            typeof item?.icon === 'string' && item.icon.trim()
                ? item.icon
                : null,
        color:
            typeof item?.color === 'string' && item.color.trim()
                ? item.color
                : null,
        userId: typeof item?.userId === 'string' ? item.userId : '',
        createdAt:
            typeof item?.createdAt === 'string'
                ? item.createdAt
                : new Date().toISOString(),
        updatedAt:
            typeof item?.updatedAt === 'string'
                ? item.updatedAt
                : new Date().toISOString(),
        transactions: Array.isArray(item?.transactions)
            ? item.transactions.map(normalizeSavingsTransaction)
            : [],
    };
}

export async function getSavingsGoals(): Promise<SavingsGoal[]> {
    if (isLocalMode()) {
        const { savingsGoals } = ensureGuestDataHydrated();
        return savingsGoals.map(normalizeSavingsGoal);
    }

    const { data } = await apiClient.get('/savings/goals');
    return Array.isArray(data) ? data.map(normalizeSavingsGoal) : [];
}

export async function createSavingsGoal(
    payload: CreateSavingsGoalPayload,
): Promise<SavingsGoal> {
    if (isLocalMode()) {
        const state = ensureGuestDataHydrated();
        const goal = normalizeSavingsGoal({
            ...payload,
            id: `goal_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
            currentAmount: 0,
            userId: useAuthStore.getState().user?.id ?? 'guest-local',
            transactions: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });
        return state.addSavingsGoal(goal);
    }

    const { data } = await apiClient.post('/savings/goals', payload);
    return normalizeSavingsGoal(data);
}

export async function addSavingsFunds(
    goalId: string,
    payload: AddSavingsFundsPayload,
): Promise<SavingsFundsResponse> {
    const normalizedGoalId = requireSavingsGoalId(goalId);
    if (isLocalMode()) {
        const state = ensureGuestDataHydrated();
        const goal = state.savingsGoals.find((item) => item.id === normalizedGoalId);
        if (!goal) {
            throw new Error('Savings goal not found');
        }

        const transaction = normalizeSavingsTransaction({
            id: `txn_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
            amount: payload.amount,
            type: 'DEPOSIT',
            goalId: normalizedGoalId,
            createdAt: new Date().toISOString(),
        });
        const nextTransactions = [...(goal.transactions ?? []), transaction];
        state.setSavingsTransactions(normalizedGoalId, nextTransactions);
        const updatedGoal = state.updateSavingsGoal(normalizedGoalId, (currentGoal) => ({
            ...currentGoal,
            currentAmount: toNum(currentGoal.currentAmount) + toNum(payload.amount),
            transactions: nextTransactions,
            updatedAt: new Date().toISOString(),
        }));

        if (!updatedGoal) {
            throw new Error('Savings goal not found');
        }

        return {
            transaction,
            goal: updatedGoal,
        };
    }

    const { data } = await apiClient.post(`/savings/goals/${normalizedGoalId}/funds`, payload);

    return {
        transaction: normalizeSavingsTransaction(data?.deposit ?? data?.transaction ?? data),
        goal: normalizeSavingsGoal(data?.goal ?? data),
    };
}

export async function withdrawSavingsFunds(
    goalId: string,
    payload: WithdrawSavingsFundsPayload,
): Promise<SavingsFundsResponse> {
    const normalizedGoalId = requireSavingsGoalId(goalId);
    if (isLocalMode()) {
        const state = ensureGuestDataHydrated();
        const goal = state.savingsGoals.find((item) => item.id === normalizedGoalId);
        if (!goal) {
            throw new Error('Savings goal not found');
        }

        if (toNum(payload.amount) > toNum(goal.currentAmount)) {
            throw new Error('Insufficient saved balance');
        }

        const transaction = normalizeSavingsTransaction({
            id: `txn_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
            amount: payload.amount,
            type: 'WITHDRAW',
            goalId: normalizedGoalId,
            createdAt: new Date().toISOString(),
        });
        const nextTransactions = [...(goal.transactions ?? []), transaction];
        state.setSavingsTransactions(normalizedGoalId, nextTransactions);
        const updatedGoal = state.updateSavingsGoal(normalizedGoalId, (currentGoal) => ({
            ...currentGoal,
            currentAmount: Math.max(
                0,
                toNum(currentGoal.currentAmount) - toNum(payload.amount),
            ),
            transactions: nextTransactions,
            updatedAt: new Date().toISOString(),
        }));

        if (!updatedGoal) {
            throw new Error('Savings goal not found');
        }

        return {
            transaction,
            goal: updatedGoal,
        };
    }

    const { data } = await apiClient.post(
        `/savings/goals/${normalizedGoalId}/withdraw`,
        payload,
    );

    return {
        transaction: normalizeSavingsTransaction(
            data?.withdrawal ?? data?.transaction ?? data,
        ),
        goal: normalizeSavingsGoal(data?.goal ?? data),
    };
}

export async function getSavingsTransactions(
    goalId: string,
): Promise<SavingsTransaction[]> {
    const normalizedGoalId = requireSavingsGoalId(goalId);
    if (isLocalMode()) {
        const { savingsGoals } = ensureGuestDataHydrated();
        const goal = savingsGoals.find((item) => item.id === normalizedGoalId);
        return (goal?.transactions ?? []).map(normalizeSavingsTransaction);
    }

    const { data } = await apiClient.get(`/savings/goals/${normalizedGoalId}/transactions`);
    return Array.isArray(data) ? data.map(normalizeSavingsTransaction) : [];
}

export async function updateSavingsGoal(
    goalId: string,
    payload: UpdateSavingsGoalPayload,
): Promise<SavingsGoal> {
    const normalizedGoalId = requireSavingsGoalId(goalId);
    if (isLocalMode()) {
        const state = ensureGuestDataHydrated();
        const updated = state.updateSavingsGoal(normalizedGoalId, (goal) =>
            normalizeSavingsGoal({
                ...goal,
                ...payload,
                updatedAt: new Date().toISOString(),
            }),
        );

        if (!updated) {
            throw new Error('Savings goal not found');
        }

        return updated;
    }

    const { data } = await apiClient.patch(`/savings/goals/${normalizedGoalId}`, payload);
    return normalizeSavingsGoal(data);
}

export async function deleteSavingsGoal(
    goalId: string,
): Promise<DeleteSavingsGoalResponse> {
    const normalizedGoalId = requireSavingsGoalId(goalId);
    if (isLocalMode()) {
        const state = ensureGuestDataHydrated();
        return {
            success: state.removeSavingsGoal(normalizedGoalId),
        };
    }

    const { data } = await apiClient.delete(`/savings/goals/${normalizedGoalId}`);
    return {
        success: data?.success !== false,
    };
}

export const savingsApi = {
    getSavingsGoals,
    createSavingsGoal,
    addSavingsFunds,
    withdrawSavingsFunds,
    getSavingsTransactions,
    updateSavingsGoal,
    deleteSavingsGoal,
};
