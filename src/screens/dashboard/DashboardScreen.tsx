import React from 'react';
import {
    Image,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { DrawerActions } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { MainTabScreenProps } from '../../navigation/types';
import { CategoryIcon } from '../../components/CategoryIcon';
import { EmptyState } from '../../components/ui/primitives/EmptyState';
import { DashboardSkeleton, Skeleton } from '../../components/ui/primitives/Skeleton';
import { formatCurrency, formatDate } from '../../utils/core/format';
import { getCurrencyLocale } from '../../utils/domain/currency';
import {
    getPaymentMethodOption,
    PAYMENT_METHOD_FALLBACK_ICON,
} from '../../utils/domain/paymentMethod';
import {
    borderRadius,
    spacing,
    typography,
    useResponsive,
    useTheme,
    useThemedStyles,
    SemanticColors,
} from '../../theme/index';
import { AnimatedScreen } from '../../components/ui/primitives/AnimatedScreen';
import { useDashboardScreen } from '../../hooks/dashboard/useDashboardScreen';
import { useI18n } from '../../hooks/shared/useI18n';
import { HomeBackground } from '../../components/ui/layout/HomeBackground';
import { useBottomDockScrollVisibility } from '../../navigation/bottomDockVisibility';
import { getMainTabListBottomPadding } from '../../navigation/mainTabLayout';
import { formatCreditCardLabel } from '../../utils/domain/creditCards';
import { getInstallmentProgress, isInstallmentExpense } from '../../utils/domain/installments';
import { withAlpha } from '../../utils/domain/subscriptions';

export function DashboardScreen({ route, navigation }: MainTabScreenProps<'Dashboard'>) {
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);
    const {
        horizontalPadding,
        contentMaxWidth,
        isSmallPhone,
        isTablet,
        scaleFont,
        scaleSize,
    } = useResponsive();
    const { t, language } = useI18n();
    const locale = getCurrencyLocale(language);

    const {
        user,
        avatarUri,
        avatarLoadFailed,
        setAvatarLoadFailed,
        fallbackInitial,
        usagePercentage,
        total,
        budget,
        reservedSubscriptions,
        safeToSpend,
        totalIncome,
        totalExpenses,
        netCashflow,
        savingsRate,
        actionItems,
        priorityCategoryBudget,
        isCategoryBudgetLoading,
        hasCategoryBudgetError,
        refetchCategoryBudgets,
        upcomingSubscriptions,
        isUpcomingLoading,
        hasUpcomingError,
        hasHistoryError,
        hasBudgetError,
        hasCashflowError,
        recentUnifiedHistory,
        isLoading,
        historyLoading,
        historyRefetching,
        showSkeleton,
        refetch,
    } = useDashboardScreen({
        successMessage: route.params?.successMessage,
        navigation,
    });

    const profileBadgeSize = isSmallPhone ? scaleSize(42, 0.75) : scaleSize(46, 0.75);
    const profileInitialFont = scaleFont(typography.fontSize.lg);
    const scrollBottomPadding = getMainTabListBottomPadding({
        insetsBottom: insets.bottom,
        isSmallPhone,
        isTablet,
        scaleSize,
        extraSpacing: isTablet ? spacing.xl : spacing.base,
    });
    const progressWidth: `${number}%` = `${Math.min(Math.max(usagePercentage, 0), 100)}%`;
    const hasDashboardError = hasHistoryError || hasBudgetError;
    const shouldShowUpcomingSection =
        isUpcomingLoading || hasUpcomingError || upcomingSubscriptions.length > 0;
    const greetingName = user?.name?.trim()?.split(/\s+/)[0] || null;
    const bottomDockScroll = useBottomDockScrollVisibility();
    const constrainedContentStyle = contentMaxWidth
        ? { maxWidth: contentMaxWidth, alignSelf: 'center' as const, width: '100%' as const }
        : null;
    const primaryCardHorizontalPadding = isSmallPhone
        ? scaleSize(spacing.lg, 0.46)
        : scaleSize(spacing.xl, 0.5);
    const primaryCardVerticalPadding = isSmallPhone
        ? scaleSize(spacing.base, 0.4)
        : scaleSize(spacing.lg, 0.42);
    const secondaryCardPadding = scaleSize(spacing.base, 0.5);
    const budgetAmountFontSize = isTablet
        ? scaleFont(typography.fontSize['3xl'], 0.52)
        : isSmallPhone
            ? scaleFont(typography.fontSize['3xl'])
            : scaleFont(typography.fontSize['3xl'], 0.42);
    const cashflowTone = netCashflow >= 0 ? colors.success : colors.error;
    const shouldShowCashflow = !hasCashflowError && (
        totalIncome !== 0
        || totalExpenses !== 0
        || netCashflow !== 0
        || savingsRate !== null
    );
    const categoryBudgetPercentage = priorityCategoryBudget?.budgetAmount
        ? Math.round((priorityCategoryBudget.spent / priorityCategoryBudget.budgetAmount) * 100)
        : 0;
    const categoryBudgetProgressWidth: `${number}%` = `${Math.min(
        Math.max(categoryBudgetPercentage, 0),
        100,
    )}%`;
    const categoryBudgetTone = priorityCategoryBudget?.status === 'off_track'
        ? colors.error
        : priorityCategoryBudget?.status === 'watch'
            ? colors.warning
            : colors.success;
    const categoryBudgetStatusLabel = priorityCategoryBudget?.status === 'off_track'
        ? t('categoryBudgets.statusOffTrack')
        : priorityCategoryBudget?.status === 'watch'
            ? t('categoryBudgets.statusWatch')
            : t('categoryBudgets.statusOnTrack');
    const resolveActionTone = (tone: 'info' | 'warning' | 'success' | 'danger') => {
        if (tone === 'success') {
            return { color: colors.success, background: withAlpha(colors.success, 0.12) };
        }
        if (tone === 'warning') {
            return { color: colors.warning, background: withAlpha(colors.warning, 0.12) };
        }
        if (tone === 'danger') {
            return { color: colors.error, background: withAlpha(colors.error, 0.12) };
        }
        return { color: colors.primaryAction, background: withAlpha(colors.primaryAction, 0.12) };
    };
    const onOpenUpcoming = () => {
        const drawerNavigation = navigation.getParent();
        if (drawerNavigation) {
            (drawerNavigation.navigate as (...args: [string, object?]) => void)(
                'UpcomingSubscriptions',
                { upcomingDays: 3 },
            );
            return;
        }

        navigation.navigate('Activity', { initialTab: 'subscriptions' });
    };
    const onOpenSavings = () => {
        const drawerNavigation = navigation.getParent();
        if (drawerNavigation) {
            (drawerNavigation.navigate as (...args: [string, object?]) => void)('Savings');
        }
    };
    const onOpenSubscriptions = () => {
        const drawerNavigation = navigation.getParent();
        if (drawerNavigation) {
            (drawerNavigation.navigate as (...args: [string, object?]) => void)('Subscriptions');
            return;
        }

        navigation.navigate('Activity', { initialTab: 'subscriptions' });
    };
    const onOpenCategoryBudgets = () => {
        const drawerNavigation = navigation.getParent();
        if (drawerNavigation) {
            (drawerNavigation.navigate as (...args: [string, object?]) => void)('CategoryBudgets');
        }
    };
    const onOpenNotifications = () => {
        const drawerNavigation = navigation.getParent();
        if (drawerNavigation) {
            (drawerNavigation.navigate as (...args: [string, object?]) => void)('Notifications');
        }
    };
    const onOpenMenu = () => {
        navigation.dispatch(DrawerActions.openDrawer());
    };
    const onActionPress = (actionId: (typeof actionItems)[number]['id']) => {
        if (actionId === 'add-income') {
            navigation.navigate('AddEntry', { initialTab: 'income' });
            return;
        }

        if (actionId === 'review-spending') {
            navigation.navigate('Analytics');
            return;
        }

        if (actionId === 'trim-subscriptions') {
            onOpenSubscriptions();
            return;
        }

        onOpenSavings();
    };
    const categoryBudgetWidgetContent = isCategoryBudgetLoading ? (
        <View
            style={[
                styles.categoryBudgetCard,
                { padding: secondaryCardPadding },
            ]}
            accessible
            accessibilityLabel={`${t('categoryBudgets.sectionTitle')}. ${t('common.loading')}`}
        >
            <View style={styles.categoryBudgetHeader}>
                <Skeleton width="48%" height={16} />
                <Skeleton width={54} height={14} />
            </View>
            <View style={styles.categoryBudgetLoadingRow}>
                <Skeleton width={40} height={40} radius={borderRadius.full} />
                <View style={styles.categoryBudgetCopy}>
                    <Skeleton width="52%" height={14} />
                    <Skeleton width="74%" height={12} style={{ marginTop: spacing.xs }} />
                </View>
            </View>
            <Skeleton
                width="100%"
                height={8}
                radius={borderRadius.full}
                style={{ marginTop: spacing.md }}
            />
        </View>
    ) : hasCategoryBudgetError ? (
        <View
            style={[
                styles.categoryBudgetCard,
                styles.categoryBudgetErrorCard,
                { padding: secondaryCardPadding },
            ]}
        >
            <Text
                style={[
                    styles.categoryBudgetErrorTitle,
                    { fontSize: scaleFont(typography.fontSize.base) },
                ]}
            >
                {t('dashboard.categoryBudgetErrorTitle')}
            </Text>
            <Text
                style={[
                    styles.categoryBudgetErrorDescription,
                    { fontSize: scaleFont(typography.fontSize.sm) },
                ]}
            >
                {t('dashboard.categoryBudgetErrorDescription')}
            </Text>
            <TouchableOpacity
                onPress={() => {
                    refetchCategoryBudgets();
                }}
                activeOpacity={0.84}
                style={styles.categoryBudgetRetryButton}
                accessibilityRole="button"
                accessibilityLabel={t('common.retry')}
            >
                <Icon name="refresh-outline" size={15} color={colors.textPrimary} />
                <Text
                    style={[
                        styles.categoryBudgetRetryText,
                        { fontSize: scaleFont(typography.fontSize.sm) },
                    ]}
                >
                    {t('common.retry')}
                </Text>
            </TouchableOpacity>
        </View>
    ) : !priorityCategoryBudget ? (
        <TouchableOpacity
            style={[
                styles.categoryBudgetCard,
                { padding: secondaryCardPadding },
            ]}
            onPress={onOpenCategoryBudgets}
            activeOpacity={0.86}
            accessibilityRole="button"
            accessibilityLabel={`${t('dashboard.categoryBudgetEmptyTitle')}. ${t('dashboard.categoryBudgetEmptyDescription')}`}
            accessibilityHint={t('dashboard.categoryBudgetAccessibilityHint')}
        >
            <View style={styles.categoryBudgetHeader}>
                <Text
                    style={[
                        styles.categoryBudgetTitle,
                        { fontSize: scaleFont(typography.fontSize.base) },
                    ]}
                >
                    {t('categoryBudgets.sectionTitle')}
                </Text>
                <View style={styles.categoryBudgetLink}>
                    <Text
                        style={[
                            styles.categoryBudgetLinkText,
                            { fontSize: scaleFont(typography.fontSize.sm) },
                        ]}
                    >
                        {t('categoryBudgets.setBudget')}
                    </Text>
                    <Icon name="chevron-forward" size={17} color={colors.primaryAction} />
                </View>
            </View>
            <View style={styles.categoryBudgetEmptyRow}>
                <View style={styles.categoryBudgetEmptyIcon}>
                    <Icon name="pie-chart-outline" size={19} color={colors.primaryAction} />
                </View>
                <View style={styles.categoryBudgetCopy}>
                    <Text
                        style={[
                            styles.categoryBudgetName,
                            { fontSize: scaleFont(typography.fontSize.base) },
                        ]}
                    >
                        {t('dashboard.categoryBudgetEmptyTitle')}
                    </Text>
                    <Text
                        style={[
                            styles.categoryBudgetMeta,
                            { fontSize: scaleFont(typography.fontSize.sm) },
                        ]}
                    >
                        {t('dashboard.categoryBudgetEmptyDescription')}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    ) : (
        <TouchableOpacity
            style={[
                styles.categoryBudgetCard,
                { padding: secondaryCardPadding },
            ]}
            onPress={onOpenCategoryBudgets}
            activeOpacity={0.86}
            accessibilityRole="button"
            accessibilityLabel={`${t('categoryBudgets.sectionTitle')}. ${priorityCategoryBudget.name}. ${t('categoryBudgets.spentOfLimit', {
                spent: formatCurrency(priorityCategoryBudget.spent, user?.currency, locale),
                limit: formatCurrency(priorityCategoryBudget.budgetAmount, user?.currency, locale),
            })}. ${categoryBudgetStatusLabel}. ${categoryBudgetPercentage}%.`}
            accessibilityHint={t('dashboard.categoryBudgetAccessibilityHint')}
        >
            <View style={styles.categoryBudgetHeader}>
                <Text
                    style={[
                        styles.categoryBudgetTitle,
                        { fontSize: scaleFont(typography.fontSize.base) },
                    ]}
                >
                    {t('categoryBudgets.sectionTitle')}
                </Text>
                <View style={styles.categoryBudgetLink}>
                    <Text
                        style={[
                            styles.categoryBudgetLinkText,
                            { fontSize: scaleFont(typography.fontSize.sm) },
                        ]}
                    >
                        {t('dashboard.seeAll')}
                    </Text>
                    <Icon name="chevron-forward" size={17} color={colors.primaryAction} />
                </View>
            </View>

            <View style={styles.categoryBudgetCategoryRow}>
                <View
                    style={[
                        styles.categoryBudgetIcon,
                        {
                            backgroundColor: withAlpha(
                                priorityCategoryBudget.color || colors.primaryAction,
                                0.16,
                            ),
                        },
                    ]}
                >
                    <CategoryIcon
                        icon={priorityCategoryBudget.icon}
                        categoryName={priorityCategoryBudget.name}
                        size={19}
                        color={priorityCategoryBudget.color || colors.primaryAction}
                    />
                </View>
                <View style={styles.categoryBudgetCopy}>
                    <Text
                        style={[
                            styles.categoryBudgetName,
                            { fontSize: scaleFont(typography.fontSize.base) },
                        ]}
                        numberOfLines={1}
                    >
                        {priorityCategoryBudget.name}
                    </Text>
                    <Text
                        style={[
                            styles.categoryBudgetMeta,
                            { fontSize: scaleFont(typography.fontSize.sm) },
                        ]}
                        numberOfLines={2}
                    >
                        {t('categoryBudgets.spentOfLimit', {
                            spent: formatCurrency(priorityCategoryBudget.spent, user?.currency, locale),
                            limit: formatCurrency(priorityCategoryBudget.budgetAmount, user?.currency, locale),
                        })}
                    </Text>
                </View>
                <View
                    style={[
                        styles.categoryBudgetStatusChip,
                        { backgroundColor: withAlpha(categoryBudgetTone, 0.14) },
                    ]}
                >
                    <Text
                        style={[
                            styles.categoryBudgetStatusText,
                            {
                                color: categoryBudgetTone,
                                fontSize: scaleFont(typography.fontSize.sm),
                            },
                        ]}
                    >
                        {categoryBudgetStatusLabel}
                    </Text>
                </View>
            </View>

            <View style={styles.categoryBudgetProgressTrack}>
                <View
                    style={[
                        styles.categoryBudgetProgressFill,
                        {
                            width: categoryBudgetProgressWidth,
                            backgroundColor: categoryBudgetTone,
                        },
                    ]}
                />
            </View>
        </TouchableOpacity>
    );
    const upcomingSectionContent = shouldShowUpcomingSection ? (
        <>
            <View style={styles.sectionHeader}>
                <Text
                    style={[
                        styles.sectionTitle,
                        { fontSize: scaleFont(typography.fontSize.lg) },
                    ]}
                >
                    {t('dashboard.upcomingTitle')}
                </Text>
                <TouchableOpacity onPress={onOpenUpcoming} activeOpacity={0.85}>
                    <Text
                        style={[
                            styles.seeAll,
                            { fontSize: scaleFont(typography.fontSize.sm) },
                        ]}
                    >
                        {t('dashboard.seeAll')}
                    </Text>
                </TouchableOpacity>
            </View>

            {isUpcomingLoading ? (
                <Text
                    style={[
                        styles.upcomingStateText,
                        { fontSize: scaleFont(typography.fontSize.sm) },
                    ]}
                >
                    {t('dashboard.upcomingLoading')}
                </Text>
            ) : hasUpcomingError ? (
                <View style={styles.upcomingErrorCard}>
                    <Text
                        style={[
                            styles.upcomingErrorText,
                            { fontSize: scaleFont(typography.fontSize.sm) },
                        ]}
                    >
                        {t('dashboard.upcomingError')}
                    </Text>
                    <TouchableOpacity
                        onPress={refetch}
                        activeOpacity={0.84}
                        style={styles.upcomingRetryButton}
                    >
                        <Icon name="refresh-outline" size={14} color={colors.textPrimary} />
                        <Text
                            style={[
                                styles.upcomingRetryText,
                                { fontSize: scaleFont(typography.fontSize.sm) },
                            ]}
                        >
                            {t('common.retry')}
                        </Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <>
                    <Text
                        style={[
                            styles.upcomingSummary,
                            { fontSize: scaleFont(typography.fontSize.sm) },
                        ]}
                    >
                        {t('dashboard.upcomingSummary', {
                            count: upcomingSubscriptions.length,
                        })}
                    </Text>

                    {upcomingSubscriptions.slice(0, 2).map((item, index) => {
                        const paymentMethodOption = getPaymentMethodOption(
                            item.paymentMethod,
                        );
                        const paymentMethodIcon =
                            paymentMethodOption?.icon
                            ?? PAYMENT_METHOD_FALLBACK_ICON;
                        const creditCardLabel = formatCreditCardLabel(
                            item.creditCard,
                        );

                        return (
                            <TouchableOpacity
                                key={`${item.name}-${item.daysRemaining}-${index}`}
                                style={styles.upcomingRow}
                                activeOpacity={0.85}
                                onPress={onOpenUpcoming}
                            >
                                <View
                                    style={[
                                        styles.upcomingIconWrap,
                                        paymentMethodOption
                                            ? styles.methodChipActive
                                            : null,
                                    ]}
                                >
                                    <Icon
                                        name={paymentMethodIcon}
                                        size={16}
                                        color={
                                            paymentMethodOption
                                                ? colors.success
                                                : colors.textMuted
                                        }
                                    />
                                </View>
                                <Text
                                    style={[
                                        styles.upcomingRowText,
                                        {
                                            fontSize: scaleFont(
                                                typography.fontSize.sm,
                                            ),
                                        },
                                    ]}
                                    numberOfLines={1}
                                >
                                    {[
                                        t('dashboard.upcomingRow', {
                                            name: item.name,
                                            amount: formatCurrency(
                                                item.amount,
                                                item.currency || user?.currency,
                                                locale,
                                            ),
                                            days: item.daysRemaining,
                                        }),
                                        creditCardLabel,
                                    ]
                                        .filter(Boolean)
                                        .join(' • ')}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </>
            )}
        </>
    ) : null;
    const recentSectionContent = (
        <>
            <View style={styles.sectionHeader}>
                <Text
                    style={[
                        styles.sectionTitle,
                        { fontSize: scaleFont(typography.fontSize.lg) },
                    ]}
                >
                    {t('dashboard.recentTransactions')}
                </Text>
                <TouchableOpacity
                    onPress={() =>
                        navigation.navigate('History', { screen: 'HistoryHome' })
                    }
                >
                    <Text
                        style={[
                            styles.seeAll,
                            { fontSize: scaleFont(typography.fontSize.sm) },
                        ]}
                    >
                        {t('dashboard.seeAll')}
                    </Text>
                </TouchableOpacity>
            </View>

            {!recentUnifiedHistory.length ? (
                <EmptyState
                    icon="time-outline"
                    title={t('history.noRecordsTitle')}
                    description={t('history.noRecordsDesc')}
                />
            ) : (
                recentUnifiedHistory.slice(0, 3).map((item) => {
                    const isSubscriptionRecord =
                        item.type === 'subscription' ||
                        (item.type === 'expense' && item.expense?.isSubscription);
                    const creditCardLabel = formatCreditCardLabel(
                        item.type === 'expense'
                            ? item.expense?.creditCard
                            : item.subscription?.creditCard,
                    );
                    const recordCurrency = item.type === 'expense'
                        ? item.expense?.currency
                        : item.subscription?.currency;
                    const isInstallmentRecord = item.type === 'expense'
                        && isInstallmentExpense(item.expense);
                    const installmentProgress = isInstallmentRecord
                        ? getInstallmentProgress(item.expense)
                        : null;
                    const installmentLabel = isInstallmentRecord
                        && installmentProgress?.currentInstallment
                        && installmentProgress?.installmentCount
                        ? t('expense.installmentPositionLabel', {
                            current: installmentProgress.currentInstallment,
                            count: installmentProgress.installmentCount,
                        })
                        : null;

                    return (
                        <TouchableOpacity
                            key={item.id}
                            style={styles.recentRow}
                            activeOpacity={0.85}
                            onPress={() => {
                                if (item.type === 'expense' && item.expense?.id) {
                                    navigation.navigate('ExpenseDetail', { id: item.expense.id });
                                    return;
                                }
                                if (item.type === 'subscription' && item.subscription) {
                                    navigation.navigate('AddSubscription', {
                                        subscription: item.subscription,
                                    });
                                }
                            }}
                        >
                            <View
                                style={[
                                    styles.recentIconWrap,
                                    isSubscriptionRecord
                                        ? styles.recentIconSubscription
                                        : styles.recentIconExpense,
                                ]}
                            >
                                <Icon
                                    name={isSubscriptionRecord
                                        ? 'card-outline'
                                        : 'create-outline'}
                                    size={16}
                                    color={
                                        isSubscriptionRecord
                                            ? colors.primaryAction
                                            : colors.error
                                    }
                                />
                            </View>
                            <View style={styles.recentInfo}>
                                <Text
                                    style={[
                                        styles.recentTitle,
                                        { fontSize: scaleFont(typography.fontSize.base) },
                                    ]}
                                    numberOfLines={1}
                                >
                                    {item.type === 'expense'
                                        ? item.expense?.title
                                        : item.subscription?.name}
                                </Text>
                                <Text
                                    style={[
                                        styles.recentMeta,
                                        { fontSize: scaleFont(typography.fontSize.sm) },
                                    ]}
                                    numberOfLines={1}
                                >
                                    {[
                                        isSubscriptionRecord
                                            ? t('history.subscriptionBadge')
                                            : isInstallmentRecord
                                                ? t('history.installmentExpense')
                                                : t('history.manualExpense'),
                                        installmentLabel,
                                        formatDate(item.date, 'MMM D, YYYY'),
                                        creditCardLabel,
                                    ]
                                        .filter(Boolean)
                                        .join(' • ')}
                                </Text>
                            </View>
                            <View style={styles.recentTrailing}>
                                <Text
                                    style={[
                                        styles.recentAmount,
                                        {
                                            fontSize: scaleFont(
                                                typography.fontSize.base,
                                            ),
                                        },
                                    ]}
                                >
                                    -{formatCurrency(item.amount, recordCurrency, locale)}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    );
                })
            )}
        </>
    );

    return (
        <View style={styles.container}>
            <HomeBackground />
            <AnimatedScreen style={styles.flex1} delay={10} duration={220} travelY={6}>
                <View
                    style={[
                        styles.header,
                        {
                            paddingTop: insets.top + spacing.base,
                            paddingHorizontal: horizontalPadding,
                        },
                        constrainedContentStyle,
                    ]}
                >
                    <TouchableOpacity
                        style={styles.menuButton}
                        onPress={onOpenMenu}
                        activeOpacity={0.84}
                        accessibilityRole="button"
                        accessibilityLabel={t('navigation.openMenu')}
                    >
                        <Icon name="menu-outline" size={22} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <View style={styles.greetingContainer}>
                        <Text
                            style={[styles.greeting, { fontSize: scaleFont(typography.fontSize['2xl']) }]}
                            numberOfLines={1}
                        >
                            {greetingName
                                ? t('dashboard.hello', { name: greetingName })
                                : t('dashboard.helloGeneric')}
                        </Text>
                    </View>
                    <View style={styles.headerActions}>
                        <TouchableOpacity
                            style={styles.notificationButton}
                            onPress={onOpenNotifications}
                            activeOpacity={0.84}
                            accessibilityRole="button"
                            accessibilityLabel={t('navigation.openNotifications')}
                        >
                            <Icon name="notifications-outline" size={20} color={colors.textPrimary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.profileBadge,
                                {
                                    width: profileBadgeSize,
                                    height: profileBadgeSize,
                                    borderRadius: profileBadgeSize / 2,
                                },
                            ]}
                            onPress={() => navigation.navigate('Settings')}
                            activeOpacity={0.84}
                            accessibilityRole="button"
                            accessibilityLabel={t('navigation.openSettings')}
                        >
                            {avatarUri && !avatarLoadFailed ? (
                                <Image
                                    source={{ uri: avatarUri }}
                                    style={[
                                        styles.profileImage,
                                        { borderRadius: profileBadgeSize / 2 },
                                    ]}
                                    resizeMode="cover"
                                    onError={() => setAvatarLoadFailed(true)}
                                />
                            ) : (
                                <Text style={[styles.profileInitial, { fontSize: profileInitialFont }]}>
                                    {fallbackInitial}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                <ScrollView
                    {...bottomDockScroll}
                    contentContainerStyle={[
                        styles.scrollContent,
                        { paddingBottom: scrollBottomPadding },
                    ]}
                    refreshControl={
                        <RefreshControl
                            refreshing={isLoading || historyLoading || historyRefetching}
                            onRefresh={refetch}
                            tintColor={colors.primaryAction}
                            colors={[colors.primaryAction]}
                        />
                    }
                >
                    <View
                        style={[
                            styles.contentInner,
                            { paddingHorizontal: horizontalPadding },
                            constrainedContentStyle,
                        ]}
                    >
                        {showSkeleton ? (
                            <DashboardSkeleton horizontalPadding={0} />
                        ) : (
                            <>
                                {hasDashboardError && (
                                    <View style={styles.errorCard}>
                                        <Text
                                            style={[
                                                styles.errorTitle,
                                                { fontSize: scaleFont(typography.fontSize.sm) },
                                            ]}
                                        >
                                            {t('common.error')}
                                        </Text>
                                        <Text
                                            style={[
                                                styles.errorDescription,
                                                { fontSize: scaleFont(typography.fontSize.sm) },
                                            ]}
                                        >
                                            {t('dashboard.loadError')}
                                        </Text>
                                        <TouchableOpacity
                                            onPress={refetch}
                                            activeOpacity={0.84}
                                            style={styles.errorRetryButton}
                                        >
                                            <Icon name="refresh-outline" size={14} color={colors.textPrimary} />
                                            <Text
                                                style={[
                                                    styles.errorRetryText,
                                                    { fontSize: scaleFont(typography.fontSize.sm) },
                                                ]}
                                            >
                                                {t('common.retry')}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                )}

                                <View
                                    style={[
                                        styles.budgetCard,
                                        {
                                            paddingHorizontal: primaryCardHorizontalPadding,
                                            paddingVertical: primaryCardVerticalPadding,
                                        },
                                    ]}
                                >
                                    <View style={styles.budgetGlow} />
                                    <Text
                                        style={[
                                            styles.budgetLabel,
                                            { fontSize: scaleFont(typography.fontSize.sm) },
                                        ]}
                                    >
                                        {t('dashboard.todaySpending')}
                                    </Text>
                                    <Text
                                        style={[
                                            styles.budgetAmount,
                                            { fontSize: budgetAmountFontSize },
                                        ]}
                                    >
                                        {formatCurrency(total, user?.currency)}
                                    </Text>

                                    <View style={styles.progressTrack}>
                                        <View
                                            style={[
                                                styles.progressFill,
                                                { width: progressWidth },
                                            ]}
                                        />
                                    </View>

                                    <View style={styles.budgetSummaryRow}>
                                        <View style={styles.availableStat}>
                                            <Text
                                                style={[
                                                    styles.budgetStatLabel,
                                                    { fontSize: scaleFont(typography.fontSize.sm) },
                                                ]}
                                            >
                                                {t('dashboard.safeToSpend')}
                                            </Text>
                                            <Text
                                                style={[
                                                    styles.availableStatValue,
                                                    {
                                                        fontSize: scaleFont(typography.fontSize.xl),
                                                        color: safeToSpend >= 0
                                                            ? colors.budgetSafe
                                                            : colors.budgetDanger,
                                                    },
                                                ]}
                                                numberOfLines={1}
                                                adjustsFontSizeToFit
                                                minimumFontScale={0.75}
                                            >
                                                {formatCurrency(safeToSpend, user?.currency)}
                                            </Text>
                                        </View>
                                        <View style={styles.budgetMeta}>
                                            <View style={styles.budgetMetaRow}>
                                                <Text
                                                    style={[
                                                        styles.budgetMetaLabel,
                                                        { fontSize: scaleFont(typography.fontSize.sm) },
                                                    ]}
                                                >
                                                    {t('dashboard.budget')}
                                                </Text>
                                                <Text
                                                    style={[
                                                        styles.budgetMetaValue,
                                                        { fontSize: scaleFont(typography.fontSize.sm) },
                                                    ]}
                                                    numberOfLines={1}
                                                >
                                                    {formatCurrency(budget, user?.currency)}
                                                </Text>
                                            </View>
                                            <View style={styles.budgetMetaRow}>
                                                <Text
                                                    style={[
                                                        styles.budgetMetaLabel,
                                                        { fontSize: scaleFont(typography.fontSize.sm) },
                                                    ]}
                                                    numberOfLines={1}
                                                >
                                                    {t('dashboard.reservedFunds')}
                                                </Text>
                                                <Text
                                                    style={[
                                                        styles.budgetMetaValue,
                                                        { fontSize: scaleFont(typography.fontSize.sm) },
                                                    ]}
                                                    numberOfLines={1}
                                                >
                                                    {formatCurrency(
                                                        reservedSubscriptions,
                                                        user?.currency,
                                                    )}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                </View>

                                {categoryBudgetWidgetContent}

                                {shouldShowCashflow ? (
                                    <View
                                        style={[
                                            styles.cashflowCard,
                                            {
                                                paddingHorizontal: secondaryCardPadding,
                                                paddingVertical: secondaryCardPadding,
                                            },
                                        ]}
                                    >
                                        <View style={styles.cashflowHeader}>
                                            <Text
                                                style={[
                                                    styles.cashflowTitle,
                                                    { fontSize: scaleFont(typography.fontSize.base) },
                                                ]}
                                            >
                                                {t('dashboard.cashflowTitle')}
                                            </Text>
                                            {savingsRate !== null ? (
                                                <Text
                                                    style={[
                                                        styles.cashflowSubtitle,
                                                        { fontSize: scaleFont(typography.fontSize.sm) },
                                                    ]}
                                                >
                                                    {t('dashboard.savingsRate', {
                                                        percent: Math.round(savingsRate),
                                                    })}
                                                </Text>
                                            ) : null}
                                        </View>
                                        <View style={styles.cashflowGrid}>
                                            <View style={styles.cashflowMetric}>
                                                <Text
                                                    style={[
                                                        styles.cashflowMetricLabel,
                                                        { fontSize: scaleFont(typography.fontSize.sm) },
                                                    ]}
                                                >
                                                    {t('dashboard.incomeLabel')}
                                                </Text>
                                                <Text
                                                    style={[
                                                        styles.cashflowMetricValue,
                                                        styles.cashflowMetricValueIncome,
                                                        { fontSize: scaleFont(typography.fontSize.base) },
                                                    ]}
                                                    numberOfLines={1}
                                                    adjustsFontSizeToFit
                                                    minimumFontScale={0.72}
                                                >
                                                    {formatCurrency(totalIncome, user?.currency, locale)}
                                                </Text>
                                            </View>
                                            <View
                                                style={[
                                                    styles.cashflowMetric,
                                                    styles.cashflowMetricSeparated,
                                                ]}
                                            >
                                                <Text
                                                    style={[
                                                        styles.cashflowMetricLabel,
                                                        { fontSize: scaleFont(typography.fontSize.sm) },
                                                    ]}
                                                >
                                                    {t('dashboard.expensesLabel')}
                                                </Text>
                                                <Text
                                                    style={[
                                                        styles.cashflowMetricValue,
                                                        styles.cashflowMetricValueExpense,
                                                        { fontSize: scaleFont(typography.fontSize.base) },
                                                    ]}
                                                    numberOfLines={1}
                                                    adjustsFontSizeToFit
                                                    minimumFontScale={0.72}
                                                >
                                                    {formatCurrency(totalExpenses, user?.currency, locale)}
                                                </Text>
                                            </View>
                                            <View
                                                style={[
                                                    styles.cashflowMetric,
                                                    styles.cashflowMetricSeparated,
                                                ]}
                                            >
                                                <Text
                                                    style={[
                                                        styles.cashflowMetricLabel,
                                                        { fontSize: scaleFont(typography.fontSize.sm) },
                                                    ]}
                                                >
                                                    {t('dashboard.netLabel')}
                                                </Text>
                                                <Text
                                                    style={[
                                                        styles.cashflowMetricValue,
                                                        { fontSize: scaleFont(typography.fontSize.base), color: cashflowTone },
                                                    ]}
                                                    numberOfLines={1}
                                                    adjustsFontSizeToFit
                                                    minimumFontScale={0.72}
                                                >
                                                    {formatCurrency(netCashflow, user?.currency, locale)}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                ) : null}

                                {actionItems.length ? (
                                    <View style={styles.actionSection}>
                                        <View style={styles.sectionHeader}>
                                            <Text
                                                style={[
                                                    styles.sectionTitle,
                                                    { fontSize: scaleFont(typography.fontSize.lg) },
                                                ]}
                                            >
                                                {t('dashboard.actionsTitle')}
                                            </Text>
                                        </View>
                                        {actionItems.slice(0, 1).map((item) => {
                                            const tone = resolveActionTone(item.tone);

                                            return (
                                                <TouchableOpacity
                                                    key={item.id}
                                                    activeOpacity={0.86}
                                                    style={styles.actionCard}
                                                    onPress={() => onActionPress(item.id)}
                                                >
                                                    <View
                                                        style={[
                                                            styles.actionIconWrap,
                                                            { backgroundColor: tone.background },
                                                        ]}
                                                    >
                                                        <Icon
                                                            name={item.icon}
                                                            size={18}
                                                            color={tone.color}
                                                        />
                                                    </View>
                                                    <View style={styles.actionCopy}>
                                                        <Text
                                                            style={[
                                                                styles.actionTitle,
                                                                { fontSize: scaleFont(typography.fontSize.base) },
                                                            ]}
                                                        >
                                                            {item.title}
                                                        </Text>
                                                        <Text
                                                            style={[
                                                                styles.actionDescription,
                                                                { fontSize: scaleFont(typography.fontSize.sm) },
                                                            ]}
                                                            numberOfLines={1}
                                                        >
                                                            {item.description}
                                                        </Text>
                                                    </View>
                                                    <Icon
                                                        name="chevron-forward"
                                                        size={18}
                                                        color={colors.textMuted}
                                                    />
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                ) : null}

                                {upcomingSectionContent ? (
                                    <View style={[styles.section, styles.upcomingSection, styles.sectionNoHorizontalPadding]}>
                                        {upcomingSectionContent}
                                    </View>
                                ) : null}

                                <View style={[styles.section, styles.recentSection, styles.sectionNoHorizontalPadding]}>
                                    {recentSectionContent}
                                </View>
                            </>
                        )}
                    </View>
                </ScrollView>
            </AnimatedScreen>
        </View>
    );
}

const createStyles = (colors: SemanticColors) =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },
        flex1: {
            flex: 1,
        },
        header: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingBottom: spacing.base,
        },
        greetingContainer: {
            flex: 1,
            marginLeft: spacing.sm,
            marginRight: spacing.md,
        },
        headerActions: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
        },
        menuButton: {
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: withAlpha(colors.surfaceCard, 0.9),
            borderWidth: 1,
            borderColor: withAlpha(colors.border, 0.9),
        },
        notificationButton: {
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: withAlpha(colors.surfaceCard, 0.9),
            borderWidth: 1,
            borderColor: withAlpha(colors.border, 0.9),
        },
        greeting: {
            color: colors.textPrimary,
            fontWeight: typography.fontWeight.bold,
            letterSpacing: 0.2,
        },
        profileBadge: {
            backgroundColor: withAlpha(colors.surfaceCard, 0.9),
            borderWidth: 1,
            borderColor: withAlpha(colors.border, 0.9),
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
        },
        profileImage: {
            width: '100%',
            height: '100%',
        },
        profileInitial: {
            color: colors.textPrimary,
            fontWeight: typography.fontWeight.bold,
        },
        scrollContent: {
            paddingBottom: spacing['4xl'],
        },
        contentInner: {
            width: '100%',
        },
        budgetCard: {
            backgroundColor: withAlpha(colors.surfaceCard, 0.94),
            borderRadius: borderRadius.xl,
            marginBottom: spacing.base,
            borderWidth: 1,
            borderColor: colors.border,
            overflow: 'hidden',
        },
        budgetGlow: {
            position: 'absolute',
            width: 220,
            height: 120,
            right: -80,
            top: -40,
            borderRadius: 140,
            backgroundColor: withAlpha(colors.success, 0.16),
        },
        budgetLabel: {
            color: colors.textMuted,
            textTransform: 'uppercase',
            fontWeight: typography.fontWeight.semibold,
            letterSpacing: 0.8,
            marginBottom: spacing.sm,
        },
        budgetAmount: {
            color: colors.textPrimary,
            fontWeight: typography.fontWeight.extrabold,
            marginBottom: spacing.sm,
            letterSpacing: -0.6,
        },
        progressTrack: {
            height: 9,
            borderRadius: borderRadius.full,
            backgroundColor: withAlpha(colors.primaryAction, 0.12),
            overflow: 'hidden',
            marginBottom: spacing.base,
        },
        progressFill: {
            height: '100%',
            borderRadius: borderRadius.full,
            backgroundColor: colors.success,
        },
        budgetSummaryRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.base,
        },
        availableStat: {
            flex: 1,
            gap: spacing.xs,
        },
        availableStatValue: {
            color: colors.textPrimary,
            fontWeight: typography.fontWeight.bold,
        },
        budgetStatLabel: {
            color: colors.textMuted,
            fontWeight: typography.fontWeight.medium,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
        },
        budgetMeta: {
            flex: 1.15,
            gap: spacing.sm,
            borderLeftWidth: 1,
            borderLeftColor: colors.border,
            paddingLeft: spacing.base,
        },
        budgetMetaRow: {
            gap: 2,
        },
        budgetMetaLabel: {
            color: colors.textMuted,
            fontWeight: typography.fontWeight.medium,
        },
        budgetMetaValue: {
            color: colors.textPrimary,
            fontWeight: typography.fontWeight.semibold,
        },
        cashflowCard: {
            backgroundColor: withAlpha(colors.surfaceCard, 0.76),
            borderRadius: borderRadius.xl,
            borderWidth: 1,
            borderColor: colors.border,
            marginBottom: spacing.base,
            gap: spacing.base,
        },
        categoryBudgetCard: {
            backgroundColor: withAlpha(colors.surfaceCard, 0.84),
            borderRadius: borderRadius.xl,
            borderWidth: 1,
            borderColor: colors.border,
            marginBottom: spacing.base,
        },
        categoryBudgetHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: spacing.sm,
        },
        categoryBudgetTitle: {
            flex: 1,
            color: colors.textPrimary,
            fontWeight: typography.fontWeight.semibold,
        },
        categoryBudgetLink: {
            minHeight: 44,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 2,
        },
        categoryBudgetLinkText: {
            color: colors.primaryAction,
            fontWeight: typography.fontWeight.semibold,
        },
        categoryBudgetLoadingRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            marginTop: spacing.sm,
        },
        categoryBudgetCategoryRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            marginTop: spacing.sm,
        },
        categoryBudgetEmptyRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            paddingTop: spacing.xs,
        },
        categoryBudgetIcon: {
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
        },
        categoryBudgetEmptyIcon: {
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: withAlpha(colors.primaryAction, 0.12),
        },
        categoryBudgetCopy: {
            flex: 1,
            minWidth: 0,
        },
        categoryBudgetName: {
            color: colors.textPrimary,
            fontWeight: typography.fontWeight.semibold,
        },
        categoryBudgetMeta: {
            color: colors.textMuted,
            lineHeight: 20,
            marginTop: 2,
        },
        categoryBudgetStatusChip: {
            flexShrink: 0,
            borderRadius: borderRadius.full,
            paddingHorizontal: spacing.sm,
            paddingVertical: spacing.xs,
        },
        categoryBudgetStatusText: {
            fontWeight: typography.fontWeight.semibold,
        },
        categoryBudgetProgressTrack: {
            height: 8,
            borderRadius: borderRadius.full,
            backgroundColor: withAlpha(colors.textMuted, 0.14),
            overflow: 'hidden',
            marginTop: spacing.md,
        },
        categoryBudgetProgressFill: {
            height: '100%',
            borderRadius: borderRadius.full,
        },
        categoryBudgetErrorCard: {
            borderColor: withAlpha(colors.error, 0.35),
            backgroundColor: withAlpha(colors.error, 0.1),
        },
        categoryBudgetErrorTitle: {
            color: colors.textPrimary,
            fontWeight: typography.fontWeight.bold,
        },
        categoryBudgetErrorDescription: {
            color: colors.textSecondary,
            lineHeight: 20,
            marginTop: spacing.xs,
        },
        categoryBudgetRetryButton: {
            minHeight: 44,
            alignSelf: 'flex-start',
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.xs,
            marginTop: spacing.sm,
            borderWidth: 1,
            borderColor: withAlpha(colors.error, 0.3),
            borderRadius: borderRadius.full,
            paddingHorizontal: spacing.md,
        },
        categoryBudgetRetryText: {
            color: colors.textPrimary,
            fontWeight: typography.fontWeight.semibold,
        },
        cashflowHeader: {
            gap: 4,
        },
        cashflowTitle: {
            color: colors.textPrimary,
            fontWeight: typography.fontWeight.semibold,
        },
        cashflowSubtitle: {
            color: colors.textMuted,
            lineHeight: 20,
        },
        cashflowGrid: {
            flexDirection: 'row',
            gap: spacing.sm,
        },
        cashflowMetric: {
            flex: 1,
            paddingHorizontal: spacing.sm,
            gap: spacing.xs,
            justifyContent: 'center',
        },
        cashflowMetricSeparated: {
            borderLeftWidth: 1,
            borderLeftColor: colors.border,
        },
        cashflowMetricLabel: {
            color: colors.textMuted,
            textTransform: 'uppercase',
            fontWeight: typography.fontWeight.medium,
            letterSpacing: 0.4,
        },
        cashflowMetricValue: {
            color: colors.textPrimary,
            fontWeight: typography.fontWeight.bold,
        },
        cashflowMetricValueIncome: {
            color: colors.success,
        },
        cashflowMetricValueExpense: {
            color: colors.error,
        },
        actionSection: {
            marginBottom: spacing.base,
            gap: spacing.sm,
        },
        actionCard: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.base,
            borderRadius: borderRadius.xl,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: withAlpha(colors.surfaceElevated, 0.93),
            paddingHorizontal: spacing.base,
            paddingVertical: spacing.md,
        },
        actionIconWrap: {
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
        },
        actionCopy: {
            flex: 1,
            gap: 4,
        },
        actionTitle: {
            color: colors.textPrimary,
            fontWeight: typography.fontWeight.semibold,
        },
        actionDescription: {
            color: colors.textMuted,
            lineHeight: 20,
        },
        errorCard: {
            borderWidth: 1,
            borderColor: withAlpha(colors.error, 0.35),
            backgroundColor: withAlpha(colors.error, 0.12),
            borderRadius: borderRadius.xl,
            paddingHorizontal: spacing.base,
            paddingVertical: spacing.base,
            marginBottom: spacing.base,
        },
        errorTitle: {
            color: colors.textPrimary,
            fontWeight: typography.fontWeight.bold,
        },
        errorDescription: {
            color: colors.textSecondary,
            marginTop: spacing.xs,
        },
        errorRetryButton: {
            marginTop: spacing.sm,
            alignSelf: 'flex-start',
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.xs,
            borderWidth: 1,
            borderColor: withAlpha(colors.error, 0.3),
            borderRadius: borderRadius.full,
            paddingHorizontal: spacing.sm,
            paddingVertical: spacing.xs,
        },
        errorRetryText: {
            color: colors.textPrimary,
            fontWeight: typography.fontWeight.semibold,
        },
        section: {
            paddingHorizontal: spacing.xl,
        },
        sectionNoHorizontalPadding: {
            paddingHorizontal: 0,
        },
        upcomingSection: {
            marginTop: spacing.base,
        },
        recentSection: {
            marginTop: spacing.base,
        },
        sectionHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: spacing.base,
            paddingHorizontal: spacing.xs,
        },
        sectionTitle: {
            fontWeight: typography.fontWeight.bold,
            color: colors.textPrimary,
        },
        seeAll: {
            color: colors.primaryAction,
            fontWeight: typography.fontWeight.semibold,
            letterSpacing: 0.2,
        },
        upcomingSummary: {
            color: colors.textMuted,
            marginBottom: spacing.sm,
        },
        upcomingStateText: {
            color: colors.textMuted,
            marginBottom: spacing.sm,
        },
        upcomingErrorCard: {
            borderWidth: 1,
            borderColor: withAlpha(colors.error, 0.35),
            backgroundColor: withAlpha(colors.error, 0.12),
            borderRadius: borderRadius.lg,
            paddingHorizontal: spacing.base,
            paddingVertical: spacing.sm,
            marginBottom: spacing.sm,
        },
        upcomingErrorText: {
            color: colors.textSecondary,
            fontWeight: typography.fontWeight.medium,
        },
        upcomingRetryButton: {
            marginTop: spacing.sm,
            alignSelf: 'flex-start',
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.xs,
            borderWidth: 1,
            borderColor: withAlpha(colors.error, 0.3),
            borderRadius: borderRadius.full,
            paddingHorizontal: spacing.sm,
            paddingVertical: spacing.xs,
        },
        upcomingRetryText: {
            color: colors.textPrimary,
            fontWeight: typography.fontWeight.semibold,
        },
        upcomingRow: {
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            paddingHorizontal: spacing.xs,
            paddingVertical: spacing.md,
            flexDirection: 'row',
            alignItems: 'center',
        },
        upcomingIconWrap: {
            width: 34,
            height: 34,
            borderRadius: 17,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: withAlpha(colors.primaryAction, 0.3),
            backgroundColor: withAlpha(colors.primaryAction, 0.12),
            marginRight: spacing.sm,
        },
        methodChipActive: {
            borderColor: withAlpha(colors.success, 0.32),
            backgroundColor: withAlpha(colors.success, 0.12),
        },
        upcomingRowText: {
            flex: 1,
            color: colors.textPrimary,
            fontWeight: typography.fontWeight.semibold,
        },
        recentRow: {
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            paddingHorizontal: spacing.xs,
            paddingVertical: spacing.md,
            flexDirection: 'row',
            alignItems: 'center',
        },
        recentIconWrap: {
            width: 34,
            height: 34,
            borderRadius: 17,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
        },
        recentIconExpense: {
            borderColor: withAlpha(colors.error, 0.32),
            backgroundColor: withAlpha(colors.error, 0.12),
        },
        recentIconSubscription: {
            borderColor: withAlpha(colors.primaryAction, 0.32),
            backgroundColor: withAlpha(colors.primaryAction, 0.12),
        },
        recentInfo: {
            flex: 1,
            marginHorizontal: spacing.sm,
        },
        recentTitle: {
            color: colors.textPrimary,
            fontWeight: typography.fontWeight.semibold,
        },
        recentMeta: {
            marginTop: 2,
            color: colors.textMuted,
        },
        recentAmount: {
            color: colors.error,
            fontWeight: typography.fontWeight.bold,
            letterSpacing: 0.2,
        },
        recentTrailing: {
            alignItems: 'center',
            marginLeft: spacing.sm,
        },
    });
