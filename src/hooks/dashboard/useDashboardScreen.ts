import { useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { normalizeImageUri } from '../../utils/platform/media';
import { budgetLabel } from '../../utils/domain/budget';
import { useTheme } from '../../theme/index';
import { useI18n } from '../shared/useI18n';
import { useAppAlert } from '../../components/alerts/AlertProvider';
import { useHomeScreenViewModel } from './useHomeScreenViewModel';
import {
    createAndroidBudgetWidgetSnapshot,
    syncAndroidBudgetWidget,
} from '../../utils/platform/androidBudgetWidget';
import { registerDashboardRefreshHandler } from '../../navigation/navigationBridge';
import { subscriptionsApi } from '../../api/resources/subscriptions';
import {
    createAndroidUpcomingPaymentsWidgetSnapshot,
    syncAndroidUpcomingPaymentsWidget,
} from '../../utils/platform/androidUpcomingPaymentsWidget';

const UPCOMING_WIDGET_DAYS = 7;

type NavigationLike = {
    setParams: (params: { successMessage?: string | undefined }) => void;
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
    const {
        data: upcomingWidgetCharges,
        isLoading: upcomingWidgetLoading,
        isRefetching: upcomingWidgetRefetching,
        error: upcomingWidgetError,
    } = useQuery({
        queryKey: ['subscriptions', 'upcoming', UPCOMING_WIDGET_DAYS],
        queryFn: () => subscriptionsApi.getUpcoming(UPCOMING_WIDGET_DAYS),
        staleTime: 30_000,
        enabled: Platform.OS === 'android',
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

    useEffect(() => {
        syncAndroidUpcomingPaymentsWidget(
            createAndroidUpcomingPaymentsWidgetSnapshot({
                language,
                isLoading: upcomingWidgetLoading && !upcomingWidgetCharges,
                isSyncing: upcomingWidgetRefetching,
                hasError: !!upcomingWidgetError,
                charges: upcomingWidgetCharges ?? [],
                windowDays: UPCOMING_WIDGET_DAYS,
                fallbackCurrency: user?.currency,
            }),
        );
    }, [
        language,
        upcomingWidgetCharges,
        upcomingWidgetError,
        upcomingWidgetLoading,
        upcomingWidgetRefetching,
        user?.currency,
    ]);

    useEffect(
        () => registerDashboardRefreshHandler(viewModel.refetch),
        [viewModel.refetch],
    );

    useEffect(() => {
        syncAndroidBudgetWidget(createAndroidBudgetWidgetSnapshot({
            language,
            isLoading: viewModel.showSkeleton,
            isSyncing: viewModel.isLoading || viewModel.historyRefetching,
            hasError: viewModel.hasBudgetError,
            budget: viewModel.budget,
            spent: viewModel.total,
            safeToSpend: viewModel.safeToSpend,
            periodLabel,
            currency: user?.currency,
        }));
    }, [
        language,
        periodLabel,
        user?.currency,
        viewModel.budget,
        viewModel.hasBudgetError,
        viewModel.historyRefetching,
        viewModel.isLoading,
        viewModel.safeToSpend,
        viewModel.showSkeleton,
        viewModel.total,
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
