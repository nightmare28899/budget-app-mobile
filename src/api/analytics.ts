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
    getDailyTotals: async (days = 7, endDate?: string) => {
        if (isLocalMode()) {
            const state = ensureGuestDataHydrated();
            const anchorDate = endDate ? new Date(`${endDate}T12:00:00`) : new Date();
            return buildDailyTotals(state.expenses, days, anchorDate);
        }

        const { data } = await apiClient.get<DailyTotal[]>('/analytics/daily', {
            params: { days, endDate },
        });
        const maxAllowedKey = endDate || dateOnly(new Date());
        return Array.isArray(data)
            ? data
                .filter((item) => {
                    const entryDate = dateOnly(item?.date);
                    return !!entryDate && entryDate <= maxAllowedKey;
                })
                .map((item) => ({
                    ...item,
                    total: toNum(item?.total),
                }))
            : [];
    },

    getCategoryBreakdown: async (from?: string, to?: string, referenceDate?: string) => {
        if (isLocalMode()) {
            const state = ensureGuestDataHydrated();
            if (from || to) {
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

            const anchorDate = referenceDate ? new Date(`${referenceDate}T12:00:00`) : new Date();
            return buildCategoryBreakdown({
                user: useAuthStore.getState().user,
                expenses: state.expenses,
                categories: state.categories,
                now: anchorDate,
            });
        }

        const { data } = await apiClient.get<CategoryBreakdown[]>(
            '/analytics/categories',
            { params: { from, to, referenceDate } },
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

    getBudgetSummary: async (referenceDate?: string) => {
        if (isLocalMode()) {
            const state = ensureGuestDataHydrated();
            const anchorDate = referenceDate ? new Date(`${referenceDate}T12:00:00`) : new Date();
            return buildBudgetSummary({
                user: useAuthStore.getState().user,
                expenses: state.expenses,
                subscriptions: state.subscriptions,
                now: anchorDate,
            });
        }

        const { data } = await apiClient.get<BudgetSummary>(
            '/analytics/budget-summary',
            { params: { referenceDate } },
        );
        return normalizeSummary(data);
    },

    getWeeklySummary: async (referenceDate?: string) => {
        if (isLocalMode()) {
            const state = ensureGuestDataHydrated();
            const anchorDate = referenceDate ? new Date(`${referenceDate}T12:00:00`) : new Date();
            return buildWeeklySummary({
                user: useAuthStore.getState().user,
                expenses: state.expenses,
                now: anchorDate,
            });
        }

        const { data } = await apiClient.get<WeeklySummary>(
            '/analytics/weekly-summary',
            { params: { referenceDate } },
        );
        return normalizeSummary(data);
    },
};
