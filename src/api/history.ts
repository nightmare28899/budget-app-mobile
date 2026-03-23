import apiClient from './client';
import { expensesApi } from './expenses';
import { subscriptionsApi } from './subscriptions';
import { usersApi } from './users';
import { normalizeExpense } from './expenses';
import { normalizeSubscription } from './subscriptions';
import {
    Expense,
    HistoryPayload,
    HistorySummary,
    Subscription,
    User,
} from '../types';
import { toNum } from '../utils/number';

function normalizeUser(raw: any): User | null {
    if (!raw || typeof raw !== 'object') {
        return null;
    }

    return {
        ...raw,
        dailyBudget: toNum(raw?.dailyBudget),
        budgetAmount: toNum(raw?.budgetAmount ?? raw?.dailyBudget),
    } as User;
}

function normalizeSummary(
    rawSummary: any,
    expensesTotal: number,
    subscriptionsTotal: number,
    expenseCount: number,
    subscriptionCount: number,
): HistorySummary {
    return {
        expenseCount: toNum(rawSummary?.expenseCount ?? rawSummary?.expensesCount ?? expenseCount),
        subscriptionCount: toNum(
            rawSummary?.subscriptionCount ?? rawSummary?.subscriptionsCount ?? subscriptionCount,
        ),
        totalExpenses: toNum(rawSummary?.totalExpenses ?? rawSummary?.expensesTotal ?? expensesTotal),
        totalSubscriptions: toNum(
            rawSummary?.totalSubscriptions ?? rawSummary?.subscriptionsTotal ?? subscriptionsTotal,
        ),
        total: toNum(rawSummary?.total ?? expensesTotal + subscriptionsTotal),
    };
}

function extractHistoryPayload(raw: any): any {
    if (!raw || typeof raw !== 'object') {
        return {};
    }

    if (
        Object.prototype.hasOwnProperty.call(raw, 'user') ||
        Object.prototype.hasOwnProperty.call(raw, 'summary') ||
        Object.prototype.hasOwnProperty.call(raw, 'expenses') ||
        Object.prototype.hasOwnProperty.call(raw, 'subscriptions')
    ) {
        return raw;
    }

    if (raw.data && typeof raw.data === 'object') {
        return extractHistoryPayload(raw.data);
    }

    if (raw.result && typeof raw.result === 'object') {
        return extractHistoryPayload(raw.result);
    }

    if (raw.payload && typeof raw.payload === 'object') {
        return extractHistoryPayload(raw.payload);
    }

    if (raw.history && typeof raw.history === 'object') {
        return extractHistoryPayload(raw.history);
    }

    return raw;
}

function hasHistoryShape(raw: any): boolean {
    if (!raw || typeof raw !== 'object') {
        return false;
    }

    return (
        Object.prototype.hasOwnProperty.call(raw, 'user') ||
        Object.prototype.hasOwnProperty.call(raw, 'summary') ||
        Array.isArray(raw.expenses) ||
        Array.isArray(raw.subscriptions)
    );
}

function normalizeHistoryPayload(rawPayload: any): HistoryPayload {
    const payload = extractHistoryPayload(rawPayload);
    const expenses: Expense[] = Array.isArray(payload?.expenses)
        ? payload.expenses.map(normalizeExpense)
        : [];
    const subscriptions: Subscription[] = Array.isArray(payload?.subscriptions)
        ? payload.subscriptions.map(normalizeSubscription)
        : [];

    const expensesTotal = expenses.reduce(
        (sum: number, item) => sum + toNum(item.cost),
        0,
    );
    const subscriptionsTotal = subscriptions.reduce(
        (sum: number, item) => sum + toNum(item.cost),
        0,
    );

    return {
        user: normalizeUser(payload?.user),
        summary: normalizeSummary(
            payload?.summary,
            expensesTotal,
            subscriptionsTotal,
            expenses.length,
            subscriptions.length,
        ),
        expenses,
        subscriptions,
    };
}

export const historyApi = {
    getAll: async () => {
        try {
            const { data } = await apiClient.get('/history');
            const extracted = extractHistoryPayload(data);
            if (hasHistoryShape(extracted)) {
                return normalizeHistoryPayload(extracted);
            }
        } catch (error) {
            console.error('Failed to fetch history', error);
        }

        const [userResult, expensesResult, subscriptionsResult] = await Promise.allSettled([
            usersApi.getMe(),
            expensesApi.getAllPages(),
            subscriptionsApi.getAll(),
        ]);

        const user =
            userResult.status === 'fulfilled'
                ? normalizeUser(userResult.value)
                : null;
        const expenses =
            expensesResult.status === 'fulfilled'
                ? expensesResult.value.expenses
                : [];
        const subscriptions =
            subscriptionsResult.status === 'fulfilled'
                ? subscriptionsResult.value
                : [];

        const expensesTotal = expenses.reduce(
            (sum: number, item) => sum + toNum(item.cost),
            0,
        );
        const subscriptionsTotal = subscriptions.reduce(
            (sum: number, item) => sum + toNum(item.cost),
            0,
        );

        return {
            user,
            summary: normalizeSummary(
                null,
                expensesTotal,
                subscriptionsTotal,
                expenses.length,
                subscriptions.length,
            ),
            expenses,
            subscriptions,
        };
    },
};
