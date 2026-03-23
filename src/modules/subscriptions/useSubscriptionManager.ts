import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { subscriptionsApi } from '../../api/subscriptions';
import { useAuthStore } from '../../store/authStore';
import { useAppAlert } from '../../components/alerts/AlertProvider';
import { useI18n } from '../../hooks/useI18n';
import { toNum } from '../../utils/number';
import { CreateSubscriptionPayload, UpdateSubscriptionPayload } from '../../types';
import {
    listUpcomingSubscriptions,
    toSubscriptionManagerItems,
} from './subscriptionManager';

export function useSubscriptionManager() {
    const queryClient = useQueryClient();
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const { alert } = useAppAlert();
    const { t } = useI18n();

    const {
        data: allSubscriptions = [],
        isLoading: loadingSubscriptions,
        isRefetching: refetchingSubscriptions,
        refetch: refetchSubscriptions,
    } = useQuery({
        queryKey: ['subscriptions', 'list'],
        queryFn: subscriptionsApi.getAll,
        enabled: isAuthenticated,
    });

    const {
        data: projection,
        isLoading: loadingProjection,
        isRefetching: refetchingProjection,
        refetch: refetchProjection,
    } = useQuery({
        queryKey: ['subscriptions', 'projection'],
        queryFn: subscriptionsApi.getProjection,
        enabled: isAuthenticated,
    });

    const createMutation = useMutation({
        mutationFn: (payload: CreateSubscriptionPayload) =>
            subscriptionsApi.create(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
            queryClient.invalidateQueries({ queryKey: ['history'] });
            queryClient.invalidateQueries({ queryKey: ['analytics'] });
        },
        onError: () => {
            alert(t('common.error'), t('subscriptions.failedCreate'));
        },
    });

    const removeMutation = useMutation({
        mutationFn: (id: string) => subscriptionsApi.remove(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
            queryClient.invalidateQueries({ queryKey: ['history'] });
            queryClient.invalidateQueries({ queryKey: ['analytics'] });
        },
        onError: () => {
            alert(t('common.error'), t('subscriptions.failedRemove'));
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: UpdateSubscriptionPayload }) =>
            subscriptionsApi.update(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
            queryClient.invalidateQueries({ queryKey: ['history'] });
            queryClient.invalidateQueries({ queryKey: ['analytics'] });
        },
        onError: () => {
            alert(t('common.error'), t('subscriptions.failedUpdate'));
        },
    });

    const sortedSubscriptions = useMemo(
        () =>
            allSubscriptions
                .filter((item) => item.isActive !== false)
                .sort((a, b) =>
                    a.chargeDate.localeCompare(b.chargeDate),
                ),
        [allSubscriptions],
    );

    const managedSubscriptions = useMemo(
        () => toSubscriptionManagerItems(sortedSubscriptions),
        [sortedSubscriptions],
    );

    const fallbackTotal = useMemo(
        () => managedSubscriptions.reduce((sum, item) => sum + toNum(item.amount), 0),
        [managedSubscriptions],
    );

    const monthlyTotal = useMemo(
        () => toNum(projection?.totalMonthlyCost ?? fallbackTotal),
        [fallbackTotal, projection?.totalMonthlyCost],
    );

    const upcomingInThreeDays = useMemo(
        () => listUpcomingSubscriptions(managedSubscriptions, 3),
        [managedSubscriptions],
    );

    const refetch = () => {
        refetchSubscriptions();
        refetchProjection();
    };

    const createSubscription = async (payload: CreateSubscriptionPayload) => {
        await createMutation.mutateAsync(payload);
    };

    const removeSubscription = async (id: string) => {
        await removeMutation.mutateAsync(id);
    };

    const updateSubscription = async (id: string, payload: UpdateSubscriptionPayload) => {
        await updateMutation.mutateAsync({ id, payload });
    };

    return {
        isLoading: loadingSubscriptions || loadingProjection,
        isRefreshing: refetchingSubscriptions || refetchingProjection,
        subscriptions: sortedSubscriptions,
        managedSubscriptions,
        monthlyTotal,
        activeCount: projection?.activeCount ?? sortedSubscriptions.length,
        upcomingInThreeDays,
        refetch,
        createSubscription,
        updateSubscription,
        removeSubscription,
        isCreating: createMutation.isPending,
        isUpdating: updateMutation.isPending,
        isRemoving: removeMutation.isPending,
    };
}
