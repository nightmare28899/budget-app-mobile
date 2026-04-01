import apiClient from './client';
import {
    DailyTotal,
    CategoryBreakdown,
    WeeklySummary,
    BudgetSummary,
} from '../types';
import { normalizeBudgetPeriod } from '../utils/budget';
import { toNum } from '../utils/number';
import { isLocalMode } from '../modules/access/localMode';
import {
    buildBudgetSummary,
    buildCategoryBreakdown,
    buildDailyTotals,
    buildWeeklySummary,
} from '../modules/local/localFinance';
import { ensureGuestDataHydrated } from '../store/guestDataStore';
import { useAuthStore } from '../store/authStore';
import { dateOnly } from '../utils/filters';

function normalizePeriod(period: any, summary?: any) {
    return {
        type: normalizeBudgetPeriod(
            period?.type ?? summary?.budgetPeriod,
            'daily',
        ),
        start:
            typeof period?.start === 'string'
                ? period.start
                : typeof summary?.budgetPeriodStart === 'string'
                    ? summary.budgetPeriodStart
                    : null,
        end:
            typeof period?.end === 'string'
                ? period.end
                : typeof summary?.budgetPeriodEnd === 'string'
                    ? summary.budgetPeriodEnd
                    : null,
    };
}

function normalizeSummary(data: any): BudgetSummary {
    const budgetAmount = toNum(data?.budgetAmount ?? data?.weeklyBudget);
    const hasReservedSubscriptions =
        !!data &&
        Object.prototype.hasOwnProperty.call(data, 'reservedSubscriptions');
    const hasSafeToSpend =
        !!data &&
        Object.prototype.hasOwnProperty.call(data, 'safeToSpend');

    return {
        period: normalizePeriod(data?.period, data),
        totalSpent: toNum(data?.totalSpent),
        budgetAmount,
        reservedSubscriptions: hasReservedSubscriptions
            ? toNum(data?.reservedSubscriptions)
            : undefined,
        safeToSpend: hasSafeToSpend ? toNum(data?.safeToSpend) : undefined,
        remaining: toNum(data?.remaining),
        expenseCount: toNum(data?.expenseCount),
        dailyAverage: toNum(data?.dailyAverage),
        weeklyBudget: toNum(data?.weeklyBudget ?? budgetAmount),
    };
}

export const analyticsApi = {
    getDailyTotals: async (days = 7) => {
        if (isLocalMode()) {
            const state = ensureGuestDataHydrated();
            return buildDailyTotals(state.expenses, days);
        }

        const { data } = await apiClient.get<DailyTotal[]>('/analytics/daily', {
            params: { days },
        });
        const todayKey = dateOnly(new Date());
        return Array.isArray(data)
            ? data
                .filter((item) => {
                    const entryDate = dateOnly(item?.date);
                    return !!entryDate && entryDate <= todayKey;
                })
                .map((item) => ({
                    ...item,
                    total: toNum(item?.total),
                }))
            : [];
    },

    getCategoryBreakdown: async (from?: string, to?: string) => {
        if (isLocalMode()) {
            const state = ensureGuestDataHydrated();
            const expenses = state.expenses.filter((expense) => {
                const expenseDate = String(expense.date).slice(0, 10);
                if (from && expenseDate < from) {
                    return false;
                }
                if (to && expenseDate > to) {
                    return false;
                }
                return true;
            });

            return buildCategoryBreakdown({
                user: useAuthStore.getState().user,
                expenses,
                categories: state.categories,
            });
        }

        const { data } = await apiClient.get<CategoryBreakdown[]>(
            '/analytics/categories',
            { params: { from, to } },
        );
        return Array.isArray(data)
            ? data.map((item) => ({
                ...item,
                total: toNum(item?.total),
                count: toNum(item?.count),
                percentage: toNum(item?.percentage),
            }))
            : [];
    },

    getBudgetSummary: async () => {
        if (isLocalMode()) {
            const state = ensureGuestDataHydrated();
            return buildBudgetSummary({
                user: useAuthStore.getState().user,
                expenses: state.expenses,
                subscriptions: state.subscriptions,
            });
        }

        const { data } = await apiClient.get<BudgetSummary>(
            '/analytics/budget-summary',
        );
        return normalizeSummary(data);
    },

    getWeeklySummary: async () => {
        if (isLocalMode()) {
            const state = ensureGuestDataHydrated();
            return buildWeeklySummary({
                user: useAuthStore.getState().user,
                expenses: state.expenses,
            });
        }

        const { data } = await apiClient.get<WeeklySummary>(
            '/analytics/weekly-summary',
        );
        return normalizeSummary(data);
    },
};
