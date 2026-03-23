import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { normalizeImageUri } from '../utils/media';
import { budgetLabel } from '../utils/budget';
import { useTheme } from '../theme';
import { useI18n } from './useI18n';
import { useAppAlert } from '../components/alerts/AlertProvider';
import { useHomeScreenViewModel } from '../viewmodels/useHomeScreenViewModel';

type NavigationLike = {
    setParams: (params: any) => void;
};

type UseDashboardScreenParams = {
    successMessage?: string;
    navigation: NavigationLike;
    upcomingDays?: number;
    recentLimit?: number;
};

export function useDashboardScreen({
    successMessage,
    navigation,
    upcomingDays = 3,
    recentLimit = 5,
}: UseDashboardScreenParams) {
    const user = useAuthStore((s) => s.user);
    const { colors } = useTheme();
    const { alert } = useAppAlert();
    const { t, language } = useI18n();
    const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);

    const viewModel = useHomeScreenViewModel({
        upcomingDays,
        recentLimit,
    });

    const avatarUri = useMemo(() => {
        const preferredAvatar =
            user?.avatarUri !== undefined ? user.avatarUri : user?.avatarUrl;
        return normalizeImageUri(preferredAvatar ?? null);
    }, [user?.avatarUri, user?.avatarUrl]);

    const fallbackInitial = (user?.name?.trim()?.charAt(0) || 'U').toUpperCase();

    useEffect(() => {
        setAvatarLoadFailed(false);
    }, [avatarUri]);

    useEffect(() => {
        if (successMessage) {
            alert(t('common.success'), successMessage);
            navigation.setParams({ successMessage: undefined });
        }
    }, [successMessage, alert, navigation, t]);

    const periodLabel = budgetLabel(viewModel.periodType, t);

    const usagePercentage = useMemo(() => {
        if (viewModel.budget <= 0) {
            return viewModel.total > 0 ? 101 : 0;
        }
        return Math.round((viewModel.total / viewModel.budget) * 100);
    }, [viewModel.budget, viewModel.total]);

    const statusColor = useMemo(() => {
        if (usagePercentage > 100) {
            return colors.budgetDanger;
        }
        if (usagePercentage >= 80 && usagePercentage <= 99) {
            return colors.budgetWarning;
        }
        if (usagePercentage === 100) {
            return colors.budgetWarning;
        }
        return colors.budgetSafe;
    }, [
        colors.budgetDanger,
        colors.budgetSafe,
        colors.budgetWarning,
        usagePercentage,
    ]);

    return {
        user,
        avatarUri,
        avatarLoadFailed,
        setAvatarLoadFailed,
        fallbackInitial,
        periodLabel,
        usagePercentage,
        statusColor,
        language,
        ...viewModel,
    };
}
