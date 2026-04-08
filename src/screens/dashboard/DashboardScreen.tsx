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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { MainTabScreenProps } from '../../navigation/types';
import { EmptyState } from '../../components/ui/EmptyState';
import { DashboardSkeleton } from '../../components/ui/Skeleton';
import { formatCurrency, formatDate } from '../../utils/format';
import { getCurrencyLocale } from '../../utils/currency';
import {
    getPaymentMethodOption,
    PAYMENT_METHOD_FALLBACK_ICON,
} from '../../utils/paymentMethod';
import {
    borderRadius,
    spacing,
    typography,
    useResponsive,
    useTheme,
    useThemedStyles,
} from '../../theme';
import { AnimatedScreen } from '../../components/ui/AnimatedScreen';
import { useDashboardScreen } from '../../hooks/useDashboardScreen';
import { useI18n } from '../../hooks/useI18n';
import { HomeBackground } from '../../components/ui/HomeBackground';
import { getMainTabListBottomPadding } from '../../navigation/mainTabLayout';
import { formatCreditCardLabel } from '../../utils/creditCards';
import { getInstallmentProgress, isInstallmentExpense } from '../../utils/installments';
import { withAlpha } from '../../utils/subscriptions';

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
    const constrainedContentStyle = contentMaxWidth
        ? { maxWidth: contentMaxWidth, alignSelf: 'center' as const, width: '100%' as const }
        : null;
    const primaryCardPadding = isSmallPhone
        ? scaleSize(spacing.lg, 0.5)
        : scaleSize(spacing.xl, 0.5);
    const secondaryCardPadding = scaleSize(spacing.base, 0.5);
    const cashflowTone = netCashflow >= 0 ? colors.success : colors.error;
    const onOpenUpcoming = () => {
        const drawerNavigation = navigation.getParent();
        if (drawerNavigation) {
            (drawerNavigation.navigate as (...args: [string, object?]) => void)(
                'UpcomingSubscriptions',
                { upcomingDays: 3 },
            );
            return;
        }

        navigation.navigate('SubscriptionsTab', { initialTab: 'subscriptions' });
    };
    const onOpenSavings = () => {
        const drawerNavigation = navigation.getParent();
        if (drawerNavigation) {
            (drawerNavigation.navigate as (...args: [string, object?]) => void)('Savings');
        }
    };
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
                                { fontSize: scaleFont(typography.fontSize.xs) },
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
                            { fontSize: scaleFont(typography.fontSize.xs) },
                        ]}
                    >
                        {t('dashboard.upcomingSummary', {
                            count: upcomingSubscriptions.length,
                        })}
                    </Text>
                    {upcomingSubscriptions.map((item, index) => {
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
                recentUnifiedHistory.map((item) => {
                    const isSubscriptionRecord =
                        item.type === 'subscription' ||
                        (item.type === 'expense' && item.expense?.isSubscription);
                    const paymentMethod = item.type === 'expense'
                        ? item.expense?.paymentMethod
                        : item.subscription?.paymentMethod;
                    const paymentMethodOption = getPaymentMethodOption(
                        paymentMethod,
                    );
                    const paymentMethodIcon =
                        paymentMethodOption?.icon
                        ?? PAYMENT_METHOD_FALLBACK_ICON;
                    const creditCardLabel = formatCreditCardLabel(
                        item.type === 'expense'
                            ? item.expense?.creditCard
                            : item.subscription?.creditCard,
                    );
                    const recordCurrency = item.type === 'expense'
                        ? item.expense?.currency
                        : item.subscription?.currency;
                    const installmentProgress = item.type === 'expense'
                        ? getInstallmentProgress(item.expense)
                        : null;
                    const installmentLabel = item.type === 'expense'
                        && isInstallmentExpense(item.expense)
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
                                            : colors.success
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
                                <View
                                    style={[
                                        styles.recentPaymentMethodChip,
                                        paymentMethodOption
                                            ? styles.methodChipActive
                                            : null,
                                    ]}
                                >
                                    <Icon
                                        name={paymentMethodIcon}
                                        size={14}
                                        color={
                                            paymentMethodOption
                                                ? colors.success
                                                : colors.textMuted
                                        }
                                    />
                                </View>
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
                    <View style={styles.greetingContainer}>
                        <Text
                            style={[styles.greeting, { fontSize: scaleFont(typography.fontSize['2xl']) }]}
                            numberOfLines={1}
                        >
                            {greetingName
                                ? t('dashboard.hello', { name: greetingName })
                                : t('dashboard.helloGeneric')}
                        </Text>
                        <Text
                            style={[styles.greetingSubtext, { fontSize: scaleFont(typography.fontSize.sm) }]}
                        >
                            {t('dashboard.subtitle')}
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={[
                            styles.profileBadge,
                            {
                                width: profileBadgeSize,
                                height: profileBadgeSize,
                                borderRadius: profileBadgeSize / 2,
                            },
                        ]}
                        onPress={() => navigation.navigate('Profile')}
                        activeOpacity={0.84}
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

                <ScrollView
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
                                                { fontSize: scaleFont(typography.fontSize.xs) },
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
                                                    { fontSize: scaleFont(typography.fontSize.xs) },
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
                                            padding: primaryCardPadding,
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
                                            { fontSize: scaleFont(typography.fontSize['4xl']) },
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

                                    <View style={styles.budgetFooter}>
                                        <View style={styles.budgetStat}>
                                            <Text
                                                style={[
                                                    styles.budgetStatLabel,
                                                    { fontSize: scaleFont(typography.fontSize.xs) },
                                                ]}
                                            >
                                                Budget
                                            </Text>
                                            <Text
                                                style={[
                                                    styles.budgetStatValue,
                                                    { fontSize: scaleFont(typography.fontSize.base) },
                                                ]}
                                            >
                                                {formatCurrency(budget, user?.currency)}
                                            </Text>
                                        </View>
                                        <View style={styles.budgetStatDivider} />
                                        <View style={styles.budgetStat}>
                                            <Text
                                                style={[
                                                    styles.budgetStatLabel,
                                                    { fontSize: scaleFont(typography.fontSize.xs) },
                                                ]}
                                            >
                                                Available
                                            </Text>
                                            <Text
                                                style={[
                                                    styles.budgetStatValue,
                                                    {
                                                        fontSize: scaleFont(typography.fontSize.base),
                                                        color: safeToSpend >= 0
                                                            ? colors.budgetSafe
                                                            : colors.budgetDanger,
                                                    },
                                                ]}
                                            >
                                                {formatCurrency(safeToSpend, user?.currency)}
                                            </Text>
                                        </View>
                                        <View style={styles.budgetStatDivider} />
                                        <View style={styles.budgetStat}>
                                            <Text
                                                style={[
                                                    styles.budgetStatLabel,
                                                    { fontSize: scaleFont(typography.fontSize.xs) },
                                                ]}
                                            >
                                                Reserved
                                            </Text>
                                            <Text
                                                style={[
                                                    styles.budgetStatValue,
                                                    { fontSize: scaleFont(typography.fontSize.base) },
                                                ]}
                                            >
                                                {formatCurrency(reservedSubscriptions, user?.currency)}
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                {!hasCashflowError ? (
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
                                            <Text
                                                style={[
                                                    styles.cashflowSubtitle,
                                                    { fontSize: scaleFont(typography.fontSize.sm) },
                                                ]}
                                            >
                                                {savingsRate !== null
                                                    ? t('dashboard.savingsRate', {
                                                        percent: Math.round(savingsRate),
                                                    })
                                                    : t('dashboard.cashflowEmptyHint')}
                                            </Text>
                                        </View>
                                        <View style={styles.cashflowGrid}>
                                            <View style={styles.cashflowMetric}>
                                                <Text
                                                    style={[
                                                        styles.cashflowMetricLabel,
                                                        { fontSize: scaleFont(typography.fontSize.xs) },
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
                                                >
                                                    {formatCurrency(totalIncome, user?.currency, locale)}
                                                </Text>
                                            </View>
                                            <View style={styles.cashflowMetric}>
                                                <Text
                                                    style={[
                                                        styles.cashflowMetricLabel,
                                                        { fontSize: scaleFont(typography.fontSize.xs) },
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
                                                >
                                                    {formatCurrency(totalExpenses, user?.currency, locale)}
                                                </Text>
                                            </View>
                                            <View style={styles.cashflowMetric}>
                                                <Text
                                                    style={[
                                                        styles.cashflowMetricLabel,
                                                        { fontSize: scaleFont(typography.fontSize.xs) },
                                                    ]}
                                                >
                                                    {t('dashboard.netLabel')}
                                                </Text>
                                                <Text
                                                    style={[
                                                        styles.cashflowMetricValue,
                                                        { fontSize: scaleFont(typography.fontSize.base), color: cashflowTone },
                                                    ]}
                                                >
                                                    {formatCurrency(netCashflow, user?.currency, locale)}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                ) : null}

                                <TouchableOpacity
                                    style={[
                                        styles.savingsShortcutCard,
                                        {
                                            paddingHorizontal: secondaryCardPadding,
                                            paddingVertical: secondaryCardPadding,
                                        },
                                    ]}
                                    activeOpacity={0.86}
                                    onPress={onOpenSavings}
                                >
                                    <View style={styles.savingsShortcutIconWrap}>
                                        <Icon name="cash-outline" size={20} color={colors.success} />
                                    </View>
                                    <View style={styles.savingsShortcutCopy}>
                                        <Text
                                            style={[
                                                styles.savingsShortcutTitle,
                                                { fontSize: scaleFont(typography.fontSize.base) },
                                            ]}
                                        >
                                            {t('dashboard.savingsTitle')}
                                        </Text>
                                        <Text
                                            style={[
                                                styles.savingsShortcutSubtitle,
                                                { fontSize: scaleFont(typography.fontSize.sm) },
                                            ]}
                                        >
                                            {t('dashboard.savingsDescription')}
                                        </Text>
                                    </View>
                                    <Icon name="chevron-forward" size={18} color={colors.textPrimary} />
                                </TouchableOpacity>

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

const createStyles = (colors: any) =>
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
            marginRight: spacing.md,
        },
        greeting: {
            color: colors.textPrimary,
            fontWeight: typography.fontWeight.bold,
            letterSpacing: 0.2,
        },
        greetingSubtext: {
            color: colors.textMuted,
            marginTop: spacing.xs,
        },
        profileBadge: {
            backgroundColor: colors.surfaceCard,
            borderWidth: 1,
            borderColor: colors.border,
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
            marginHorizontal: spacing.xl,
            backgroundColor: colors.surfaceCard,
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
            marginBottom: spacing.base,
        },
        progressTrack: {
            height: 10,
            borderRadius: borderRadius.full,
            backgroundColor: withAlpha(colors.primaryAction, 0.12),
            overflow: 'hidden',
            marginBottom: spacing.base,
            borderWidth: 1,
            borderColor: withAlpha(colors.primaryAction, 0.18),
        },
        progressFill: {
            height: '100%',
            borderRadius: borderRadius.full,
            backgroundColor: colors.success,
        },
        budgetFooter: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.surfaceElevated,
            borderRadius: borderRadius.lg,
            borderWidth: 1,
            borderColor: colors.border,
            paddingVertical: spacing.sm,
            paddingHorizontal: spacing.xs,
        },
        budgetStat: {
            flex: 1,
            alignItems: 'center',
            paddingHorizontal: spacing.xs,
        },
        budgetStatDivider: {
            width: 1,
            height: 34,
            backgroundColor: colors.border,
        },
        budgetStatLabel: {
            color: colors.textMuted,
            marginBottom: spacing.xs,
            fontWeight: typography.fontWeight.medium,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
        },
        budgetStatValue: {
            color: colors.textPrimary,
            fontWeight: typography.fontWeight.bold,
            textAlign: 'center',
        },
        savingsShortcutCard: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.surfaceElevated,
            borderRadius: borderRadius.xl,
            borderWidth: 1,
            borderColor: colors.border,
            paddingHorizontal: spacing.base,
            paddingVertical: spacing.base,
            marginBottom: spacing.base,
        },
        cashflowCard: {
            backgroundColor: colors.surfaceElevated,
            borderRadius: borderRadius.xl,
            borderWidth: 1,
            borderColor: colors.border,
            marginBottom: spacing.base,
            gap: spacing.base,
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
            borderRadius: borderRadius.lg,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surfaceCard,
            paddingHorizontal: spacing.sm,
            paddingVertical: spacing.sm,
            gap: spacing.xs,
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
        savingsShortcutIconWrap: {
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: withAlpha(colors.success, 0.14),
            borderWidth: 1,
            borderColor: withAlpha(colors.success, 0.25),
        },
        savingsShortcutCopy: {
            flex: 1,
            marginHorizontal: spacing.base,
        },
        savingsShortcutTitle: {
            color: colors.textPrimary,
            fontWeight: typography.fontWeight.semibold,
        },
        savingsShortcutSubtitle: {
            color: colors.textMuted,
            marginTop: spacing.xs,
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
            marginTop: spacing.lg,
        },
        recentSection: {
            marginTop: spacing.lg,
        },
        sectionHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: spacing.base,
        },
        sectionTitle: {
            fontWeight: typography.fontWeight.bold,
            color: colors.textPrimary,
        },
        seeAll: {
            color: colors.primaryAction,
            fontWeight: typography.fontWeight.semibold,
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
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surfaceCard,
            borderRadius: borderRadius.xl,
            paddingHorizontal: spacing.base,
            paddingVertical: spacing.sm,
            marginBottom: spacing.sm,
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
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surfaceCard,
            borderRadius: borderRadius.xl,
            paddingHorizontal: spacing.base,
            paddingVertical: spacing.sm,
            marginBottom: spacing.sm,
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
            borderColor: withAlpha(colors.success, 0.32),
            backgroundColor: withAlpha(colors.success, 0.12),
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
            color: colors.success,
            fontWeight: typography.fontWeight.bold,
        },
        recentTrailing: {
            flexDirection: 'row',
            alignItems: 'center',
            marginLeft: spacing.sm,
        },
        recentPaymentMethodChip: {
            width: 30,
            height: 30,
            borderRadius: borderRadius.full,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surfaceElevated,
            marginRight: spacing.sm,
        },
    });
