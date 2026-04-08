import { useCallback, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { incomesApi } from '../api/incomes';
import { useAppAlert } from '../components/alerts/AlertProvider';
import { useI18n } from './useI18n';

type NavigationLike = {
    setParams: (params: any) => void;
};

type UseIncomesScreenParams = {
    navigation: NavigationLike;
    successMessage?: string;
};

export function useIncomesScreen({
    navigation,
    successMessage,
}: UseIncomesScreenParams) {
    const queryClient = useQueryClient();
    const { alert } = useAppAlert();
    const { t } = useI18n();

    const {
        data,
        isLoading,
        isRefetching,
        error,
        refetch,
    } = useQuery({
        queryKey: ['incomes', 'list'],
        queryFn: () => incomesApi.getAll(),
        staleTime: 30_000,
    });

    useEffect(() => {
        if (!successMessage) {
            return;
        }

        alert(t('common.success'), successMessage);
        navigation.setParams({ successMessage: undefined });
        refetch();
    }, [alert, navigation, refetch, successMessage, t]);

    const deleteMutation = useMutation({
        mutationFn: (id: string) => incomesApi.remove(id),
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['incomes'] }),
                queryClient.invalidateQueries({ queryKey: ['income-summary'] }),
                queryClient.invalidateQueries({ queryKey: ['analytics'] }),
            ]);
        },
    });

    const onDeleteIncome = useCallback((id: string, title: string) => {
        alert(t('income.deleteTitle'), t('income.deleteMessage', { title }), [
            { text: t('common.cancel'), style: 'cancel' },
            {
                text: t('common.delete'),
                style: 'destructive',
                onPress: () => deleteMutation.mutate(id),
            },
        ]);
    }, [alert, deleteMutation, t]);

    return {
        incomes: data?.incomes ?? [],
        total: data?.total ?? 0,
        totalCount: data?.count ?? 0,
        currencyBreakdown: data?.currencyBreakdown ?? [],
        isLoading,
        isRefreshing: isRefetching,
        error,
        refetch,
        onDeleteIncome,
    };
}
