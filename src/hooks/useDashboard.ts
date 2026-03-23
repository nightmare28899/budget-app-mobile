import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { expensesApi } from '../api/expenses';
import { analyticsApi } from '../api/analytics';
import { useAppAlert } from '../components/alerts/AlertProvider';
import { useI18n } from './useI18n';

export function useDashboard() {
    const queryClient = useQueryClient();
    const { alert } = useAppAlert();
    const { t } = useI18n();
    const activeSwipeableRef = useRef<any>(null);
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
        queryFn: analyticsApi.getBudgetSummary,
    });

    useFocusEffect(
        useCallback(() => {
            refetch();
            refetchBudgetSummary();
            activeSwipeableRef.current?.close?.();
            activeSwipeableRef.current = null;
            activeSwipeableIdRef.current = null;

            return () => {
                activeSwipeableRef.current?.close?.();
                activeSwipeableRef.current = null;
                activeSwipeableIdRef.current = null;
            };
        }, [refetch, refetchBudgetSummary]),
    );

    const refetchAll = useCallback(() => {
        refetch();
        refetchBudgetSummary();
    }, [refetch, refetchBudgetSummary]);

    const deleteMutation = useMutation({
        mutationFn: (id: string) => expensesApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            queryClient.invalidateQueries({ queryKey: ['analytics'] });
            queryClient.invalidateQueries({ queryKey: ['history'] });
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
        isLoading: loadingToday || loadingBudgetSummary,
        todayError,
        budgetSummaryError,
        refetch: refetchAll,
        onDeleteExpense,
        activeSwipeableRef,
        activeSwipeableIdRef,
    };
}
