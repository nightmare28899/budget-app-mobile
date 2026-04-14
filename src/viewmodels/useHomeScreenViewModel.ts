import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../api/resources/analytics';
import { historyApi } from '../api/resources/history';
import { subscriptionsApi } from '../api/resources/subscriptions';
import { useDashboard } from '../hooks/useDashboard';
import { useI18n } from '../hooks/useI18n';
import { getRecentUnifiedHistory } from '../modules/history/unifiedHistory';
import {
    calculateReservedFundsForPeriod,
    resolvePeriodRange,
    toSubscriptionManagerItems,
} from '../modules/subscriptions/subscriptionManager';
import { BudgetPeriod } from '../types/index';
import { getCurrencyLocale } from '../utils/domain/currency';
import { formatCurrency } from '../utils/core/format';
import { toNum } from '../utils/core/number';

type UseHomeScreenViewModelParams = {
    upcomingDays?: number;
    recentLimit?: number;
};

type HomeActionItem = {
    id:
    | 'add-income'
    | 'review-category-budgets'
    | 'review-spending'
    | 'trim-subscriptions'
    | 'move-to-savings';
    icon: string;
    tone: 'info' | 'warning' | 'success' | 'danger';
    title: string;
    description: string;
    ctaLabel: string;
};

export function useHomeScreenViewModel({
    upcomingDays = 3,
    recentLimit = 5,
}: UseHomeScreenViewModelParams) {
    const { t, language } = useI18n();
    const {
        todayData,
        budgetSummary,
        incomeSummary,
        dashboardInsights,
        isLoading,
        todayError,
        budgetSummaryError,
        incomeSummaryError,
        refetch,
    } = useDashboard();

    const {
        data: categoryBudgetOverview,
        refetch: refetchCategoryBudgetOverview,
    } = useQuery({
        queryKey: ['analytics', 'category-budgets', 'dashboard'],
        queryFn: () => analyticsApi.getCategoryBudgetOverview(),
    });

    const {
        data: historyData,
        isLoading: historyLoading,
        isRefetching: historyRefetching,
        error: historyError,
        refetch: refetchHistory,
    } = useQuery({
        queryKey: ['history', 'all'],
        queryFn: historyApi.getAll,
    });

    const {
        data: upcomingSubscriptions,
        isLoading: upcomingLoading,
        isRefetching: upcomingRefetching,
        error: upcomingError,
        refetch: refetchUpcoming,
    } = useQuery({
        queryKey: ['subscriptions', 'upcoming', upcomingDays],
        queryFn: () => subscriptionsApi.getUpcoming(upcomingDays),
    });

    const todayMaximumSpent = Math.max(
        toNum(todayData?.spentInBudgetPeriod),
        toNum(todayData?.total),
    );
    const total = Math.max(
        toNum(budgetSummary?.totalSpent),
        todayMaximumSpent,
    );
    const budget = toNum(
        budgetSummary?.budgetAmount
            ?? todayData?.budgetAmount
            ?? todayData?.dailyBudget,
    );
    const periodType: BudgetPeriod =
        budgetSummary?.period?.type
        ?? todayData?.budgetPeriod
        ?? 'daily';
    const periodStart = budgetSummary?.period?.start
        ?? todayData?.budgetPeriodStart
        ?? null;
    const periodEnd = budgetSummary?.period?.end
        ?? todayData?.budgetPeriodEnd
        ?? null;

    const currentPeriodRange = useMemo(
        () => resolvePeriodRange(periodType, periodStart, periodEnd),
        [periodEnd, periodStart, periodType],
    );

    const managedSubscriptions = useMemo(
        () => toSubscriptionManagerItems(historyData?.subscriptions ?? []),
        [historyData?.subscriptions],
    );

    const localReservedSubscriptions = useMemo(
        () =>
            calculateReservedFundsForPeriod(
                managedSubscriptions,
                currentPeriodRange,
            ),
        [currentPeriodRange, managedSubscriptions],
    );

    const reservedSubscriptions =
        typeof budgetSummary?.reservedSubscriptions === 'number'
            ? toNum(budgetSummary.reservedSubscriptions)
            : localReservedSubscriptions;
    const safeToSpend =
        typeof budgetSummary?.safeToSpend === 'number'
            ? toNum(budgetSummary.safeToSpend)
            : budget - reservedSubscriptions;
    const totalIncome = toNum(incomeSummary?.totalIncome);
    const totalExpenses = toNum(incomeSummary?.totalExpenses ?? budgetSummary?.totalSpent);
    const netCashflow = toNum(incomeSummary?.net);
    const savingsRate = incomeSummary?.savingsRate ?? null;
    const locale = getCurrencyLocale(language);
    const currency = todayData?.currency ?? historyData?.user?.currency ?? 'MXN';

    const recentUnifiedHistory = useMemo(
        () => getRecentUnifiedHistory(historyData, recentLimit),
        [historyData, recentLimit],
    );

    const actionItems = useMemo<HomeActionItem[]>(() => {
        const items: HomeActionItem[] = [];

        if (totalIncome <= 0) {
            items.push({
                id: 'add-income',
                icon: 'trending-up-outline',
                tone: 'info',
                title: t('dashboard.actionAddIncomeTitle'),
                description: t('dashboard.actionAddIncomeDescription'),
                ctaLabel: t('dashboard.actionAddIncomeCta'),
            });
        }

        if ((categoryBudgetOverview?.overBudgetCount ?? 0) > 0) {
            items.push({
                id: 'review-category-budgets',
                icon: 'pie-chart-outline',
                tone: 'danger',
                title: t('dashboard.actionCategoryBudgetsTitle'),
                description: t('dashboard.actionCategoryBudgetsOverDescription', {
                    count: categoryBudgetOverview?.overBudgetCount ?? 0,
                }),
                ctaLabel: t('dashboard.actionCategoryBudgetsCta'),
            });
        } else if ((categoryBudgetOverview?.watchCount ?? 0) > 0) {
            items.push({
                id: 'review-category-budgets',
                icon: 'pie-chart-outline',
                tone: 'warning',
                title: t('dashboard.actionCategoryBudgetsTitle'),
                description: t('dashboard.actionCategoryBudgetsWatchDescription', {
                    count: categoryBudgetOverview?.watchCount ?? 0,
                }),
                ctaLabel: t('dashboard.actionCategoryBudgetsCta'),
            });
        }

        if (
            dashboardInsights?.weeklySpend &&
            dashboardInsights.weeklySpend.changeAmount > 0 &&
            dashboardInsights.weeklySpend.totalSpent > 0
        ) {
            const overspendLabel = formatCurrency(
                Math.abs(dashboardInsights.weeklySpend.changeAmount),
                currency,
                locale,
            );
            const safeRoomLabel = formatCurrency(
                Math.max(safeToSpend, 0),
                currency,
                locale,
            );

            items.push({
                id: 'review-spending',
                icon: 'pulse-outline',
                tone: safeToSpend > 0 ? 'warning' : 'danger',
                title: t('dashboard.actionReviewSpendingTitle'),
                description:
                    safeToSpend > 0
                        ? t('dashboard.actionReviewSpendingDescription', {
                            amount: overspendLabel,
                            safeAmount: safeRoomLabel,
                        })
                        : t('dashboard.actionReviewSpendingNoRoomDescription', {
                            amount: overspendLabel,
                        }),
                ctaLabel: t('dashboard.actionReviewSpendingCta'),
            });
        }

        if (
            dashboardInsights?.subscriptionSavings &&
            dashboardInsights.subscriptionSavings.projectedSavings > 0
        ) {
            items.push({
                id: 'trim-subscriptions',
                icon: 'albums-outline',
                tone: 'warning',
                title: t('dashboard.actionTrimSubscriptionsTitle'),
                description: t('dashboard.actionTrimSubscriptionsDescription', {
                    amount: formatCurrency(
                        dashboardInsights.subscriptionSavings.projectedSavings,
                        currency,
                        locale,
                    ),
                    months: dashboardInsights.subscriptionSavings.horizonMonths,
                }),
                ctaLabel: t('dashboard.actionTrimSubscriptionsCta'),
            });
        }

        const suggestedSavingsMove = Math.max(
            0,
            Math.round(Math.min(netCashflow, safeToSpend) * 0.2 * 100) / 100,
        );
        if (suggestedSavingsMove >= 1) {
            items.push({
                id: 'move-to-savings',
                icon: 'wallet-outline',
                tone: 'success',
                title: t('dashboard.actionMoveSavingsTitle'),
                description: t('dashboard.actionMoveSavingsDescription', {
                    amount: formatCurrency(suggestedSavingsMove, currency, locale),
                }),
                ctaLabel: t('dashboard.actionMoveSavingsCta'),
            });
        }

        return items.slice(0, 3);
    }, [
        categoryBudgetOverview?.overBudgetCount,
        categoryBudgetOverview?.watchCount,
        currency,
        dashboardInsights,
        locale,
        netCashflow,
        safeToSpend,
        t,
        totalIncome,
    ]);

    const refetchAll = useCallback(() => {
        refetch();
        refetchCategoryBudgetOverview();
        refetchHistory();
        refetchUpcoming();
    }, [refetch, refetchCategoryBudgetOverview, refetchHistory, refetchUpcoming]);

    const showSkeleton = (isLoading || historyLoading) && !todayData && !historyData;
    const isUpcomingLoading = upcomingLoading || upcomingRefetching;
    const hasUpcomingError = !!upcomingError;
    const hasHistoryError = !!historyError && !historyData;
    const hasBudgetError =
        (!!todayError || !!budgetSummaryError) &&
        !todayData &&
        !budgetSummary;
    const hasCashflowError = !!incomeSummaryError && !incomeSummary;

    return {
        total,
        budget,
        periodType,
        periodStart,
        periodEnd,
        reservedSubscriptions,
        safeToSpend,
        totalIncome,
        totalExpenses,
        netCashflow,
        savingsRate,
        actionItems,
        upcomingSubscriptions: upcomingSubscriptions ?? [],
        isUpcomingLoading,
        hasUpcomingError,
        hasHistoryError,
        hasBudgetError,
        hasCashflowError,
        recentUnifiedHistory,
        isLoading,
        historyLoading,
        historyRefetching,
        showSkeleton,
        refetch: refetchAll,
    };
}
