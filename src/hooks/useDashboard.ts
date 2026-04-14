import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { expensesApi } from '../api/resources/expenses';
import { analyticsApi } from '../api/resources/analytics';
import { incomesApi } from '../api/resources/incomes';
import { useAppAlert } from '../components/alerts/AlertProvider';
import { useI18n } from './useI18n';
import { SwipeableRef } from '../types/swipeable';

export function useDashboard() {
    const queryClient = useQueryClient();
    const { alert } = useAppAlert();
    const { t } = useI18n();
    const activeSwipeableRef = useRef<SwipeableRef | null>(null);
    const activeSwipeableIdRef = useRef<string | null>(null);

    const {
        data: todayData,
        isLoading: loadingToday,
        error: todayError,
        refetch,
    } = useQuery({
        queryKey: ['expenses', 'today'],
        queryFn: expensesApi.getToday,
    });

    const {
        data: budgetSummary,
        isLoading: loadingBudgetSummary,
        error: budgetSummaryError,
        refetch: refetchBudgetSummary,
    } = useQuery({
        queryKey: ['analytics', 'budget-summary'],
        queryFn: () => analyticsApi.getBudgetSummary(),
    });

    const {
        data: incomeSummary,
        isLoading: loadingIncomeSummary,
        error: incomeSummaryError,
        refetch: refetchIncomeSummary,
    } = useQuery({
        queryKey: ['income-summary', 'current'],
        queryFn: () => incomesApi.getSummary(),
    });

    const {
        data: dashboardInsights,
        error: dashboardInsightsError,
        refetch: refetchDashboardInsights,
    } = useQuery({
        queryKey: ['analytics', 'insights', 'dashboard', 6],
        queryFn: () => analyticsApi.getInsights(undefined, 6),
    });

    useFocusEffect(
        useCallback(() => {
            refetch();
            refetchBudgetSummary();
            refetchIncomeSummary();
            refetchDashboardInsights();
            activeSwipeableRef.current?.close?.();
            activeSwipeableRef.current = null;
            activeSwipeableIdRef.current = null;

            return () => {
                activeSwipeableRef.current?.close?.();
                activeSwipeableRef.current = null;
                activeSwipeableIdRef.current = null;
            };
        }, [refetch, refetchBudgetSummary, refetchIncomeSummary, refetchDashboardInsights]),
    );

    const refetchAll = useCallback(() => {
        refetch();
        refetchBudgetSummary();
        refetchIncomeSummary();
        refetchDashboardInsights();
    }, [refetch, refetchBudgetSummary, refetchIncomeSummary, refetchDashboardInsights]);

    const deleteMutation = useMutation({
        mutationFn: (id: string) => expensesApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            queryClient.invalidateQueries({ queryKey: ['analytics'] });
            queryClient.invalidateQueries({ queryKey: ['history'] });
            queryClient.invalidateQueries({ queryKey: ['income-summary'] });
        },
    });

    const onDeleteExpense = (id: string) => {
        alert(t('expense.deleteTitle'), t('expense.deleteMessage'), [
            { text: t('common.cancel'), style: 'cancel' },
            {
                text: t('common.delete'),
                style: 'destructive',
                onPress: () => deleteMutation.mutate(id),
            },
        ]);
    };

    return {
        todayData,
        budgetSummary,
        incomeSummary,
        dashboardInsights,
        isLoading: loadingToday || loadingBudgetSummary || loadingIncomeSummary,
        todayError,
        budgetSummaryError,
        incomeSummaryError,
        dashboardInsightsError,
        refetch: refetchAll,
        onDeleteExpense,
        activeSwipeableRef,
        activeSwipeableIdRef,
    };
}
