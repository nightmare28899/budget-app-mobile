import apiClient from '../client';
import {
    CategoryBudgetOverview,
    AnalyticsInsights,
    DailyTotal,
    CategoryBreakdown,
    BudgetSummary,
    CardExpenseBreakdown,
    CardExpenseBreakdownGroup,
} from '../../types/index';
import { normalizeBudgetPeriod } from '../../utils/domain/budget';
import { toNum } from '../../utils/core/number';
import { isLocalMode } from '../../modules/access/localMode';
import {
    buildAnalyticsInsights,
    buildBudgetSummary,
    buildCategoryBudgetOverview,
    buildCategoryBreakdown,
    buildDailyTotals,
    buildWeeklySummary,
} from '../../modules/local/localFinance';
import { ensureGuestDataHydrated } from '../../store/guestDataStore';
import { useAuthStore } from '../../store/authStore';
import { dateOnly } from '../../utils/core/filters';

import {
    RawPeriod,
    RawSummaryData,
    RawSpendInsight,
    RawInsightsData,
    RawSubscriptionInsight,
    RawCategoryBudgetOverview,
    RawCategoryBudgetItem,
} from './analytics.types';

function normalizePeriod(period?: RawPeriod | null, summary?: RawSummaryData | null) {
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

function normalizeSummary(data?: RawSummaryData | null): BudgetSummary {
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

function normalizeSpendInsight(data?: RawSpendInsight | null) {
    return {
        start: String(data?.start ?? ''),
        end: String(data?.end ?? ''),
        totalSpent: toNum(data?.totalSpent),
        expenseCount: toNum(data?.expenseCount),
        averagePerDay: toNum(data?.averagePerDay),
        previousStart: String(data?.previousStart ?? ''),
        previousEnd: String(data?.previousEnd ?? ''),
        previousTotalSpent: toNum(data?.previousTotalSpent),
        changeAmount: toNum(data?.changeAmount),
        changePercent:
            data?.changePercent === null || data?.changePercent === undefined
                ? null
                : toNum(data?.changePercent),
    };
}

function normalizeInsights(data?: RawInsightsData | null): AnalyticsInsights {
    return {
        referenceDate: String(data?.referenceDate ?? ''),
        weeklySpend: normalizeSpendInsight(data?.weeklySpend),
        monthlySpend: {
            ...normalizeSpendInsight(data?.monthlySpend),
            projectedTotal: toNum(data?.monthlySpend?.projectedTotal),
        },
        topCategory: data?.topCategory
            ? {
                name: String(data.topCategory.name ?? ''),
                icon: String(data.topCategory.icon ?? 'cube-outline'),
                color: String(data.topCategory.color ?? '#95A5A6'),
                total: toNum(data.topCategory.total),
                percentage: toNum(data.topCategory.percentage),
            }
            : null,
        subscriptionSavings: {
            horizonMonths: toNum(data?.subscriptionSavings?.horizonMonths),
            monthlyRecurringSpend: toNum(data?.subscriptionSavings?.monthlyRecurringSpend),
            projectedSavings: toNum(data?.subscriptionSavings?.projectedSavings),
            activeSubscriptions: toNum(data?.subscriptionSavings?.activeSubscriptions),
            topSubscriptions: Array.isArray(data?.subscriptionSavings?.topSubscriptions)
                ? data!.subscriptionSavings!.topSubscriptions!.map((item: RawSubscriptionInsight) => ({
                    id: String(item?.id ?? ''),
                    name: String(item?.name ?? ''),
                    currency: String(item?.currency ?? ''),
                    billingCycle: item?.billingCycle ?? 'MONTHLY',
                    amount: toNum(item?.amount),
                    monthlyEquivalent: toNum(item?.monthlyEquivalent),
                    projectedSavings: toNum(item?.projectedSavings),
                    nextPaymentDate: String(item?.nextPaymentDate ?? ''),
                }))
                : [],
        },
    };
}

function normalizeCategoryBudgetOverview(data?: RawCategoryBudgetOverview | null): CategoryBudgetOverview {
    const period = normalizePeriod(data?.period);
    const items = Array.isArray(data?.items)
        ? data!.items!.map((item: RawCategoryBudgetItem) => ({
            categoryId: String(item?.categoryId ?? ''),
            name: String(item?.name ?? ''),
            icon: String(item?.icon ?? 'cube-outline'),
            color: String(item?.color ?? '#95A5A6'),
            budgetAmount: toNum(item?.budgetAmount),
            spent: toNum(item?.spent),
            remaining: toNum(item?.remaining),
            percentage: toNum(item?.percentage),
            expenseCount: toNum(item?.expenseCount),
            status: item?.status ?? 'no_budget',
        }))
        : [];

    return {
        period,
        totalBudgeted: toNum(data?.totalBudgeted),
        totalSpentBudgeted: toNum(data?.totalSpentBudgeted),
        totalRemaining: toNum(data?.totalRemaining),
        categoriesWithBudget: toNum(data?.categoriesWithBudget),
        overBudgetCount: toNum(data?.overBudgetCount),
        watchCount: toNum(data?.watchCount),
        items,
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

    getCategoryBudgetOverview: async (referenceDate?: string) => {
        if (isLocalMode()) {
            const state = ensureGuestDataHydrated();
            const anchorDate = referenceDate ? new Date(`${referenceDate}T12:00:00`) : new Date();
            return buildCategoryBudgetOverview({
                user: useAuthStore.getState().user,
                expenses: state.expenses,
                categories: state.categories,
                now: anchorDate,
            });
        }

        const { data } = await apiClient.get<RawCategoryBudgetOverview>(
            '/analytics/category-budgets',
            { params: { referenceDate } },
        );

        return normalizeCategoryBudgetOverview(data);
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

        const { data } = await apiClient.get<RawSummaryData>(
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

        const { data } = await apiClient.get<RawSummaryData>(
            '/analytics/weekly-summary',
            { params: { referenceDate } },
        );
        return normalizeSummary(data);
    },

    getInsights: async (referenceDate?: string, horizonMonths = 6) => {
        if (isLocalMode()) {
            const state = ensureGuestDataHydrated();
            const anchorDate = referenceDate ? new Date(`${referenceDate}T12:00:00`) : new Date();
            return buildAnalyticsInsights({
                user: useAuthStore.getState().user,
                expenses: state.expenses,
                subscriptions: state.subscriptions,
                categories: state.categories,
                now: anchorDate,
            }, horizonMonths);
        }

        const { data } = await apiClient.get<RawInsightsData>(
            '/analytics/insights',
            { params: { referenceDate, horizonMonths } },
        );

        return normalizeInsights(data);
    },

    getCardBreakdown: async (from: string, to: string): Promise<CardExpenseBreakdown> => {
        if (isLocalMode()) {
            const { expenses } = ensureGuestDataHydrated();
            const inRange = expenses.filter((expense) => {
                const day = dateOnly(expense.date);
                return day >= from && day <= to;
            });
            const groups = new Map<string, CardExpenseBreakdownGroup>();
            const totals = new Map<string, number>();
            for (const expense of inRange) {
                const key = expense.creditCardId ?? 'no-card';
                const card = expense.creditCard ?? null;
                const group = groups.get(key) ?? {
                    creditCardId: expense.creditCardId ?? null,
                    card: card
                        ? { id: card.id, name: card.name, bank: card.bank, brand: card.brand, last4: card.last4 }
                        : null,
                    expenseCount: 0,
                    totalsByCurrency: [],
                };
                const cents = Math.round(toNum(expense.cost) * 100);
                const entry = group.totalsByCurrency.find((i) => i.currency === expense.currency);
                if (entry) {
                    entry.total = (Math.round(entry.total * 100) + cents) / 100;
                } else {
                    group.totalsByCurrency.push({ currency: expense.currency, total: cents / 100 });
                }
                group.expenseCount += 1;
                groups.set(key, group);
                totals.set(expense.currency, (totals.get(expense.currency) ?? 0) + cents);
            }
            return {
                from,
                to,
                totalCount: inRange.length,
                currencyBreakdown: Array.from(totals.entries()).map(([currency, cents]) => ({
                    currency,
                    total: cents / 100,
                })),
                groups: Array.from(groups.values()),
            };
        }

        const { data } = await apiClient.get('/analytics/cards', { params: { from, to } });
        const toTotals = (list: unknown) =>
            Array.isArray(list)
                ? list.map((item: any) => ({
                    currency: typeof item?.currency === 'string' ? item.currency : 'MXN',
                    total: toNum(item?.total),
                }))
                : [];

        return {
            from: typeof data?.from === 'string' ? data.from : from,
            to: typeof data?.to === 'string' ? data.to : to,
            totalCount: toNum(data?.totalCount),
            currencyBreakdown: toTotals(data?.currencyBreakdown),
            groups: Array.isArray(data?.groups)
                ? data.groups.map((group: any) => ({
                    creditCardId: typeof group?.creditCardId === 'string' ? group.creditCardId : null,
                    card: group?.card && typeof group.card === 'object'
                        ? {
                            id: String(group.card.id ?? ''),
                            name: String(group.card.name ?? ''),
                            bank: String(group.card.bank ?? ''),
                            brand: String(group.card.brand ?? ''),
                            last4: String(group.card.last4 ?? ''),
                        }
                        : null,
                    expenseCount: toNum(group?.expenseCount),
                    totalsByCurrency: toTotals(group?.totalsByCurrency),
                }))
                : [],
        };
    },
};
