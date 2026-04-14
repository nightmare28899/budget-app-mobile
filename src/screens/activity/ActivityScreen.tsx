import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    RefreshControl,
    SectionList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MainTabScreenProps } from '../../navigation/types';
import { useAuthStore } from '../../store/authStore';
import { useSubscriptionsScreen } from '../../hooks/useSubscriptionsScreen';
import { formatCurrency } from '../../utils/core/format';
import { withAlpha } from '../../utils/domain/subscriptions';
import { Expense } from '../../types/index';
import { ExpenseItem } from '../../components/ui/domain/ExpenseItem';
import { SubscriptionItem } from '../../components/ui/domain/SubscriptionItem';
import { EmptyState } from '../../components/ui/primitives/EmptyState';
import { AnimatedScreen } from '../../components/ui/primitives/AnimatedScreen';
import { HistorySkeleton } from '../../components/ui/primitives/Skeleton';
import { HomeBackground } from '../../components/ui/layout/HomeBackground';
import { useI18n } from '../../hooks/useI18n';
import { Button } from '../../components/ui/primitives/Button';
import {
    borderRadius,
    spacing,
    typography,
    useResponsive,
    useTheme,
    useThemedStyles,
    SemanticColors,
} from '../../theme/index';
import { getMainTabListBottomPadding } from '../../navigation/mainTabLayout';
import { useExpensesScreen } from '../../hooks/useExpensesScreen';

type CardsTab = 'expenses' | 'subscriptions';
type CardsSection<T> = {
    title: string;
    data: T[];
};

export function ActivityScreen({ navigation, route }: MainTabScreenProps<'Activity'>) {
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);
    const insets = useSafeAreaInsets();
    const {
        horizontalPadding,
        contentMaxWidth,
        isSmallPhone,
        isTablet,
        scaleFont,
        scaleSize,
    } = useResponsive();
    const { t, tPlural } = useI18n();
    const user = useAuthStore((s) => s.user);
    const initialTab = route.params?.initialTab;
    const successMessage = route.params?.successMessage;
    const [activeTab, setActiveTab] = useState<CardsTab>(initialTab ?? 'expenses');

    useEffect(() => {
        if (!initialTab) {
            return;
        }

        if (initialTab !== activeTab) {
            setActiveTab(initialTab);
        }

        navigation.setParams({ initialTab: undefined });
    }, [activeTab, initialTab, navigation]);

    const {
        items: expenses,
        total,
        totalCount,
        isLoading: expensesLoading,
        isRefreshing: expensesRefreshing,
        isLoadingMore: expensesLoadingMore,
        error: expensesError,
        refreshError: expensesRefreshError,
        loadMoreError: expensesLoadMoreError,
        hasNext: hasMoreExpenses,
        refresh: refetchExpenses,
        loadMore: loadMoreExpenses,
        retry: retryExpenses,
        onDeleteExpense,
        activeSwipeableRef: expenseSwipeableRef,
        activeSwipeableIdRef: expenseSwipeableIdRef,
    } = useExpensesScreen({
        navigation,
        successMessage: initialTab === 'expenses' ? successMessage : undefined,
    });

    const parentNavigation = navigation.getParent();
    const subscriptionsNavigation = useMemo(
        () => ({
            navigate: (...args: [screen: string, params?: object]) => {
                if (parentNavigation && args[0] === 'Tabs') {
                    (parentNavigation.navigate as (...a: [string, object?]) => void)(...args);
                    return;
                }
                (navigation.navigate as (...a: [string, object?]) => void)(...args);
            },
            addListener: navigation.addListener,
            setParams: navigation.setParams,
        }),
        [navigation, parentNavigation],
    );

    const {
        isLoading: subscriptionsLoading,
        isRefreshing: subscriptionsRefreshing,
        subscriptions,
        refetch: refetchSubscriptions,
        animatedTotal,
        locale,
        activeCountLabel,
        activeSwipeableRef,
        activeSwipeableIdRef,
        onEditSubscription,
        onDeleteSubscription,
    } = useSubscriptionsScreen({
        navigation: subscriptionsNavigation,
        successMessage: initialTab === 'subscriptions' ? successMessage : undefined,
        upcomingOnly: false,
        upcomingDays: 3,
    });

    const constrainedContentStyle = contentMaxWidth
        ? { maxWidth: contentMaxWidth, alignSelf: 'center' as const, width: '100%' as const }
        : null;
    const listBottomPadding = getMainTabListBottomPadding({
        insetsBottom: insets.bottom,
        isSmallPhone,
        isTablet,
        scaleSize,
        extraSpacing: isTablet ? spacing.xl : spacing.base,
    });

    const todayKey = useMemo(() => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }, []);

    const isExpensesTab = activeTab === 'expenses';
    const summaryText = t('expenses.overviewSubtitle', {
        count: totalCount,
        total: formatCurrency(total, user?.currency),
    });
    const expensesCountLabel = tPlural('analytics.expenseCount', totalCount);
    const showExpensesSkeleton = expensesLoading && expenses.length === 0;
    const showExpensesInitialError = !!expensesError;

    const sectionLocale: 'en-US' | 'es-MX' = locale === 'es-MX' ? 'es-MX' : 'en-US';
    const formatSectionDateTitle = useCallback((date: string) => {
        const dateObj = new Date(`${date}T12:00:00`);
        const dayAndMonth = dateObj.toLocaleDateString(sectionLocale, {
            day: 'numeric',
            month: 'long',
        });
        const weekday = dateObj.toLocaleDateString(sectionLocale, {
            weekday: 'long',
        });

        if (date === todayKey) {
            return `${t('history.todayLabel')}, ${dayAndMonth}`;
        }

        return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${dayAndMonth}`;
    }, [sectionLocale, t, todayKey]);

    const expenseSections = useMemo<CardsSection<Expense>[]>(() => {
        if (!expenses.length) return [];

        const grouped = expenses.reduce<Record<string, Expense[]>>((acc, expense) => {
            const dateStr = expense.date ? expense.date.slice(0, 10) : todayKey;
            if (!acc[dateStr]) acc[dateStr] = [];
            acc[dateStr].push(expense);
            return acc;
        }, {});

        return Object.entries(grouped)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([date, items]) => ({
                title: formatSectionDateTitle(date),
                data: items,
            }));
    }, [expenses, todayKey, formatSectionDateTitle]);

    const expensesFooter = useMemo(() => {
        if (expensesLoadingMore) {
            return (
                <View style={styles.footerState}>
                    <ActivityIndicator color={colors.primary} />
                </View>
            );
        }

        if (expensesLoadMoreError) {
            return (
                <View style={styles.footerState}>
                    <Text style={styles.footerText}>{t('expenses.loadMoreError')}</Text>
                    <Button
                        title={t('common.retry')}
                        onPress={loadMoreExpenses}
                        variant="secondary"
                        containerStyle={styles.footerButton}
                    />
                </View>
            );
        }

        if (!hasMoreExpenses) {
            return <View style={styles.footerSpacer} />;
        }

        return <View style={styles.footerSpacer} />;
    }, [
        colors.primary,
        hasMoreExpenses,
        expensesLoadMoreError,
        expensesLoadingMore,
        loadMoreExpenses,
        styles.footerButton,
        styles.footerSpacer,
        styles.footerState,
        styles.footerText,
        t,
    ]);

    const subscriptionSections = useMemo(() => {
        if (!subscriptions.length) return [];

        const grouped = subscriptions.reduce<Record<string, typeof subscriptions>>((acc, sub) => {
            const rawDate = sub.chargeDate || sub.nextPaymentDate;
            const dateStr = rawDate ? rawDate.slice(0, 10) : todayKey;
            if (!acc[dateStr]) acc[dateStr] = [];
            acc[dateStr].push(sub);
            return acc;
        }, {});

        return Object.entries(grouped)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, items]) => ({
                title: formatSectionDateTitle(date),
                data: items,
            }));
    }, [subscriptions, todayKey, formatSectionDateTitle]);

    const renderModuleHeader = ({
        title,
        subtitle,
        summaryLabel,
        summaryValue,
        summaryMeta,
    }: {
        title: string;
        subtitle: string;
        summaryLabel: string;
        summaryValue: string;
        summaryMeta: string;
    }) => (
        <View style={{ paddingBottom: spacing.sm }}>
            <View style={[styles.sectionHeader, { marginHorizontal: horizontalPadding }, constrainedContentStyle]}>
                <Text style={[styles.sectionTitle, { fontSize: scaleFont(typography.fontSize.lg) }]}>
                    {title}
                </Text>
                <Text style={[styles.sectionSubtitle, { fontSize: scaleFont(typography.fontSize.sm) }]}>
                    {subtitle}
                </Text>
            </View>
                <View
                    style={[
                        styles.summaryCard,
                        {
                            padding: isSmallPhone
                                ? scaleSize(spacing.lg, 0.45)
                                : scaleSize(spacing.xl, 0.45),
                        },
                        { marginHorizontal: horizontalPadding },
                        constrainedContentStyle,
                ]}
            >
                <View style={styles.summaryGlow} />
                <Text style={[styles.summaryLabel, { fontSize: scaleFont(typography.fontSize.sm) }]}>
                    {summaryLabel}
                </Text>
                <Text style={[styles.summaryValue, { fontSize: scaleFont(typography.fontSize['4xl']) }]}>
                    {summaryValue}
                </Text>
                <Text style={[styles.summaryMeta, { fontSize: scaleFont(typography.fontSize.xs) }]}>
                    {summaryMeta}
                </Text>
            </View>
        </View>
    );

    const renderDateSectionHeader = (title: string) => (
        <View
            style={[
                styles.sectionHeaderHistory,
                { marginHorizontal: horizontalPadding },
                constrainedContentStyle,
            ]}
        >
            <Text
                style={[styles.sectionDate, { fontSize: scaleFont(typography.fontSize.sm) }]}
            >
                {title}
            </Text>
        </View>
    );

    const expensesHeader = (
        <>
            {renderModuleHeader({
                title: t('expenses.title'),
                subtitle: summaryText,
                summaryLabel: t('expenses.totalSpending'),
                summaryValue: formatCurrency(total, user?.currency),
                summaryMeta: expensesCountLabel,
            })}
            {expensesRefreshError ? (
                <View
                    style={[
                        styles.inlineErrorCard,
                        { marginHorizontal: horizontalPadding },
                        constrainedContentStyle,
                    ]}
                >
                    <Text style={[styles.inlineErrorTitle, { fontSize: scaleFont(typography.fontSize.sm) }]}>
                        {t('common.error')}
                    </Text>
                    <Text
                        style={[
                            styles.inlineErrorDescription,
                            { fontSize: scaleFont(typography.fontSize.xs) },
                        ]}
                    >
                        {t('expenses.loadErrorDescription')}
                    </Text>
                </View>
            ) : null}
        </>
    );

    const subscriptionsHeader = renderModuleHeader({
        title: t('subscriptions.title'),
        subtitle: t('subscriptions.subtitle'),
        summaryLabel: t('subscriptions.totalMonthly'),
        summaryValue: formatCurrency(animatedTotal, user?.currency),
        summaryMeta: activeCountLabel,
    });

    return (
        <View style={styles.container}>
            <HomeBackground />
            <AnimatedScreen style={styles.flex1} delay={8} duration={200} travelY={6}>
                <View
                    style={[
                        styles.headerRow,
                        { paddingTop: insets.top + spacing.base, paddingHorizontal: horizontalPadding },
                        constrainedContentStyle,
                    ]}
                >
                    <Text
                        style={[
                            styles.headerTitle,
                            { fontSize: scaleFont(typography.fontSize.xl) },
                        ]}
                    >
                        {t('tab.activity')}
                    </Text>
                </View>

                <View style={[styles.segmentedWrap, { marginHorizontal: horizontalPadding }, constrainedContentStyle]}>
                    <TouchableOpacity
                        style={[
                            styles.segmentButton,
                            isExpensesTab ? styles.segmentActive : null,
                        ]}
                        onPress={() => setActiveTab('expenses')}
                        activeOpacity={0.82}
                    >
                        <Text
                            style={[
                                styles.segmentText,
                                isExpensesTab ? styles.segmentTextActive : null,
                                {
                                    fontSize: scaleFont(typography.fontSize.sm),
                                },
                            ]}
                        >
                            {t('addEntry.expenseTab')}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            styles.segmentButton,
                            !isExpensesTab ? styles.segmentActive : null,
                        ]}
                        onPress={() => setActiveTab('subscriptions')}
                        activeOpacity={0.82}
                    >
                        <Text
                            style={[
                                styles.segmentText,
                                !isExpensesTab ? styles.segmentTextActive : null,
                                { fontSize: scaleFont(typography.fontSize.sm) },
                            ]}
                        >
                            {t('addEntry.subscriptionTab')}
                        </Text>
                    </TouchableOpacity>
                </View>

                {isExpensesTab ? (
                    showExpensesSkeleton ? (
                        <View
                            style={[
                                styles.listContent,
                                styles.noHorizontalPadding,
                                {
                                    paddingTop: spacing.sm,
                                    paddingBottom: listBottomPadding,
                                },
                            ]}
                        >
                            {expensesHeader}
                            <View style={[{ marginHorizontal: horizontalPadding }, constrainedContentStyle]}>
                                <HistorySkeleton horizontalPadding={0} />
                            </View>
                        </View>
                    ) : showExpensesInitialError ? (
                        <View
                            style={[
                                styles.listContent,
                                styles.noHorizontalPadding,
                                {
                                    paddingTop: spacing.sm,
                                    paddingBottom: listBottomPadding,
                                },
                            ]}
                        >
                            {expensesHeader}
                            <View
                                style={[
                                    styles.emptyBlock,
                                    { marginHorizontal: horizontalPadding },
                                    constrainedContentStyle,
                                ]}
                            >
                                <EmptyState
                                    icon="alert-circle-outline"
                                    title={t('common.error')}
                                    description={t('expenses.loadErrorDescription')}
                                />
                                <Button
                                    title={t('common.retry')}
                                    onPress={retryExpenses}
                                    containerStyle={styles.emptyButton}
                                />
                            </View>
                        </View>
                    ) : (
                        <SectionList
                            sections={expenseSections}
                            keyExtractor={(item) => item.id}
                            ListHeaderComponent={expensesHeader}
                            stickySectionHeadersEnabled={false}
                            refreshControl={
                                <RefreshControl
                                    refreshing={expensesRefreshing}
                                    onRefresh={refetchExpenses}
                                    tintColor={colors.primary}
                                />
                            }
                            renderSectionHeader={({ section }) => renderDateSectionHeader(section.title)}
                            renderItem={({ item, index }: { item: Expense; index: number }) => (
                                <View style={[{ marginHorizontal: horizontalPadding }, constrainedContentStyle]}>
                                    <ExpenseItem
                                        key={item.id}
                                        expense={item}
                                        onPress={(id) => navigation.navigate('EditExpense', { id })}
                                        onEdit={(id) => navigation.navigate('EditExpense', { id })}
                                        onDelete={onDeleteExpense}
                                        activeSwipeableRef={expenseSwipeableRef}
                                        activeSwipeableIdRef={expenseSwipeableIdRef}
                                        animationDelay={Math.min(index * 35, 180)}
                                        showDateHeader={false}
                                        compact
                                    />
                                </View>
                            )}
                            ListEmptyComponent={
                                <EmptyState
                                    icon="wallet-outline"
                                    title={t('expenses.emptyTitle')}
                                    description={t('expenses.emptyDescription')}
                                />
                            }
                            ListFooterComponent={expensesFooter}
                            onEndReached={loadMoreExpenses}
                            onEndReachedThreshold={0.35}
                            contentContainerStyle={[
                                styles.listContent,
                                styles.noHorizontalPadding,
                                {
                                    paddingTop: spacing.sm,
                                    paddingBottom: listBottomPadding,
                                },
                            ]}
                        />
                    )
                ) : (
                    <SectionList
                        sections={subscriptionSections}
                        keyExtractor={(item) => item.id}
                        stickySectionHeadersEnabled={false}
                        ListHeaderComponent={subscriptionsHeader}
                        refreshControl={
                            <RefreshControl
                                refreshing={subscriptionsRefreshing || subscriptionsLoading}
                                onRefresh={refetchSubscriptions}
                                tintColor={colors.primary}
                            />
                        }
                        renderSectionHeader={({ section }) => renderDateSectionHeader(section.title)}
                        renderItem={({ item, index }) => (
                            <View
                                style={[
                                    styles.compactSubscriptionCard,
                                    { marginHorizontal: horizontalPadding },
                                    constrainedContentStyle,
                                ]}
                            >
                                <SubscriptionItem
                                    subscription={item}
                                    locale={locale}
                                    onPress={onEditSubscription}
                                    onEdit={onEditSubscription}
                                    onDelete={onDeleteSubscription}
                                    activeSwipeableRef={activeSwipeableRef}
                                    activeSwipeableIdRef={activeSwipeableIdRef}
                                    animationDelay={index * 45}
                                    compact
                                />
                            </View>
                        )}
                        ListEmptyComponent={
                            <View style={styles.emptyBlock}>
                                <EmptyState
                                    icon="card-outline"
                                    title={t('subscriptions.emptyTitle')}
                                    description={t('subscriptions.emptyDescription')}
                                />
                            </View>
                        }
                        contentContainerStyle={[
                            styles.listContent,
                            styles.noHorizontalPadding,
                            {
                                paddingTop: spacing.sm,
                                paddingBottom: listBottomPadding,
                            },
                        ]}
                    />
                )}
            </AnimatedScreen>
        </View>
    );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    flex1: {
        flex: 1,
    },
    headerRow: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
    },
    headerTitle: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.bold,
    },
    segmentedWrap: {
        flexDirection: 'row',
        backgroundColor: withAlpha(colors.surfaceCard, 0.9),
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 3,
        marginTop: spacing.lg,
    },
    segmentButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.lg,
    },
    segmentActive: {
        backgroundColor: colors.primaryAction,
    },
    segmentText: {
        color: colors.textSecondary,
        fontWeight: typography.fontWeight.semibold,
    },
    segmentTextActive: {
        color: '#fff',
    },
    listContent: {
        paddingBottom: spacing['5xl'],
    },
    noHorizontalPadding: {
        paddingHorizontal: 0,
    },
    sectionHeader: {
        marginBottom: spacing.lg,
        marginTop: spacing.sm,
    },
    sectionTitle: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.bold,
    },
    sectionSubtitle: {
        color: colors.textMuted,
        marginTop: spacing.xs,
    },
    sectionHeaderHistory: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'transparent',
        paddingVertical: spacing.xs,
        marginBottom: spacing.xs,
        marginTop: spacing.xs,
    },
    sectionDate: {
        fontWeight: typography.fontWeight.semibold,
        color: colors.textSecondary,
    },
    sectionTotal: {
        fontWeight: typography.fontWeight.semibold,
        color: colors.textMuted,
    },
    summaryCard: {
        borderRadius: borderRadius.xl,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surfaceCard,
        overflow: 'hidden',
        marginBottom: spacing.lg,
    },
    summaryGlow: {
        position: 'absolute',
        right: -24,
        top: -24,
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: withAlpha(colors.primaryAction, 0.15),
    },
    summaryLabel: {
        color: colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },
    summaryValue: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.bold,
        marginTop: spacing.xs,
    },
    summaryMeta: {
        color: colors.textMuted,
        marginTop: spacing.xs,
    },
    cardsList: {
        gap: spacing.lg,
    },
    footerState: {
        alignItems: 'center',
        paddingTop: spacing.sm,
        paddingBottom: spacing.lg,
    },
    footerText: {
        color: colors.textSecondary,
        marginBottom: spacing.sm,
    },
    footerButton: {
        minWidth: 140,
    },
    footerSpacer: {
        height: spacing.lg,
    },
    compactSubscriptionCard: {
        marginBottom: spacing.sm,
    },
    inlineErrorCard: {
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: withAlpha(colors.error, 0.4),
        borderRadius: borderRadius.lg,
        backgroundColor: withAlpha(colors.error, 0.14),
        paddingHorizontal: spacing.base,
        paddingVertical: spacing.sm + 2,
    },
    inlineErrorTitle: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.bold,
    },
    inlineErrorDescription: {
        color: colors.textSecondary,
        marginTop: spacing.xs,
    },
    emptyBlock: {
        alignItems: 'center',
        marginTop: spacing.xl,
        gap: spacing.md,
    },
    emptyButton: {
        marginTop: spacing.sm,
        width: '100%',
    },
});
