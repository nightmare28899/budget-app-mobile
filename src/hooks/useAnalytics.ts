import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../api/analytics';
import { formatDate } from '../utils/format';
import { budgetLabel } from '../utils/budget';
import { useI18n } from './useI18n';

export function useAnalytics(selectedDate?: string, horizonMonths = 6) {
    const { t } = useI18n();

    const {
        data: weeklySummary,
        isLoading: loadingWeekly,
        refetch: refetchWeekly,
    } = useQuery({
        queryKey: ['analytics', 'weekly', selectedDate ?? 'today'],
        queryFn: () => analyticsApi.getWeeklySummary(selectedDate),
    });

    const {
        data: dailyTotals,
        isLoading: loadingDaily,
        refetch: refetchDaily,
    } = useQuery({
        queryKey: ['analytics', 'daily', selectedDate ?? 'today'],
        queryFn: () => analyticsApi.getDailyTotals(7, selectedDate),
    });

    const {
        data: categories,
        isLoading: loadingCats,
        refetch: refetchCats,
    } = useQuery({
        queryKey: ['analytics', 'categories', selectedDate ?? 'today'],
        queryFn: () => analyticsApi.getCategoryBreakdown(undefined, undefined, selectedDate),
    });

    const {
        data: insights,
        isLoading: loadingInsights,
        refetch: refetchInsights,
    } = useQuery({
        queryKey: ['analytics', 'insights', selectedDate ?? 'today', horizonMonths],
        queryFn: () => analyticsApi.getInsights(selectedDate, horizonMonths),
    });

    const isLoading = loadingDaily || loadingCats || loadingWeekly || loadingInsights;
    const showSkeleton =
        isLoading &&
        !weeklySummary &&
        (!dailyTotals || dailyTotals.length === 0) &&
        (!categories || categories.length === 0) &&
        !insights;

    const refetchAll = () => {
        refetchDaily();
        refetchCats();
        refetchWeekly();
        refetchInsights();
    };

    const maxDaily = Math.max(
        ...(dailyTotals?.map((d) => d.total) ?? [0]),
        1,
    );

    const weeklyBudgetAmount = weeklySummary?.budgetAmount ?? weeklySummary?.weeklyBudget ?? 0;

    const weeklyPeriodLabel = weeklySummary?.period?.type
        ? budgetLabel(weeklySummary.period.type, t)
        : null;

    const weeklyPeriodRange = useMemo(() => {
        if (!weeklySummary?.period?.start || !weeklySummary?.period?.end) {
            return null;
        }
        return `${formatDate(weeklySummary.period.start, 'MMM D')} - ${formatDate(weeklySummary.period.end, 'MMM D')}`;
    }, [weeklySummary?.period?.start, weeklySummary?.period?.end]);

    return {
        dailyTotals,
        categories,
        weeklySummary,
        insights,
        isLoading,
        showSkeleton,
        refetchAll,
        maxDaily,
        weeklyBudgetAmount,
        weeklyPeriodLabel,
        weeklyPeriodRange,
    };
}
