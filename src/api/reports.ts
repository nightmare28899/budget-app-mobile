import apiClient from './client';
import { ReportHistoryItem, ReportPeriodType, ReportSnapshot } from '../types';
import { buildReportSnapshot } from '../modules/local/localFinance';
import { ensureGuestDataHydrated } from '../store/guestDataStore';
import { useAuthStore } from '../store/authStore';
import { isLocalMode } from '../modules/access/localMode';
import { toNum } from '../utils/number';

function normalizeReportSnapshot(data: any): ReportSnapshot {
  return {
    generatedAt:
      typeof data?.generatedAt === 'string'
        ? data.generatedAt
        : new Date().toISOString(),
    report: {
      type: data?.report?.type === 'monthly' ? 'monthly' : 'weekly',
      label:
        typeof data?.report?.label === 'string' ? data.report.label : 'Weekly',
      referenceDate: String(data?.report?.referenceDate ?? ''),
      start: String(data?.report?.start ?? ''),
      end: String(data?.report?.end ?? ''),
      trackedDays: toNum(data?.report?.trackedDays),
    },
    summary: {
      totalIncome: toNum(data?.summary?.totalIncome),
      incomeCount: toNum(data?.summary?.incomeCount),
      averageIncome: toNum(data?.summary?.averageIncome),
      totalSpent: toNum(data?.summary?.totalSpent),
      expenseCount: toNum(data?.summary?.expenseCount),
      averagePerDay: toNum(data?.summary?.averagePerDay),
      net: toNum(data?.summary?.net),
      savingsRate:
        data?.summary?.savingsRate === null ||
        data?.summary?.savingsRate === undefined
          ? null
          : toNum(data?.summary?.savingsRate),
    },
    plan: normalizeBudgetSummary(data?.plan),
    categoryBudgets: {
      overBudgetCount: toNum(data?.categoryBudgets?.overBudgetCount),
      watchCount: toNum(data?.categoryBudgets?.watchCount),
    },
    categories: Array.isArray(data?.categories)
      ? data.categories.map((item: any) => ({
          name: String(item?.name ?? ''),
          icon: String(item?.icon ?? 'cube-outline'),
          color: String(item?.color ?? '#95A5A6'),
          total: toNum(item?.total),
          count: toNum(item?.count),
          percentage: toNum(item?.percentage),
        }))
      : [],
    insights: normalizeInsights(data?.insights),
    savings: {
      goalCount: toNum(data?.savings?.goalCount),
      totalSaved: toNum(data?.savings?.totalSaved),
      totalTarget: toNum(data?.savings?.totalTarget),
      progressPercent:
        data?.savings?.progressPercent === null ||
        data?.savings?.progressPercent === undefined
          ? null
          : toNum(data?.savings?.progressPercent),
      nextGoal: data?.savings?.nextGoal
        ? {
            id: String(data.savings.nextGoal.id ?? ''),
            title: String(data.savings.nextGoal.title ?? ''),
            targetDate:
              typeof data.savings.nextGoal.targetDate === 'string'
                ? data.savings.nextGoal.targetDate
                : null,
            currentAmount: toNum(data.savings.nextGoal.currentAmount),
            targetAmount: toNum(data.savings.nextGoal.targetAmount),
          }
        : null,
    },
    highlights: {
      suggestedSavingsMove: toNum(data?.highlights?.suggestedSavingsMove),
    },
  };
}

function normalizeBudgetSummary(data: any) {
  const normalized = {
    period: {
      type: data?.period?.type ?? 'daily',
      start: typeof data?.period?.start === 'string' ? data.period.start : null,
      end: typeof data?.period?.end === 'string' ? data.period.end : null,
    },
    totalSpent: toNum(data?.totalSpent),
    budgetAmount: toNum(data?.budgetAmount),
    reservedSubscriptions:
      data?.reservedSubscriptions === undefined
        ? undefined
        : toNum(data?.reservedSubscriptions),
    safeToSpend:
      data?.safeToSpend === undefined ? undefined : toNum(data?.safeToSpend),
    remaining: toNum(data?.remaining),
    expenseCount: toNum(data?.expenseCount),
    dailyAverage: toNum(data?.dailyAverage),
    weeklyBudget: toNum(data?.weeklyBudget),
  };

  return normalized;
}

function normalizeInsights(data: any) {
  return {
    referenceDate: String(data?.referenceDate ?? ''),
    weeklySpend: {
      start: String(data?.weeklySpend?.start ?? ''),
      end: String(data?.weeklySpend?.end ?? ''),
      totalSpent: toNum(data?.weeklySpend?.totalSpent),
      expenseCount: toNum(data?.weeklySpend?.expenseCount),
      averagePerDay: toNum(data?.weeklySpend?.averagePerDay),
      previousStart: String(data?.weeklySpend?.previousStart ?? ''),
      previousEnd: String(data?.weeklySpend?.previousEnd ?? ''),
      previousTotalSpent: toNum(data?.weeklySpend?.previousTotalSpent),
      changeAmount: toNum(data?.weeklySpend?.changeAmount),
      changePercent:
        data?.weeklySpend?.changePercent === null ||
        data?.weeklySpend?.changePercent === undefined
          ? null
          : toNum(data?.weeklySpend?.changePercent),
    },
    monthlySpend: {
      start: String(data?.monthlySpend?.start ?? ''),
      end: String(data?.monthlySpend?.end ?? ''),
      totalSpent: toNum(data?.monthlySpend?.totalSpent),
      expenseCount: toNum(data?.monthlySpend?.expenseCount),
      averagePerDay: toNum(data?.monthlySpend?.averagePerDay),
      previousStart: String(data?.monthlySpend?.previousStart ?? ''),
      previousEnd: String(data?.monthlySpend?.previousEnd ?? ''),
      previousTotalSpent: toNum(data?.monthlySpend?.previousTotalSpent),
      changeAmount: toNum(data?.monthlySpend?.changeAmount),
      changePercent:
        data?.monthlySpend?.changePercent === null ||
        data?.monthlySpend?.changePercent === undefined
          ? null
          : toNum(data?.monthlySpend?.changePercent),
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
      monthlyRecurringSpend: toNum(
        data?.subscriptionSavings?.monthlyRecurringSpend,
      ),
      projectedSavings: toNum(data?.subscriptionSavings?.projectedSavings),
      activeSubscriptions: toNum(
        data?.subscriptionSavings?.activeSubscriptions,
      ),
      topSubscriptions: Array.isArray(
        data?.subscriptionSavings?.topSubscriptions,
      )
        ? data.subscriptionSavings.topSubscriptions.map((item: any) => ({
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

type GetReportSummaryParams = {
  periodType?: ReportPeriodType;
  referenceDate?: string;
  horizonMonths?: number;
};

type SendReportPayload = GetReportSummaryParams & {
  email?: string;
};

function normalizeHistoryItem(data: any): ReportHistoryItem {
  return {
    id: String(data?.id ?? ''),
    periodType: data?.periodType === 'monthly' ? 'monthly' : 'weekly',
    source: data?.source === 'email' ? 'email' : 'manual',
    referenceDate: String(data?.referenceDate ?? ''),
    start: String(data?.start ?? ''),
    end: String(data?.end ?? ''),
    createdAt:
      typeof data?.createdAt === 'string'
        ? data.createdAt
        : new Date().toISOString(),
    summary: {
      totalIncome: toNum(data?.summary?.totalIncome),
      incomeCount: toNum(data?.summary?.incomeCount),
      averageIncome: toNum(data?.summary?.averageIncome),
      totalSpent: toNum(data?.summary?.totalSpent),
      expenseCount: toNum(data?.summary?.expenseCount),
      averagePerDay: toNum(data?.summary?.averagePerDay),
      net: toNum(data?.summary?.net),
      savingsRate:
        data?.summary?.savingsRate === null ||
        data?.summary?.savingsRate === undefined
          ? null
          : toNum(data?.summary?.savingsRate),
    },
  };
}

export const reportsApi = {
  getSummary: async (params: GetReportSummaryParams = {}) => {
    if (isLocalMode()) {
      const state = ensureGuestDataHydrated();
      const anchorDate = params.referenceDate
        ? new Date(`${params.referenceDate}T12:00:00`)
        : new Date();
      return buildReportSnapshot(
        {
          user: useAuthStore.getState().user,
          expenses: state.expenses,
          incomes: state.incomes,
          subscriptions: state.subscriptions,
          categories: state.categories,
          savingsGoals: state.savingsGoals,
          now: anchorDate,
        },
        params.periodType ?? 'weekly',
        params.horizonMonths ?? 6,
      );
    }

    const { data } = await apiClient.get<ReportSnapshot>('/reports/summary', {
      params,
    });
    return normalizeReportSnapshot(data);
  },

  sendReport: async (payload: SendReportPayload = {}) => {
    const { data } = await apiClient.post('/reports/send', payload);
    return data;
  },

  saveSummary: async (params: GetReportSummaryParams = {}) => {
    if (isLocalMode()) {
      throw new Error('Report history is only available for account mode');
    }

    const { data } = await apiClient.post('/reports/history', params);
    return normalizeHistoryItem(data);
  },

  getHistory: async (limit = 8) => {
    if (isLocalMode()) {
      return [] as ReportHistoryItem[];
    }

    const { data } = await apiClient.get<ReportHistoryItem[]>(
      '/reports/history',
      {
        params: { limit },
      },
    );
    return Array.isArray(data) ? data.map(normalizeHistoryItem) : [];
  },

  sendWeeklyReport: async (payload: { email: string }) => {
    const { data } = await apiClient.post('/reports/send-weekly', payload);
    return data;
  },
};
