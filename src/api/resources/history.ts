import apiClient from '../client';
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
} from '../../types/index';
import { normalizeCurrencyTotals } from '../../utils/domain/currency';
import { toNum } from '../../utils/core/number';
import { isLocalMode } from '../../modules/access/localMode';
import { buildLocalHistoryPayload } from '../../modules/local/localFinance';
import { ensureGuestDataHydrated } from '../../store/guestDataStore';
import { useAuthStore } from '../../store/authStore';
import { dateOnly } from '../../utils/core/filters';
import { todayISO } from '../../utils/core/format';
import { normalizeUserRecord } from '../../utils/domain/user';

function normalizeUser(raw: any): User | null {
    if (!raw || typeof raw !== 'object') {
        return null;
    }

    return normalizeUserRecord(raw);
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
        expenseCurrency:
            typeof rawSummary?.expenseCurrency === 'string'
                ? rawSummary.expenseCurrency
                : null,
        expenseTotalsByCurrency: normalizeCurrencyTotals(
            rawSummary?.expenseTotalsByCurrency,
        ),
        subscriptionTotalsByCurrency: normalizeCurrencyTotals(
            rawSummary?.subscriptionTotalsByCurrency,
        ),
    };
}

function extractHistoryPayload(raw: any): any {
    if (!raw || typeof raw !== 'object') {
        return {};
    }

    const historyKeys = ['user', 'summary', 'expenses', 'subscriptions'];
    if (historyKeys.some((key) => Object.prototype.hasOwnProperty.call(raw, key))) {
        return raw;
    }

    const wrapperKeys = ['data', 'result', 'payload', 'history'];
    for (const key of wrapperKeys) {
        if (raw[key] && typeof raw[key] === 'object') {
            return extractHistoryPayload(raw[key]);
        }
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

function isVisibleExpenseDate(value: unknown, now = new Date()) {
    const expenseDate = dateOnly(value);
    const todayKey = dateOnly(now);
    return !!expenseDate && expenseDate <= todayKey;
}

function normalizeHistoryPayload(rawPayload: any): HistoryPayload {
    const payload = extractHistoryPayload(rawPayload);
    const expenses: Expense[] = Array.isArray(payload?.expenses)
        ? payload.expenses
            .map(normalizeExpense)
            .filter((expense: Expense) => isVisibleExpenseDate(expense.date))
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

export type PartialHistoryError = Error & {
    partialData: HistoryPayload;
    failedSources: Array<'user' | 'expenses' | 'subscriptions'>;
};

function createPartialHistoryError(
    partialData: HistoryPayload,
    failedSources: PartialHistoryError['failedSources'],
): PartialHistoryError {
    const error = new Error('History data is incomplete.') as PartialHistoryError;
    error.partialData = partialData;
    error.failedSources = failedSources;
    return error;
}

export function isPartialHistoryError(
    error: unknown,
): error is PartialHistoryError {
    return (
        error instanceof Error
        && 'partialData' in error
        && 'failedSources' in error
        && Array.isArray(error.failedSources)
    );
}

export const historyApi = {
    getAll: async () => {
        if (isLocalMode()) {
            const state = ensureGuestDataHydrated();
            return buildLocalHistoryPayload({
                user: useAuthStore.getState().user,
                expenses: state.expenses,
                subscriptions: state.subscriptions,
            });
        }

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
            expensesApi.getAllPages({ to: todayISO() }),
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

        const fallbackPayload: HistoryPayload = {
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

        const failedSources: PartialHistoryError['failedSources'] = [];
        if (userResult.status === 'rejected') {
            failedSources.push('user');
        }
        if (expensesResult.status === 'rejected') {
            failedSources.push('expenses');
        }
        if (subscriptionsResult.status === 'rejected') {
            failedSources.push('subscriptions');
        }

        if (failedSources.length > 0) {
            throw createPartialHistoryError(fallbackPayload, failedSources);
        }

        return fallbackPayload;
    },
};
