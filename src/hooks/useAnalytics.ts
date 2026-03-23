import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../api/analytics';
import { formatDate } from '../utils/format';
import { budgetLabel } from '../utils/budget';
import { useI18n } from './useI18n';

export function useAnalytics() {
    const { t } = useI18n();

    const {
        data: dailyTotals,
        isLoading: loadingDaily,
        refetch: refetchDaily,
    } = useQuery({
        queryKey: ['analytics', 'daily'],
        queryFn: () => analyticsApi.getDailyTotals(7),
    });

    const {
        data: categories,
        isLoading: loadingCats,
        refetch: refetchCats,
    } = useQuery({
        queryKey: ['analytics', 'categories'],
        queryFn: () => analyticsApi.getCategoryBreakdown(),
    });

    const {
        data: weeklySummary,
        isLoading: loadingWeekly,
        refetch: refetchWeekly,
    } = useQuery({
        queryKey: ['analytics', 'weekly'],
        queryFn: analyticsApi.getWeeklySummary,
    });

    const isLoading = loadingDaily || loadingCats || loadingWeekly;
    const showSkeleton =
        isLoading &&
        !weeklySummary &&
        (!dailyTotals || dailyTotals.length === 0) &&
        (!categories || categories.length === 0);

    const refetchAll = () => {
        refetchDaily();
        refetchCats();
        refetchWeekly();
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
        isLoading,
        showSkeleton,
        refetchAll,
        maxDaily,
        weeklyBudgetAmount,
        weeklyPeriodLabel,
        weeklyPeriodRange,
    };
}
