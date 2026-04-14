import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { subscriptionsApi } from '../../api/resources/subscriptions';
import { useAppAlert } from '../../components/alerts/AlertProvider';
import { useI18n } from '../../hooks/useI18n';
import { toNum } from '../../utils/core/number';
import { CreateSubscriptionPayload, UpdateSubscriptionPayload } from '../../types/index';
import {
    listUpcomingSubscriptions,
    toSubscriptionManagerItems,
} from './subscriptionManager';
import { aggregateCurrencyTotals } from '../../utils/domain/currency';
import {
    extractApiMessage,
    extractPremiumRequiredError,
    getApiErrorData,
} from '../../utils/platform/api';

export function useSubscriptionManager() {
    const queryClient = useQueryClient();
    const { alert } = useAppAlert();
    const { t } = useI18n();

    const handleMutationError = (payload: unknown, fallbackMessage: string) => {
        const premiumError = extractPremiumRequiredError(payload);
        if (premiumError) {
            return;
        }

        alert(
            t('common.error'),
            extractApiMessage(payload) || fallbackMessage,
        );
    };

    const {
        data: allSubscriptions = [],
        isLoading: loadingSubscriptions,
        isRefetching: refetchingSubscriptions,
        refetch: refetchSubscriptions,
    } = useQuery({
        queryKey: ['subscriptions', 'list'],
        queryFn: subscriptionsApi.getAll,
    });

    const {
        data: projection,
        isLoading: loadingProjection,
        isRefetching: refetchingProjection,
        refetch: refetchProjection,
    } = useQuery({
        queryKey: ['subscriptions', 'projection'],
        queryFn: subscriptionsApi.getProjection,
    });

    const createMutation = useMutation({
        mutationFn: (payload: CreateSubscriptionPayload) =>
            subscriptionsApi.create(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
            queryClient.invalidateQueries({ queryKey: ['history'] });
            queryClient.invalidateQueries({ queryKey: ['analytics'] });
        },
        onError: (error: unknown) => {
            handleMutationError(getApiErrorData(error), t('subscriptions.failedCreate'));
        },
    });

    const removeMutation = useMutation({
        mutationFn: (id: string) => subscriptionsApi.remove(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
            queryClient.invalidateQueries({ queryKey: ['history'] });
            queryClient.invalidateQueries({ queryKey: ['analytics'] });
        },
        onError: (error: unknown) => {
            handleMutationError(getApiErrorData(error), t('subscriptions.failedRemove'));
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
        onError: (error: unknown) => {
            handleMutationError(getApiErrorData(error), t('subscriptions.failedUpdate'));
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
    const monthlyCurrencyBreakdown = useMemo(
        () =>
            projection?.currencyBreakdown?.length
                ? projection.currencyBreakdown.map((item) => ({
                    currency: item.currency,
                    total: item.monthlyCost,
                }))
                : aggregateCurrencyTotals(
                    sortedSubscriptions,
                    (item) => item.cost,
                    (item) => item.currency,
                ),
        [projection?.currencyBreakdown, sortedSubscriptions],
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
        monthlyCurrencyBreakdown,
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
