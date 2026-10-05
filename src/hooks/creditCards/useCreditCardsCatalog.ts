import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { creditCardsApi, CreditCardPermanentDeleteResult } from '../../api/resources/creditCards';
import {
    CreateCreditCardPayload,
    UpdateCreditCardPayload,
} from '../../types/index';
import { useAppAlert } from '../../components/alerts/AlertProvider';
import { useI18n } from '../shared/useI18n';
import {
    extractApiMessage,
    extractPremiumRequiredError,
    getApiErrorData,
} from '../../utils/platform/api';
import { getCreditCardHasStatementsCount } from '../../utils/domain/creditCards';
import { clearPaymentDue } from '../../utils/platform/androidLiveUpdates';

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
        onError: (error: unknown) => {
            handleMutationError(getApiErrorData(error), t('creditCards.failedCreate'));
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: UpdateCreditCardPayload }) =>
            creditCardsApi.update(id, payload),
        onSuccess: invalidateCards,
        onError: (error: unknown) => {
            handleMutationError(getApiErrorData(error), t('creditCards.failedUpdate'));
        },
    });

    const deactivateMutation = useMutation({
        mutationFn: (id: string) => creditCardsApi.deactivate(id),
        onSuccess: invalidateCards,
        onError: (error: unknown) => {
            handleMutationError(getApiErrorData(error), t('creditCards.failedRemove'));
        },
    });

    const deletePermanentlyMutation = useMutation({
        mutationFn: (id: string) => creditCardsApi.removePermanently(id),
        onSuccess: (result: CreditCardPermanentDeleteResult) => {
            clearPaymentDue(result.id);
            invalidateCards();
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
            queryClient.invalidateQueries({ queryKey: ['history'] });
            queryClient.invalidateQueries({ queryKey: ['analytics'] });
        },
        onError: (error: unknown) => {
            const statementCount = getCreditCardHasStatementsCount(error);
            if (statementCount !== null) {
                alert(
                    t('common.error'),
                    t('creditCards.deletePermanentHasStatements', { count: statementCount }),
                );
                return;
            }
            handleMutationError(
                getApiErrorData(error),
                t('creditCards.deletePermanentFailed'),
            );
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
        deleteCardPermanently: (id: string) => deletePermanentlyMutation.mutateAsync(id),
        isDeletingPermanently: deletePermanentlyMutation.isPending,
        isCreating: createMutation.isPending,
        isUpdating: updateMutation.isPending,
        isRemoving: deactivateMutation.isPending,
    };
}
