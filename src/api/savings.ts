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
    const { data } = await apiClient.get('/savings/goals');
    return Array.isArray(data) ? data.map(normalizeSavingsGoal) : [];
}

export async function createSavingsGoal(
    payload: CreateSavingsGoalPayload,
): Promise<SavingsGoal> {
    const { data } = await apiClient.post('/savings/goals', payload);
    return normalizeSavingsGoal(data);
}

export async function addSavingsFunds(
    goalId: string,
    payload: AddSavingsFundsPayload,
): Promise<SavingsFundsResponse> {
    const normalizedGoalId = requireSavingsGoalId(goalId);
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
    const { data } = await apiClient.get(`/savings/goals/${normalizedGoalId}/transactions`);
    return Array.isArray(data) ? data.map(normalizeSavingsTransaction) : [];
}

export async function updateSavingsGoal(
    goalId: string,
    payload: UpdateSavingsGoalPayload,
): Promise<SavingsGoal> {
    const normalizedGoalId = requireSavingsGoalId(goalId);
    const { data } = await apiClient.patch(`/savings/goals/${normalizedGoalId}`, payload);
    return normalizeSavingsGoal(data);
}

export async function deleteSavingsGoal(
    goalId: string,
): Promise<DeleteSavingsGoalResponse> {
    const normalizedGoalId = requireSavingsGoalId(goalId);
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
