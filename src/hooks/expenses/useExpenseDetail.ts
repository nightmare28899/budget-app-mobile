import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { expensesApi } from '../../api/resources/expenses';
import { categoriesApi } from '../../api/resources/categories';
import { useAppAlert } from '../../components/alerts/AlertProvider';
import { useI18n } from '../shared/useI18n';

export function useExpenseDetail(id: string, onDeleted: () => void) {
    const queryClient = useQueryClient();
    const { alert } = useAppAlert();
    const { t } = useI18n();

    const { data: expense, isLoading } = useQuery({
        queryKey: ['expense', id],
        queryFn: () => expensesApi.getOne(id),
    });
    const categoryId = expense?.categoryId ?? expense?.category?.id;
    const { data: categories = [], isLoading: categoriesLoading } = useQuery({
        queryKey: ['categories'],
        queryFn: categoriesApi.getAll,
        enabled: Boolean(categoryId && !expense?.category?.name),
    });
    const resolvedCategory = expense?.category?.name
        ? expense.category
        : categories.find((category) => category.id === categoryId);
    const resolvedExpense = expense && resolvedCategory
        ? { ...expense, category: resolvedCategory }
        : expense;

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
        expense: resolvedExpense,
        isLoading: isLoading || (
            Boolean(categoryId && !expense?.category?.name) && categoriesLoading
        ),
        onDelete,
    };
}
