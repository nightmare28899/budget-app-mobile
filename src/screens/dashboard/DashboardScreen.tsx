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
import {
    getPaymentMethodOption,
    PAYMENT_METHOD_FALLBACK_ICON,
} from '../../utils/paymentMethod';
import {
    borderRadius,
    spacing,
    typography,
    useResponsive,
    useThemedStyles,
} from '../../theme';
import { AnimatedScreen } from '../../components/ui/AnimatedScreen';
import { useDashboardScreen } from '../../hooks/useDashboardScreen';
import { useI18n } from '../../hooks/useI18n';
import { HomeBackground } from '../../components/ui/HomeBackground';
import { getMainTabListBottomPadding } from '../../navigation/mainTabLayout';

const NAVY_BG = '#050F22';
const NAVY_CARD = '#0E2345';
const NAVY_CARD_ALT = '#132C56';
const NAVY_STROKE = 'rgba(138, 171, 213, 0.28)';
const MUTED_TEXT = '#91A9CE';
const BRIGHT_TEXT = '#EAF3FF';
const ACCENT_GREEN = '#00E676';
const ERROR_RED = '#FF6B7A';

export function DashboardScreen({ route, navigation }: MainTabScreenProps<'Dashboard'>) {
    const insets = useSafeAreaInsets();
    const styles = useThemedStyles(createStyles);
    const {
        horizontalPadding,
        contentMaxWidth,
        isSmallPhone,
        scaleFont,
        scaleSize,
    } = useResponsive();
    const { t } = useI18n();

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
        upcomingSubscriptions,
        isUpcomingLoading,
        hasUpcomingError,
        hasHistoryError,
        hasBudgetError,
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
        scaleSize,
    });
    const progressWidth: `${number}%` = `${Math.min(Math.max(usagePercentage, 0), 100)}%`;
    const hasDashboardError = hasHistoryError || hasBudgetError;
    const shouldShowUpcomingSection =
        isUpcomingLoading || hasUpcomingError || upcomingSubscriptions.length > 0;
    const greetingName = user?.name?.trim()?.split(/\s+/)[0] || 'Kevin';
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
                    ]}
                >
                    <View style={styles.greetingContainer}>
                        <Text
                            style={[styles.greeting, { fontSize: scaleFont(typography.fontSize['2xl']) }]}
                            numberOfLines={1}
                        >
                            {`Hello, ${greetingName}`}
                        </Text>
                        <Text
                            style={[styles.greetingSubtext, { fontSize: scaleFont(typography.fontSize.sm) }]}
                        >
                            Personal finance at a glance
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
                            tintColor={ACCENT_GREEN}
                            colors={[ACCENT_GREEN]}
                        />
                    }
                >
                    <View
                        style={[
                            styles.contentInner,
                            { paddingHorizontal: horizontalPadding },
                            contentMaxWidth
                                ? { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }
                                : null,
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
                                            <Icon name="refresh-outline" size={14} color={BRIGHT_TEXT} />
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
                                            marginHorizontal: 0,
                                            padding: isSmallPhone
                                                ? scaleSize(spacing.lg, 0.5)
                                                : scaleSize(spacing.xl, 0.5),
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
                                        Daily Spend
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
                                                        color: safeToSpend >= 0 ? ACCENT_GREEN : ERROR_RED,
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

                                <TouchableOpacity
                                    style={styles.savingsShortcutCard}
                                    activeOpacity={0.86}
                                    onPress={onOpenSavings}
                                >
                                    <View style={styles.savingsShortcutIconWrap}>
                                        <Icon name="cash-outline" size={20} color={ACCENT_GREEN} />
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
                                    <Icon name="chevron-forward" size={18} color={BRIGHT_TEXT} />
                                </TouchableOpacity>

                                {shouldShowUpcomingSection && (
                                    <View style={[styles.section, styles.upcomingSection, { paddingHorizontal: 0 }]}>
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
                                                <Icon name="refresh-outline" size={14} color={BRIGHT_TEXT} />
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
                                                                        ? BRIGHT_TEXT
                                                                        : MUTED_TEXT
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
                                                            {t('dashboard.upcomingRow', {
                                                                name: item.name,
                                                                amount: formatCurrency(
                                                                    item.amount,
                                                                    user?.currency,
                                                                ),
                                                                days: item.daysRemaining,
                                                            })}
                                                        </Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </>
                                    )}
                                    </View>
                                )}

                                <View style={[styles.section, styles.recentSection, { paddingHorizontal: 0 }]}>
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
                                                            color={BRIGHT_TEXT}
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
                                                            {isSubscriptionRecord
                                                                ? t('history.subscriptionBadge')
                                                                : t('history.manualExpense')}{' '}
                                                            • {formatDate(item.date, 'MMM D, YYYY')}
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
                                                                        ? BRIGHT_TEXT
                                                                        : MUTED_TEXT
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
                                                            -{formatCurrency(item.amount, user?.currency)}
                                                        </Text>
                                                    </View>
                                                </TouchableOpacity>
                                            );
                                        })
                                    )}
                                </View>
                            </>
                        )}
                    </View>
                </ScrollView>
            </AnimatedScreen>
        </View>
    );
}

const createStyles = (_colors: any) =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: NAVY_BG,
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
            color: BRIGHT_TEXT,
            fontWeight: typography.fontWeight.bold,
            letterSpacing: 0.2,
        },
        greetingSubtext: {
            color: MUTED_TEXT,
            marginTop: spacing.xs,
        },
        profileBadge: {
            backgroundColor: NAVY_CARD,
            borderWidth: 1,
            borderColor: NAVY_STROKE,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
        },
        profileImage: {
            width: '100%',
            height: '100%',
        },
        profileInitial: {
            color: BRIGHT_TEXT,
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
            backgroundColor: NAVY_CARD,
            borderRadius: borderRadius.xl,
            marginBottom: spacing.base,
            borderWidth: 1,
            borderColor: NAVY_STROKE,
            overflow: 'hidden',
        },
        budgetGlow: {
            position: 'absolute',
            width: 220,
            height: 120,
            right: -80,
            top: -40,
            borderRadius: 140,
            backgroundColor: 'rgba(0, 230, 118, 0.16)',
        },
        budgetLabel: {
            color: MUTED_TEXT,
            textTransform: 'uppercase',
            fontWeight: typography.fontWeight.semibold,
            letterSpacing: 0.8,
            marginBottom: spacing.sm,
        },
        budgetAmount: {
            color: BRIGHT_TEXT,
            fontWeight: typography.fontWeight.extrabold,
            marginBottom: spacing.base,
        },
        progressTrack: {
            height: 10,
            borderRadius: borderRadius.full,
            backgroundColor: NAVY_CARD_ALT,
            overflow: 'hidden',
            marginBottom: spacing.base,
            borderWidth: 1,
            borderColor: 'rgba(0, 230, 118, 0.16)',
        },
        progressFill: {
            height: '100%',
            borderRadius: borderRadius.full,
            backgroundColor: ACCENT_GREEN,
        },
        budgetFooter: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: 'rgba(7, 20, 40, 0.55)',
            borderRadius: borderRadius.lg,
            borderWidth: 1,
            borderColor: 'rgba(138, 171, 213, 0.18)',
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
            backgroundColor: 'rgba(138, 171, 213, 0.22)',
        },
        budgetStatLabel: {
            color: MUTED_TEXT,
            marginBottom: spacing.xs,
            fontWeight: typography.fontWeight.medium,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
        },
        budgetStatValue: {
            color: BRIGHT_TEXT,
            fontWeight: typography.fontWeight.bold,
            textAlign: 'center',
        },
        savingsShortcutCard: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: NAVY_CARD_ALT,
            borderRadius: borderRadius.xl,
            borderWidth: 1,
            borderColor: NAVY_STROKE,
            paddingHorizontal: spacing.base,
            paddingVertical: spacing.base,
            marginBottom: spacing.base,
        },
        savingsShortcutIconWrap: {
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 230, 118, 0.14)',
            borderWidth: 1,
            borderColor: 'rgba(0, 230, 118, 0.25)',
        },
        savingsShortcutCopy: {
            flex: 1,
            marginHorizontal: spacing.base,
        },
        savingsShortcutTitle: {
            color: BRIGHT_TEXT,
            fontWeight: typography.fontWeight.semibold,
        },
        savingsShortcutSubtitle: {
            color: MUTED_TEXT,
            marginTop: spacing.xs,
        },
        errorCard: {
            borderWidth: 1,
            borderColor: 'rgba(255, 107, 122, 0.45)',
            backgroundColor: 'rgba(255, 107, 122, 0.15)',
            borderRadius: borderRadius.xl,
            paddingHorizontal: spacing.base,
            paddingVertical: spacing.base,
            marginBottom: spacing.base,
        },
        errorTitle: {
            color: BRIGHT_TEXT,
            fontWeight: typography.fontWeight.bold,
        },
        errorDescription: {
            color: '#FFD3D8',
            marginTop: spacing.xs,
        },
        errorRetryButton: {
            marginTop: spacing.sm,
            alignSelf: 'flex-start',
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.xs,
            borderWidth: 1,
            borderColor: 'rgba(255, 211, 216, 0.55)',
            borderRadius: borderRadius.full,
            paddingHorizontal: spacing.sm,
            paddingVertical: spacing.xs,
        },
        errorRetryText: {
            color: BRIGHT_TEXT,
            fontWeight: typography.fontWeight.semibold,
        },
        section: {
            paddingHorizontal: spacing.xl,
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
            color: BRIGHT_TEXT,
        },
        seeAll: {
            color: ACCENT_GREEN,
            fontWeight: typography.fontWeight.semibold,
        },
        upcomingSummary: {
            color: MUTED_TEXT,
            marginBottom: spacing.sm,
        },
        upcomingStateText: {
            color: MUTED_TEXT,
            marginBottom: spacing.sm,
        },
        upcomingErrorCard: {
            borderWidth: 1,
            borderColor: 'rgba(255, 107, 122, 0.45)',
            backgroundColor: 'rgba(255, 107, 122, 0.12)',
            borderRadius: borderRadius.lg,
            paddingHorizontal: spacing.base,
            paddingVertical: spacing.sm,
            marginBottom: spacing.sm,
        },
        upcomingErrorText: {
            color: '#FFD3D8',
            fontWeight: typography.fontWeight.medium,
        },
        upcomingRetryButton: {
            marginTop: spacing.sm,
            alignSelf: 'flex-start',
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.xs,
            borderWidth: 1,
            borderColor: 'rgba(255, 211, 216, 0.55)',
            borderRadius: borderRadius.full,
            paddingHorizontal: spacing.sm,
            paddingVertical: spacing.xs,
        },
        upcomingRetryText: {
            color: BRIGHT_TEXT,
            fontWeight: typography.fontWeight.semibold,
        },
        upcomingRow: {
            borderWidth: 1,
            borderColor: 'rgba(120, 164, 255, 0.26)',
            backgroundColor: NAVY_CARD,
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
            borderColor: 'rgba(120, 164, 255, 0.52)',
            backgroundColor: 'rgba(120, 164, 255, 0.2)',
            marginRight: spacing.sm,
        },
        methodChipActive: {
            borderColor: 'rgba(0, 230, 118, 0.4)',
            backgroundColor: 'rgba(0, 230, 118, 0.16)',
        },
        upcomingRowText: {
            flex: 1,
            color: BRIGHT_TEXT,
            fontWeight: typography.fontWeight.semibold,
        },
        recentRow: {
            borderWidth: 1,
            borderColor: 'rgba(138, 171, 213, 0.24)',
            backgroundColor: NAVY_CARD,
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
            borderColor: 'rgba(0, 230, 118, 0.45)',
            backgroundColor: 'rgba(0, 230, 118, 0.15)',
        },
        recentIconSubscription: {
            borderColor: 'rgba(120, 164, 255, 0.52)',
            backgroundColor: 'rgba(120, 164, 255, 0.2)',
        },
        recentInfo: {
            flex: 1,
            marginHorizontal: spacing.sm,
        },
        recentTitle: {
            color: BRIGHT_TEXT,
            fontWeight: typography.fontWeight.semibold,
        },
        recentMeta: {
            marginTop: 2,
            color: MUTED_TEXT,
        },
        recentAmount: {
            color: ACCENT_GREEN,
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
            borderColor: 'rgba(138, 171, 213, 0.28)',
            backgroundColor: 'rgba(7, 20, 40, 0.55)',
            marginRight: spacing.sm,
        },
    });
