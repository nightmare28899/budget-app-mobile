import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { expensesApi } from '../api/expenses';
import { useAppAlert } from '../components/alerts/AlertProvider';
import { useI18n } from './useI18n';

export function useExpenseDetail(id: string, onDeleted: () => void) {
    const queryClient = useQueryClient();
    const { alert } = useAppAlert();
    const { t } = useI18n();

    const { data: expense, isLoading } = useQuery({
        queryKey: ['expense', id],
        queryFn: () => expensesApi.getOne(id),
    });

    const deleteMutation = useMutation({
        mutationFn: () => expensesApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            onDeleted();
        },
    });

    const onDelete = useCallback(() => {
        alert(
            t('expenseDetail.deleteTitle'),
            t('expenseDetail.deleteMessage'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.delete'),
                    style: 'destructive',
                    onPress: () => deleteMutation.mutate(),
                },
            ],
        );
    }, [alert, deleteMutation, t]);

    return {
        expense,
        isLoading,
        onDelete,
    };
}
