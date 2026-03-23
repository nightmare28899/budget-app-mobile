import apiClient from './client';
import {
    DailyTotal,
    CategoryBreakdown,
    WeeklySummary,
    BudgetSummary,
} from '../types';
import { normalizeBudgetPeriod } from '../utils/budget';
import { toNum } from '../utils/number';

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
        const { data } = await apiClient.get<DailyTotal[]>('/analytics/daily', {
            params: { days },
        });
        return Array.isArray(data)
            ? data.map((item) => ({
                ...item,
                total: toNum(item?.total),
            }))
            : [];
    },

    getCategoryBreakdown: async (from?: string, to?: string) => {
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
        const { data } = await apiClient.get<BudgetSummary>(
            '/analytics/budget-summary',
        );
        return normalizeSummary(data);
    },

    getWeeklySummary: async () => {
        const { data } = await apiClient.get<WeeklySummary>(
            '/analytics/weekly-summary',
        );
        return normalizeSummary(data);
    },
};
