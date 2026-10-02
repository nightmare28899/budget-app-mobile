import { useCallback, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { incomesApi } from '../../api/resources/incomes';
import { useAppAlert } from '../../components/alerts/AlertProvider';
import { useI18n } from '../shared/useI18n';
import { SwipeableRef } from '../../types/swipeable';

type NavigationLike = {
    setParams: (params: { successMessage?: string | undefined }) => void;
};

type UseIncomesScreenParams = {
    navigation: NavigationLike;
    successMessage?: string;
    enabled?: boolean;
};

export function useIncomesScreen({
    navigation,
    successMessage,
    enabled = true,
}: UseIncomesScreenParams) {
    const queryClient = useQueryClient();
    const { alert } = useAppAlert();
    const { t } = useI18n();
    const activeSwipeableRef = useRef<SwipeableRef | null>(null);
    const activeSwipeableIdRef = useRef<string | null>(null);

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
        enabled,
    });

    useEffect(() => {
        if (!successMessage) {
            return;
        }

        alert(t('common.success'), successMessage);
        navigation.setParams({ successMessage: undefined });
        refetch();
    }, [alert, navigation, refetch, successMessage, t]);

    useFocusEffect(
        useCallback(() => {
            activeSwipeableRef.current?.close?.();
            activeSwipeableRef.current = null;
            activeSwipeableIdRef.current = null;

            return () => {
                activeSwipeableRef.current?.close?.();
                activeSwipeableRef.current = null;
                activeSwipeableIdRef.current = null;
            };
        }, []),
    );

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
        activeSwipeableRef,
        activeSwipeableIdRef,
    };
}
