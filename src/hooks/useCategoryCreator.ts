import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { categoriesApi } from '../api/categories';
import { useAppAlert } from '../components/alerts/AlertProvider';
import { extractApiMessage } from '../utils/api';
import { useI18n } from './useI18n';
import { API_BASE_URL } from '../utils/constants';

export const CATEGORY_ICON_OPTIONS = [
    'fast-food-outline',
    'car-sport-outline',
    'bag-handle-outline',
    'film-outline',
    'medkit-outline',
    'document-text-outline',
    'airplane-outline',
    'cafe-outline',
    'game-controller-outline',
    'cube-outline',
] as const;

export const CATEGORY_COLOR_OPTIONS = [
    '#FF6B6B',
    '#4ECDC4',
    '#45B7D1',
    '#96CEB4',
    '#FFEAA7',
    '#DDA0DD',
    '#95A5A6',
    '#F39C12',
    '#2ECC71',
    '#E74C3C',
] as const;

export function useCategoryCreator(onSuccessCallback?: (id: string) => void) {
    const queryClient = useQueryClient();
    const { alert } = useAppAlert();
    const { t } = useI18n();

    const [showCategoryCreator, setShowCategoryCreator] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryIcon, setNewCategoryIcon] = useState<string>(CATEGORY_ICON_OPTIONS[0]);
    const [newCategoryColor, setNewCategoryColor] = useState<string>(CATEGORY_COLOR_OPTIONS[0]);

    const resolveDuplicateCategory = async () => {
        const createdName = newCategoryName.trim().toLowerCase();
        if (!createdName) {
            return false;
        }

        try {
            const categories = await queryClient.fetchQuery({
                queryKey: ['categories'],
                queryFn: categoriesApi.getAll,
            });
            const existing = categories.find(
                (item) => item.name.trim().toLowerCase() === createdName,
            );

            if (!existing) {
                return false;
            }

            setShowCategoryCreator(false);
            setNewCategoryName('');
            alert(t('common.success'), t('category.existsSelected'));
            onSuccessCallback?.(existing.id);
            return true;
        } catch {
            return false;
        }
    };

    const createCategoryMutation = useMutation({
        mutationFn: () =>
            categoriesApi.create({
                name: newCategoryName.trim(),
                icon: newCategoryIcon,
                color: newCategoryColor,
            }),
        onSuccess: (created) => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            setNewCategoryName('');
            setShowCategoryCreator(false);
            alert(t('common.success'), t('category.created'));
            if (onSuccessCallback && created.id) {
                onSuccessCallback(created.id);
            }
        },
        onError: async (err: any) => {
            if (err?.response?.status === 409) {
                const matched = await resolveDuplicateCategory();
                if (matched) {
                    return;
                }
            }

            if (!err?.response && (err?.code === 'ERR_NETWORK' || err?.message === 'Network Error')) {
                alert(
                    t('common.error'),
                    t('network.cannotReachApi', { baseUrl: API_BASE_URL }),
                );
                return;
            }

            alert(
                t('common.error'),
                extractApiMessage(err?.response?.data) || t('category.failedCreate'),
            );
        },
    });

    const onCreateCategory = () => {
        if (newCategoryName.trim().length < 2) {
            alert(t('common.error'), t('category.enterName'));
            return;
        }
        createCategoryMutation.mutate();
    };

    return {
        showCategoryCreator, setShowCategoryCreator,
        newCategoryName, setNewCategoryName,
        newCategoryIcon, setNewCategoryIcon,
        newCategoryColor, setNewCategoryColor,
        isPending: createCategoryMutation.isPending,
        onCreateCategory,
    };
}
