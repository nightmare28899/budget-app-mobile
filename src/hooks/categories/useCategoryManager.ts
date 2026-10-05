import { useMutation, useQueryClient } from '@tanstack/react-query';
import { categoriesApi } from '../../api/resources/categories';
import { useAppAlert } from '../../components/alerts/AlertProvider';
import { extractApiMessage, getApiErrorData } from '../../utils/platform/api';
import {
    buildCategoryUpdatePayload,
    CategoryEditableFields,
    isCategoryInUseError,
} from '../../utils/domain/categoryManagement';
import { useI18n } from '../shared/useI18n';

type ManagedCategory = CategoryEditableFields & { id: string };

export function useCategoryManager(onDone?: () => void) {
    const queryClient = useQueryClient();
    const { alert } = useAppAlert();
    const { t } = useI18n();

    const refresh = async () => {
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['categories'] }),
            queryClient.invalidateQueries({ queryKey: ['analytics'] }),
            queryClient.invalidateQueries({ queryKey: ['expenses'] }),
            queryClient.invalidateQueries({ queryKey: ['history'] }),
        ]);
    };

    const updateMutation = useMutation({
        mutationFn: async (params: {
            original: ManagedCategory;
            next: Partial<CategoryEditableFields>;
        }) => {
            const payload = buildCategoryUpdatePayload(params.next, params.original);
            if (Object.keys(payload).length === 0) {
                return null;
            }
            return categoriesApi.update(params.original.id, payload);
        },
        onSuccess: async () => {
            await refresh();
            onDone?.();
        },
        onError: (error: unknown) => {
            alert(
                t('common.error'),
                extractApiMessage(getApiErrorData(error))
                    || t('parity.category.failedUpdate'),
            );
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => categoriesApi.remove(id),
        onSuccess: async () => {
            await refresh();
            onDone?.();
        },
        onError: (error: unknown) => {
            alert(
                t('common.error'),
                isCategoryInUseError(error)
                    ? t('parity.category.inUse')
                    : t('parity.category.failedDelete'),
            );
        },
    });

    const confirmDelete = (category: { id: string; name: string }) => {
        alert(
            t('parity.category.deleteTitle'),
            t('parity.category.deleteMessage', { name: category.name }),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.delete'),
                    style: 'destructive',
                    onPress: () => deleteMutation.mutate(category.id),
                },
            ],
        );
    };

    return {
        updateCategory: updateMutation.mutate,
        confirmDelete,
        isPending: updateMutation.isPending || deleteMutation.isPending,
    };
}
