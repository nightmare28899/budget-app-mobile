import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { expensesApi } from '../api/resources/expenses';
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
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['expenses'] }),
                queryClient.invalidateQueries({ queryKey: ['history'] }),
                queryClient.invalidateQueries({ queryKey: ['analytics'] }),
                queryClient.invalidateQueries({ queryKey: ['income-summary'] }),
            ]);
            onDeleted();
        },
    });

    const onDelete = useCallback(() => {
        alert(
            t('expenseDetail.deleteTitle'),
            expense?.isInstallment
                ? t('expenseDetail.deleteInstallmentMessage')
                : t('expenseDetail.deleteMessage'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.delete'),
                    style: 'destructive',
                    onPress: () => deleteMutation.mutate(),
                },
            ],
        );
    }, [alert, deleteMutation, expense?.isInstallment, t]);

    return {
        expense,
        isLoading,
        onDelete,
    };
}
