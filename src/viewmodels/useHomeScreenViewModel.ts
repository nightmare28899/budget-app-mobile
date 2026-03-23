import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { historyApi } from '../api/history';
import { subscriptionsApi } from '../api/subscriptions';
import { useDashboard } from '../hooks/useDashboard';
import { getRecentUnifiedHistory } from '../modules/history/unifiedHistory';
import {
    calculateReservedFundsForPeriod,
    resolvePeriodRange,
    toSubscriptionManagerItems,
} from '../modules/subscriptions/subscriptionManager';
import { BudgetPeriod } from '../types';
import { toNum } from '../utils/number';

type UseHomeScreenViewModelParams = {
    upcomingDays?: number;
    recentLimit?: number;
};

export function useHomeScreenViewModel({
    upcomingDays = 3,
    recentLimit = 5,
}: UseHomeScreenViewModelParams) {
    const {
        todayData,
        budgetSummary,
        isLoading,
        todayError,
        budgetSummaryError,
        refetch,
    } = useDashboard();

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

    const recentUnifiedHistory = useMemo(
        () => getRecentUnifiedHistory(historyData, recentLimit),
        [historyData, recentLimit],
    );

    const refetchAll = useCallback(() => {
        refetch();
        refetchHistory();
        refetchUpcoming();
    }, [refetch, refetchHistory, refetchUpcoming]);

    const showSkeleton = (isLoading || historyLoading) && !todayData && !historyData;
    const isUpcomingLoading = upcomingLoading || upcomingRefetching;
    const hasUpcomingError = !!upcomingError;
    const hasHistoryError = !!historyError && !historyData;
    const hasBudgetError =
        (!!todayError || !!budgetSummaryError) &&
        !todayData &&
        !budgetSummary;

    return {
        total,
        budget,
        periodType,
        periodStart,
        periodEnd,
        reservedSubscriptions,
        safeToSpend,
        upcomingSubscriptions: upcomingSubscriptions ?? [],
        isUpcomingLoading,
        hasUpcomingError,
        hasHistoryError,
        hasBudgetError,
        recentUnifiedHistory,
        isLoading,
        historyLoading,
        historyRefetching,
        showSkeleton,
        refetch: refetchAll,
    };
}
