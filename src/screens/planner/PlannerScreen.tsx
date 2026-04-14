import React from 'react';
import {
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { DrawerActions } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { EmptyState } from '../../components/ui/primitives/EmptyState';
import { AnimatedScreen } from '../../components/ui/primitives/AnimatedScreen';
import { Button } from '../../components/ui/primitives/Button';
import { HomeBackground } from '../../components/ui/layout/HomeBackground';
import { creditCardsApi } from '../../api/resources/creditCards';
import { expensesApi } from '../../api/resources/expenses';
import { incomesApi } from '../../api/resources/incomes';
import { subscriptionsApi } from '../../api/resources/subscriptions';
import { useI18n } from '../../hooks/useI18n';
import { MainDrawerScreenProps } from '../../navigation/types';
import { useAuthStore } from '../../store/authStore';
import {
    borderRadius,
    spacing,
    typography,
    useResponsive,
    useTheme,
    useThemedStyles,
} from '../../theme/index';
import {
    buildPlannerMonthData,
    getPlannerMonthRange,
    isSamePlannerMonth,
    PlannerEvent,
    shiftPlannerMonth,
} from '../../modules/planner/monthPlanner';
import { formatCurrency } from '../../utils/core/format';
import {
    formatCurrencyBreakdown,
    getCurrencyLocale,
} from '../../utils/domain/currency';
import { withAlpha } from '../../utils/domain/subscriptions';

function formatMonthLabel(value: Date, locale: 'es-MX' | 'en-US') {
    const raw = value.toLocaleDateString(locale, {
        month: 'long',
        year: 'numeric',
    });

    return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function formatDayLabel(value: string, locale: 'es-MX' | 'en-US') {
    const raw = new Date(`${value}T12:00:00`).toLocaleDateString(locale, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
    });

    return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function formatShortDate(value: string, locale: 'es-MX' | 'en-US') {
    return new Date(`${value}T12:00:00`).toLocaleDateString(locale, {
        month: 'short',
        day: 'numeric',
    });
}

function getEventTone(
    event: PlannerEvent,
    colors: ReturnType<typeof useTheme>['colors'],
) {
    if (event.kind === 'income') {
        return { color: colors.success, background: withAlpha(colors.success, 0.14) };
    }
    if (event.kind === 'expense') {
        return { color: colors.error, background: withAlpha(colors.error, 0.14) };
    }
    if (event.kind === 'subscription' || event.kind === 'cardPayment') {
        return { color: colors.warning, background: withAlpha(colors.warning, 0.14) };
    }

    return { color: colors.primaryAction, background: withAlpha(colors.primaryAction, 0.14) };
}

function getEventIcon(event: PlannerEvent) {
    if (event.kind === 'income') {
        return 'trending-up-outline';
    }
    if (event.kind === 'expense') {
        return 'remove-circle-outline';
    }
    if (event.kind === 'subscription') {
        return 'albums-outline';
    }
    if (event.kind === 'cardPayment') {
        return 'card-outline';
    }

    return 'calendar-outline';
}

function getBillingCycleLabel(
    billingCycle: PlannerEvent['billingCycle'],
    t: ReturnType<typeof useI18n>['t'],
) {
    if (billingCycle === 'WEEKLY') {
        return t('addSubscription.frequencyWeekly');
    }
    if (billingCycle === 'YEARLY') {
        return t('addSubscription.frequencyYearly');
    }

    return t('addSubscription.frequencyMonthly');
}

function getEventCopy(event: PlannerEvent, t: ReturnType<typeof useI18n>['t']) {
    if (event.kind === 'subscription') {
        return {
            title: event.title,
            subtitle: `${t('planner.subscriptionCharge')} • ${getBillingCycleLabel(event.billingCycle, t)}`,
        };
    }
    if (event.kind === 'cardPayment') {
        return {
            title: t('planner.cardPaymentDue'),
            subtitle: [event.title, event.detail].filter(Boolean).join(' • '),
        };
    }
    if (event.kind === 'cardClosing') {
        return {
            title: t('planner.cardClosing'),
            subtitle: [event.title, event.detail].filter(Boolean).join(' • '),
        };
    }
    if (event.kind === 'income') {
        return {
            title: event.title,
            subtitle: event.detail?.trim() || t('planner.incomeEntry'),
        };
    }

    return {
        title: event.title,
        subtitle: event.detail?.trim() || t('planner.expenseEntry'),
    };
}

export function PlannerScreen({ navigation }: MainDrawerScreenProps<'Planner'>) {
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);
    const insets = useSafeAreaInsets();
    const user = useAuthStore((state) => state.user);
    const {
        horizontalPadding,
        contentMaxWidth,
        isSmallPhone,
        scaleFont,
        scaleSize,
    } = useResponsive();
    const { t, language } = useI18n();
    const locale = getCurrencyLocale(language);
    const [selectedMonth, setSelectedMonth] = React.useState(() => {
        const now = new Date();
        now.setDate(1);
        now.setHours(12, 0, 0, 0);
        return now;
    });

    const plannerRange = React.useMemo(
        () => getPlannerMonthRange(selectedMonth),
        [selectedMonth],
    );

    const expensesQuery = useQuery({
        queryKey: ['planner', 'expenses', plannerRange.startKey, plannerRange.endKey],
        queryFn: () => expensesApi.getAllPages({
            from: plannerRange.startKey,
            to: plannerRange.endKey,
        }),
    });
    const incomesQuery = useQuery({
        queryKey: ['planner', 'incomes', plannerRange.startKey, plannerRange.endKey],
        queryFn: () => incomesApi.getAll({
            from: plannerRange.startKey,
            to: plannerRange.endKey,
        }),
    });
    const subscriptionsQuery = useQuery({
        queryKey: ['planner', 'subscriptions'],
        queryFn: () => subscriptionsApi.getAll(),
    });
    const creditCardsQuery = useQuery({
        queryKey: ['planner', 'creditCards'],
        queryFn: () => creditCardsApi.getAll(),
    });

    const plannerData = React.useMemo(
        () => buildPlannerMonthData({
            anchorDate: selectedMonth,
            incomes: incomesQuery.data?.incomes ?? [],
            expenses: expensesQuery.data?.expenses ?? [],
            subscriptions: subscriptionsQuery.data ?? [],
            creditCards: creditCardsQuery.data ?? [],
        }),
        [
            creditCardsQuery.data,
            expensesQuery.data?.expenses,
            incomesQuery.data?.incomes,
            selectedMonth,
            subscriptionsQuery.data,
        ],
    );

    const monthLabel = React.useMemo(
        () => formatMonthLabel(selectedMonth, locale),
        [locale, selectedMonth],
    );
    const monthRangeLabel = React.useMemo(
        () => t('planner.rangeLabel', {
            start: formatShortDate(plannerData.range.startKey, locale),
            end: formatShortDate(plannerData.range.endKey, locale),
        }),
        [locale, plannerData.range.endKey, plannerData.range.startKey, t],
    );
    const todayKey = React.useMemo(() => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }, []);
    const isCurrentMonth = isSamePlannerMonth(selectedMonth, new Date());
    const constrainedContentStyle = contentMaxWidth
        ? { maxWidth: contentMaxWidth, alignSelf: 'center' as const, width: '100%' as const }
        : null;
    const cardPadding = isSmallPhone
        ? scaleSize(spacing.lg, 0.45)
        : scaleSize(spacing.xl, 0.45);
    const isRefreshing =
        expensesQuery.isRefetching
        || incomesQuery.isRefetching
        || subscriptionsQuery.isRefetching
        || creditCardsQuery.isRefetching;
    const isLoading =
        (expensesQuery.isLoading
            || incomesQuery.isLoading
            || subscriptionsQuery.isLoading
            || creditCardsQuery.isLoading)
        && plannerData.summary.eventCount === 0;
    const hasPartialError =
        !!expensesQuery.error
        || !!incomesQuery.error
        || !!subscriptionsQuery.error
        || !!creditCardsQuery.error;
    const summaryMeta = t('planner.monthSummaryMeta', {
        count: plannerData.summary.eventCount,
        days: plannerData.summary.busyDays,
    });
    const nextEventCopy = plannerData.summary.nextEvent
        ? getEventCopy(plannerData.summary.nextEvent, t)
        : null;

    const onRefresh = React.useCallback(() => {
        Promise.all([
            expensesQuery.refetch(),
            incomesQuery.refetch(),
            subscriptionsQuery.refetch(),
            creditCardsQuery.refetch(),
        ]).catch(() => undefined);
    }, [
        creditCardsQuery,
        expensesQuery,
        incomesQuery,
        subscriptionsQuery,
    ]);

    const onOpenSidebar = () => {
        navigation.dispatch(DrawerActions.openDrawer());
    };

    const onOpenEvent = React.useCallback((event: PlannerEvent) => {
        if (event.kind === 'income') {
            const income = incomesQuery.data?.incomes.find((item) => item.id === event.sourceId);
            navigation.navigate('AddIncome', income ? { income } : undefined);
            return;
        }

        if (event.kind === 'expense' && event.sourceId) {
            navigation.navigate('ExpenseDetail', { id: event.sourceId });
            return;
        }

        if (event.kind === 'subscription') {
            navigation.navigate('Subscriptions');
            return;
        }

        navigation.navigate('CreditCards');
    }, [incomesQuery.data?.incomes, navigation]);

    return (
        <View style={styles.container}>
            <HomeBackground />
            <AnimatedScreen style={styles.flex1} delay={10} duration={220} travelY={8}>
                <ScrollView
                    contentContainerStyle={[
                        styles.content,
                        {
                            paddingTop: insets.top + spacing.lg,
                            paddingBottom: insets.bottom + spacing['5xl'],
                            paddingHorizontal: horizontalPadding,
                        },
                        constrainedContentStyle,
                    ]}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefreshing}
                            onRefresh={onRefresh}
                            tintColor={colors.primary}
                            colors={[colors.primary]}
                        />
                    }
                >
                    <View style={styles.headerBlock}>
                        <View style={styles.headerRow}>
                            <TouchableOpacity
                                onPress={onOpenSidebar}
                                activeOpacity={0.78}
                                style={styles.menuButton}
                            >
                                <Icon name="menu-outline" size={21} color={colors.textPrimary} />
                            </TouchableOpacity>
                            <View style={styles.headerCopy}>
                                <Text style={[styles.headerTitle, { fontSize: scaleFont(typography.fontSize['3xl']) }]}>
                                    {t('planner.title')}
                                </Text>
                                <Text style={[styles.headerSubtitle, { fontSize: scaleFont(typography.fontSize.md) }]}>
                                    {t('planner.subtitle')}
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => navigation.navigate('AddEntry')}
                                activeOpacity={0.85}
                                style={styles.addButton}
                            >
                                <Icon name="add" size={16} color={colors.textPrimary} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View
                        style={[
                            styles.monthCard,
                            {
                                paddingHorizontal: cardPadding,
                                paddingVertical: scaleSize(spacing.base, 0.45),
                            },
                        ]}
                    >
                        <TouchableOpacity
                            style={styles.monthNavButton}
                            activeOpacity={0.82}
                            onPress={() => setSelectedMonth((prev) => shiftPlannerMonth(prev, -1))}
                        >
                            <Icon name="chevron-back" size={18} color={colors.textPrimary} />
                        </TouchableOpacity>
                        <View style={styles.monthCopy}>
                            <Text style={[styles.monthTitle, { fontSize: scaleFont(typography.fontSize.lg) }]}>
                                {monthLabel}
                            </Text>
                            <Text style={[styles.monthSubtitle, { fontSize: scaleFont(typography.fontSize.sm) }]}>
                                {monthRangeLabel}
                            </Text>
                        </View>
                        <View style={styles.monthActions}>
                            {!isCurrentMonth ? (
                                <TouchableOpacity
                                    style={styles.todayButton}
                                    activeOpacity={0.84}
                                    onPress={() => setSelectedMonth(new Date())}
                                >
                                    <Text style={[styles.todayButtonText, { fontSize: scaleFont(typography.fontSize.xs) }]}>
                                        {t('planner.todayAction')}
                                    </Text>
                                </TouchableOpacity>
                            ) : null}
                            <TouchableOpacity
                                style={styles.monthNavButton}
                                activeOpacity={0.82}
                                onPress={() => setSelectedMonth((prev) => shiftPlannerMonth(prev, 1))}
                            >
                                <Icon name="chevron-forward" size={18} color={colors.textPrimary} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View
                        style={[
                            styles.overviewCard,
                            {
                                padding: cardPadding,
                            },
                        ]}
                    >
                        <View style={styles.overviewGlow} />
                        <Text style={[styles.overviewLabel, { fontSize: scaleFont(typography.fontSize.sm) }]}>
                            {t('planner.overviewTitle')}
                        </Text>
                        <Text style={[styles.overviewMeta, { fontSize: scaleFont(typography.fontSize.sm) }]}>
                            {summaryMeta}
                        </Text>

                        <View style={styles.overviewGrid}>
                            <View style={styles.metricCard}>
                                <Text style={[styles.metricLabel, { fontSize: scaleFont(typography.fontSize.xs) }]}>
                                    {t('dashboard.incomeLabel')}
                                </Text>
                                <Text style={[styles.metricValue, styles.metricIncome, { fontSize: scaleFont(typography.fontSize.base) }]}>
                                    {formatCurrencyBreakdown(plannerData.summary.incomeBreakdown, {
                                        locale,
                                        emptyCurrency: user?.currency,
                                    })}
                                </Text>
                            </View>
                            <View style={styles.metricCard}>
                                <Text style={[styles.metricLabel, { fontSize: scaleFont(typography.fontSize.xs) }]}>
                                    {t('dashboard.expensesLabel')}
                                </Text>
                                <Text style={[styles.metricValue, styles.metricExpense, { fontSize: scaleFont(typography.fontSize.base) }]}>
                                    {formatCurrencyBreakdown(plannerData.summary.expenseBreakdown, {
                                        locale,
                                        emptyCurrency: user?.currency,
                                    })}
                                </Text>
                            </View>
                            <View style={styles.metricCard}>
                                <Text style={[styles.metricLabel, { fontSize: scaleFont(typography.fontSize.xs) }]}>
                                    {t('planner.subscriptionChargesLabel')}
                                </Text>
                                <Text style={[styles.metricValue, { fontSize: scaleFont(typography.fontSize.base) }]}>
                                    {formatCurrencyBreakdown(plannerData.summary.subscriptionBreakdown, {
                                        locale,
                                        emptyCurrency: user?.currency,
                                    })}
                                </Text>
                            </View>
                            <View style={styles.metricCard}>
                                <Text style={[styles.metricLabel, { fontSize: scaleFont(typography.fontSize.xs) }]}>
                                    {t('planner.cardRemindersLabel')}
                                </Text>
                                <Text style={[styles.metricValue, { fontSize: scaleFont(typography.fontSize.base) }]}>
                                    {plannerData.summary.reminderCount}
                                </Text>
                            </View>
                        </View>

                        {nextEventCopy ? (
                            <View style={styles.nextEventCard}>
                                <Text style={[styles.nextEventLabel, { fontSize: scaleFont(typography.fontSize.xs) }]}>
                                    {t('planner.nextEvent')}
                                </Text>
                                <Text style={[styles.nextEventTitle, { fontSize: scaleFont(typography.fontSize.base) }]}>
                                    {nextEventCopy.title}
                                </Text>
                                <Text style={[styles.nextEventSubtitle, { fontSize: scaleFont(typography.fontSize.sm) }]}>
                                    {`${nextEventCopy.subtitle} • ${formatShortDate(plannerData.summary.nextEvent!.date, locale)}`}
                                </Text>
                            </View>
                        ) : null}
                    </View>

                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { fontSize: scaleFont(typography.fontSize.lg) }]}>
                            {t('planner.agendaTitle')}
                        </Text>
                    </View>

                    {hasPartialError ? (
                        <View style={styles.inlineErrorCard}>
                            <Icon name="alert-circle-outline" size={16} color={colors.warning} />
                            <Text style={[styles.inlineErrorText, { fontSize: scaleFont(typography.fontSize.sm) }]}>
                                {t('planner.partialData')}
                            </Text>
                        </View>
                    ) : null}

                    {isLoading ? (
                        <View style={styles.emptyBlock}>
                            <Text style={[styles.loadingText, { fontSize: scaleFont(typography.fontSize.sm) }]}>
                                {t('common.loading')}
                            </Text>
                        </View>
                    ) : !plannerData.groups.length ? (
                        <View style={styles.emptyBlock}>
                            <EmptyState
                                icon="calendar-outline"
                                title={t('planner.emptyTitle')}
                                description={t('planner.emptyDescription')}
                            />
                            <Button
                                title={t('planner.addEntryCta')}
                                onPress={() => navigation.navigate('AddEntry')}
                                containerStyle={styles.emptyButton}
                            />
                        </View>
                    ) : (
                        <View style={styles.dayGroups}>
                            {plannerData.groups.map((group) => (
                                <View key={group.date} style={styles.dayCard}>
                                    <View style={styles.dayHeader}>
                                        <View style={styles.dayCopy}>
                                            <Text style={[styles.dayTitle, { fontSize: scaleFont(typography.fontSize.base) }]}>
                                                {formatDayLabel(group.date, locale)}
                                            </Text>
                                            <Text style={[styles.dayMeta, { fontSize: scaleFont(typography.fontSize.xs) }]}>
                                                {t('planner.dayCountLabel', { count: group.events.length })}
                                            </Text>
                                        </View>
                                        {group.date === todayKey && isCurrentMonth ? (
                                            <View style={styles.todayBadge}>
                                                <Text style={[styles.todayBadgeText, { fontSize: scaleFont(typography.fontSize.xs) }]}>
                                                    {t('planner.todayAction')}
                                                </Text>
                                            </View>
                                        ) : null}
                                    </View>
                                    <View style={styles.eventsList}>
                                        {group.events.map((event) => {
                                            const copy = getEventCopy(event, t);
                                            const tone = getEventTone(event, colors);
                                            const accentColor = event.accentColor || tone.color;

                                            return (
                                                <TouchableOpacity
                                                    key={event.id}
                                                    activeOpacity={0.84}
                                                    style={styles.eventRow}
                                                    onPress={() => onOpenEvent(event)}
                                                >
                                                    <View
                                                        style={[
                                                            styles.eventIconWrap,
                                                            { backgroundColor: withAlpha(accentColor, 0.14) },
                                                        ]}
                                                    >
                                                        <Icon
                                                            name={getEventIcon(event)}
                                                            size={17}
                                                            color={accentColor}
                                                        />
                                                    </View>
                                                    <View style={styles.eventCopy}>
                                                        <Text
                                                            style={[
                                                                styles.eventTitle,
                                                                { fontSize: scaleFont(typography.fontSize.base) },
                                                            ]}
                                                            numberOfLines={1}
                                                        >
                                                            {copy.title}
                                                        </Text>
                                                        <Text
                                                            style={[
                                                                styles.eventSubtitle,
                                                                { fontSize: scaleFont(typography.fontSize.sm) },
                                                            ]}
                                                            numberOfLines={2}
                                                        >
                                                            {copy.subtitle}
                                                        </Text>
                                                    </View>
                                                    {typeof event.amount === 'number' ? (
                                                        <Text
                                                            style={[
                                                                styles.eventAmount,
                                                                {
                                                                    fontSize: scaleFont(typography.fontSize.sm),
                                                                    color:
                                                                        event.kind === 'income'
                                                                            ? colors.success
                                                                            : colors.textPrimary,
                                                                },
                                                            ]}
                                                        >
                                                            {formatCurrency(event.amount, event.currency ?? user?.currency, locale)}
                                                        </Text>
                                                    ) : (
                                                        <Icon name="chevron-forward" size={16} color={colors.textMuted} />
                                                    )}
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}
                </ScrollView>
            </AnimatedScreen>
        </View>
    );
}

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.surface,
        },
        flex1: {
            flex: 1,
        },
        content: {
            gap: spacing.base,
        },
        headerBlock: {
            marginBottom: spacing.sm,
        },
        headerRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.base,
        },
        menuButton: {
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: withAlpha(colors.surfaceElevated, 0.92),
            borderWidth: 1,
            borderColor: colors.border,
        },
        headerCopy: {
            flex: 1,
        },
        headerTitle: {
            color: colors.textPrimary,
            fontWeight: typography.fontWeight.bold,
        },
        headerSubtitle: {
            color: colors.textMuted,
            marginTop: spacing.xs,
            lineHeight: 20,
        },
        addButton: {
            width: 42,
            height: 42,
            borderRadius: 21,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.primaryAction,
            borderWidth: 1,
            borderColor: withAlpha(colors.primaryAction, 0.42),
        },
        monthCard: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            backgroundColor: colors.surfaceElevated,
            borderRadius: borderRadius.xl,
            borderWidth: 1,
            borderColor: colors.border,
        },
        monthNavButton: {
            width: 38,
            height: 38,
            borderRadius: 19,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.surfaceCard,
            borderWidth: 1,
            borderColor: colors.border,
        },
        monthCopy: {
            flex: 1,
        },
        monthTitle: {
            color: colors.textPrimary,
            fontWeight: typography.fontWeight.semibold,
        },
        monthSubtitle: {
            color: colors.textMuted,
            marginTop: spacing.xs,
        },
        monthActions: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
        },
        todayButton: {
            borderRadius: borderRadius.full,
            borderWidth: 1,
            borderColor: withAlpha(colors.primaryAction, 0.35),
            paddingHorizontal: spacing.sm,
            paddingVertical: spacing.xs,
            backgroundColor: withAlpha(colors.primaryAction, 0.1),
        },
        todayButtonText: {
            color: colors.primaryAction,
            fontWeight: typography.fontWeight.semibold,
        },
        overviewCard: {
            backgroundColor: colors.surfaceCard,
            borderRadius: borderRadius.xl,
            borderWidth: 1,
            borderColor: colors.border,
            overflow: 'hidden',
            gap: spacing.base,
        },
        overviewGlow: {
            position: 'absolute',
            width: 220,
            height: 130,
            right: -78,
            top: -44,
            borderRadius: 140,
            backgroundColor: withAlpha(colors.info, 0.15),
        },
        overviewLabel: {
            color: colors.textMuted,
            textTransform: 'uppercase',
            fontWeight: typography.fontWeight.semibold,
            letterSpacing: 0.8,
        },
        overviewMeta: {
            color: colors.textSecondary,
            lineHeight: 20,
        },
        overviewGrid: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            gap: spacing.sm,
        },
        metricCard: {
            width: '48.5%',
            borderRadius: borderRadius.lg,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surfaceElevated,
            paddingHorizontal: spacing.sm,
            paddingVertical: spacing.sm,
            gap: spacing.xs,
        },
        metricLabel: {
            color: colors.textMuted,
            textTransform: 'uppercase',
            fontWeight: typography.fontWeight.medium,
            letterSpacing: 0.4,
        },
        metricValue: {
            color: colors.textPrimary,
            fontWeight: typography.fontWeight.bold,
        },
        metricIncome: {
            color: colors.success,
        },
        metricExpense: {
            color: colors.error,
        },
        nextEventCard: {
            borderRadius: borderRadius.lg,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surfaceElevated,
            paddingHorizontal: spacing.base,
            paddingVertical: spacing.base,
            gap: spacing.xs,
        },
        nextEventLabel: {
            color: colors.textMuted,
            textTransform: 'uppercase',
            letterSpacing: 0.4,
            fontWeight: typography.fontWeight.medium,
        },
        nextEventTitle: {
            color: colors.textPrimary,
            fontWeight: typography.fontWeight.semibold,
        },
        nextEventSubtitle: {
            color: colors.textMuted,
            lineHeight: 20,
        },
        sectionHeader: {
            marginTop: spacing.xs,
        },
        sectionTitle: {
            color: colors.textPrimary,
            fontWeight: typography.fontWeight.bold,
        },
        inlineErrorCard: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            borderRadius: borderRadius.lg,
            borderWidth: 1,
            borderColor: withAlpha(colors.warning, 0.32),
            backgroundColor: withAlpha(colors.warning, 0.12),
            paddingHorizontal: spacing.base,
            paddingVertical: spacing.sm,
        },
        inlineErrorText: {
            flex: 1,
            color: colors.textSecondary,
            lineHeight: 19,
        },
        emptyBlock: {
            borderRadius: borderRadius.xl,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surfaceElevated,
            paddingHorizontal: spacing.base,
            paddingVertical: spacing['2xl'],
        },
        emptyButton: {
            marginTop: spacing.base,
        },
        loadingText: {
            textAlign: 'center',
            color: colors.textMuted,
        },
        dayGroups: {
            gap: spacing.base,
        },
        dayCard: {
            borderRadius: borderRadius.xl,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surfaceElevated,
            paddingHorizontal: spacing.base,
            paddingVertical: spacing.base,
            gap: spacing.base,
        },
        dayHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: spacing.sm,
        },
        dayCopy: {
            flex: 1,
        },
        dayTitle: {
            color: colors.textPrimary,
            fontWeight: typography.fontWeight.semibold,
        },
        dayMeta: {
            color: colors.textMuted,
            marginTop: spacing.xs,
        },
        todayBadge: {
            borderRadius: borderRadius.full,
            backgroundColor: withAlpha(colors.primaryAction, 0.12),
            borderWidth: 1,
            borderColor: withAlpha(colors.primaryAction, 0.28),
            paddingHorizontal: spacing.sm,
            paddingVertical: spacing.xs,
        },
        todayBadgeText: {
            color: colors.primaryAction,
            fontWeight: typography.fontWeight.semibold,
        },
        eventsList: {
            gap: spacing.sm,
        },
        eventRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.base,
            borderRadius: borderRadius.lg,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surfaceCard,
            paddingHorizontal: spacing.sm,
            paddingVertical: spacing.sm,
        },
        eventIconWrap: {
            width: 42,
            height: 42,
            borderRadius: 21,
            alignItems: 'center',
            justifyContent: 'center',
        },
        eventCopy: {
            flex: 1,
            gap: 3,
        },
        eventTitle: {
            color: colors.textPrimary,
            fontWeight: typography.fontWeight.semibold,
        },
        eventSubtitle: {
            color: colors.textMuted,
            lineHeight: 18,
        },
        eventAmount: {
            fontWeight: typography.fontWeight.bold,
            textAlign: 'right',
        },
    });
