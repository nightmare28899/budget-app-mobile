import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { creditCardsApi } from '../api/creditCards';
import {
    CreateCreditCardPayload,
    UpdateCreditCardPayload,
} from '../types';
import { useAppAlert } from '../components/alerts/AlertProvider';
import { useI18n } from './useI18n';
import { extractApiMessage, extractPremiumRequiredError } from '../utils/api';

type UseCreditCardsCatalogOptions = {
    includeInactive?: boolean;
    enabled?: boolean;
};

function toQueryKey(includeInactive?: boolean) {
    return ['creditCards', includeInactive ? 'all' : 'active'];
}

export function useCreditCardsCatalog(options?: UseCreditCardsCatalogOptions) {
    const includeInactive = options?.includeInactive === true;
    const enabled = options?.enabled ?? true;
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

    const query = useQuery({
        queryKey: toQueryKey(includeInactive),
        queryFn: () => creditCardsApi.getAll({ includeInactive }),
        enabled,
    });

    const invalidateCards = () => {
        queryClient.invalidateQueries({ queryKey: ['creditCards'] });
    };

    const createMutation = useMutation({
        mutationFn: (payload: CreateCreditCardPayload) => creditCardsApi.create(payload),
        onSuccess: invalidateCards,
        onError: (error: any) => {
            handleMutationError(error?.response?.data, t('creditCards.failedCreate'));
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: UpdateCreditCardPayload }) =>
            creditCardsApi.update(id, payload),
        onSuccess: invalidateCards,
        onError: (error: any) => {
            handleMutationError(error?.response?.data, t('creditCards.failedUpdate'));
        },
    });

    const deactivateMutation = useMutation({
        mutationFn: (id: string) => creditCardsApi.deactivate(id),
        onSuccess: invalidateCards,
        onError: (error: any) => {
            handleMutationError(error?.response?.data, t('creditCards.failedRemove'));
        },
    });

    return {
        cards: query.data ?? [],
        isLoading: query.isLoading,
        isRefreshing: query.isRefetching,
        refetch: query.refetch,
        createCard: (payload: CreateCreditCardPayload) => createMutation.mutateAsync(payload),
        updateCard: (id: string, payload: UpdateCreditCardPayload) =>
            updateMutation.mutateAsync({ id, payload }),
        deactivateCard: (id: string) => deactivateMutation.mutateAsync(id),
        isCreating: createMutation.isPending,
        isUpdating: updateMutation.isPending,
        isRemoving: deactivateMutation.isPending,
    };
}
