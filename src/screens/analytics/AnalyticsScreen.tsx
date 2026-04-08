import React from 'react';
import {
    Platform,
    TouchableOpacity,
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
} from 'react-native';
import DateTimePicker, {
    DateTimePickerAndroid,
    DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { MainTabScreenProps } from '../../navigation/types';
import { useAuthStore } from '../../store/authStore';
import { formatCurrency, formatDate, todayISO } from '../../utils/format';
import {
    spacing,
    typography,
    borderRadius,
    useResponsive,
    useTheme,
    useThemedStyles,
} from '../../theme';
import { CategoryIcon } from '../../components/CategoryIcon';
import { EmptyState } from '../../components/ui/EmptyState';
import { AnimatedScreen } from '../../components/ui/AnimatedScreen';
import { AnalyticsSkeleton } from '../../components/ui/Skeleton';
import { useI18n } from '../../hooks/useI18n';
import { useAnalytics } from '../../hooks/useAnalytics';
import { HomeBackground } from '../../components/ui/HomeBackground';
import { getMainTabListBottomPadding } from '../../navigation/mainTabLayout';
import { withAlpha } from '../../utils/subscriptions';

function parsePickerDate(value?: string) {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const [year, month, day] = value.split('-').map(Number);
        return new Date(year, month - 1, day, 12, 0, 0, 0);
    }

    return new Date();
}

function formatInsightRange(
    start: string,
    end: string,
    language: 'en' | 'es',
) {
    const locale = language === 'es' ? 'es-ES' : 'en-US';
    const startLabel = new Date(`${start}T12:00:00`).toLocaleDateString(locale, {
        month: 'short',
        day: 'numeric',
    });
    const endLabel = new Date(`${end}T12:00:00`).toLocaleDateString(locale, {
        month: 'short',
        day: 'numeric',
    });

    return `${startLabel} - ${endLabel}`;
}

function getReadableIconColor(backgroundColor: string): string {
    const normalized = backgroundColor.replace('#', '').trim();
    if (!/^[\da-fA-F]{3}$|^[\da-fA-F]{6}$/.test(normalized)) {
        return '#0F172A';
    }

    const full = normalized.length === 3
        ? normalized.split('').map((char) => `${char}${char}`).join('')
        : normalized;
    const r = Number.parseInt(full.slice(0, 2), 16);
    const g = Number.parseInt(full.slice(2, 4), 16);
    const b = Number.parseInt(full.slice(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    return luminance > 0.62 ? '#0F172A' : '#FFFFFF';
}

export function AnalyticsScreen(_props: MainTabScreenProps<'Analytics'>) {
    const { colors } = useTheme();
    const fallbackColors = [colors.success, colors.accent, colors.info, colors.warning];
    const styles = useThemedStyles(createStyles);
    const user = useAuthStore((s) => s.user);
    const insets = useSafeAreaInsets();
    const {
        horizontalPadding,
        contentMaxWidth,
        isSmallPhone,
        isTablet,
        scaleFont,
        scaleSize,
    } = useResponsive();
    const { t, tPlural, language } = useI18n();
    const [selectedDailyDate, setSelectedDailyDate] = React.useState(todayISO());
    const [showDatePicker, setShowDatePicker] = React.useState(false);
    const [savingsHorizonMonths, setSavingsHorizonMonths] = React.useState(6);
    const {
        dailyTotals,
        categories,
        insights,
        weeklySummary,
        isLoading,
        showSkeleton,
        refetchAll,
        maxDaily,
        weeklyBudgetAmount,
        weeklyPeriodLabel,
        weeklyPeriodRange,
    } = useAnalytics(selectedDailyDate, savingsHorizonMonths);
    const bottomPadding = getMainTabListBottomPadding({
        insetsBottom: insets.bottom,
        isSmallPhone,
        isTablet,
        scaleSize,
        extraSpacing: isTablet ? spacing.xl : spacing.base,
    });
    const weeklyTotal = weeklySummary?.totalSpent ?? 0;
    const weeklyAverage = weeklySummary?.dailyAverage ?? 0;
    const progress =
        weeklyBudgetAmount > 0 ? Math.min(weeklyTotal / weeklyBudgetAmount, 1) : 0;
    const selectedDailyDateValue = React.useMemo(
        () => parsePickerDate(selectedDailyDate),
        [selectedDailyDate],
    );
    const formattedDate = selectedDailyDateValue.toLocaleDateString(
        language === 'es' ? 'es-ES' : 'en-US',
        { month: 'short', day: 'numeric' },
    );
    const dateLabel = t('analytics.dateLabel', { date: formattedDate });
    const maxLabel = formatCurrency(maxDaily, user?.currency);
    const midLabel = formatCurrency(maxDaily / 2, user?.currency);
    const dailyTrendTitle = t('analytics.dailyTrendTitle');
    const cardPadding = isSmallPhone
        ? scaleSize(spacing.lg, 0.5)
        : scaleSize(spacing.xl, 0.5);
    const donutSize = isSmallPhone ? 118 : 140;
    const donutHole = isSmallPhone ? 78 : 96;
    const donutThickness = isSmallPhone ? 10 : 12;
    const sourceCategories = (categories ?? []).slice(0, 4);
    const donutSegments = sourceCategories.length
        ? sourceCategories.map((cat, index) => ({
            color: cat.color || fallbackColors[index % fallbackColors.length],
        }))
        : fallbackColors.map((color) => ({ color }));
    const sortedCategories = (categories ?? []).slice().sort((a, b) => b.total - a.total);
    const constrainedContentStyle = contentMaxWidth
        ? { maxWidth: contentMaxWidth, alignSelf: 'center' as const, width: '100%' as const }
        : null;
    const onChangeSelectedDate = React.useCallback(
        (event: DateTimePickerEvent, value?: Date) => {
            if (Platform.OS === 'android' && event.type !== 'set') {
                return;
            }

            if (!value) {
                return;
            }

            const maxDate = new Date();
            maxDate.setHours(23, 59, 59, 999);
            const nextDate = value.getTime() > maxDate.getTime() ? maxDate : value;
            setSelectedDailyDate(formatDate(nextDate, 'YYYY-MM-DD'));
        },
        [],
    );
    const onOpenDatePicker = React.useCallback(() => {
        if (Platform.OS === 'android') {
            DateTimePickerAndroid.open({
                mode: 'date',
                value: selectedDailyDateValue,
                maximumDate: new Date(),
                onChange: onChangeSelectedDate,
            });
            return;
        }

        setShowDatePicker((prev) => !prev);
    }, [onChangeSelectedDate, selectedDailyDateValue]);
    const getChangeSummary = React.useCallback((changeAmount: number, changePercent: number | null) => {
        if (Math.abs(changeAmount) < 0.005) {
            return {
                label: t('analytics.sameAsPrevious'),
                color: colors.textMuted,
                backgroundColor: withAlpha(colors.textMuted, 0.12),
            };
        }

        const amountLabel = formatCurrency(Math.abs(changeAmount), user?.currency);
        const percentLabel = changePercent !== null ? ` (${Math.abs(changePercent).toFixed(1)}%)` : '';
        if (changeAmount > 0) {
            return {
                label: t('analytics.moreThanPrevious', {
                    amount: `${amountLabel}${percentLabel}`,
                }),
                color: colors.error,
                backgroundColor: withAlpha(colors.error, 0.12),
            };
        }

        return {
            label: t('analytics.lessThanPrevious', {
                amount: `${amountLabel}${percentLabel}`,
            }),
            color: colors.success,
            backgroundColor: withAlpha(colors.success, 0.12),
        };
    }, [colors.error, colors.success, colors.textMuted, t, user?.currency]);
    const renderSpendMetric = React.useCallback((params: {
        title: string;
        total: number;
        start: string;
        end: string;
        changeAmount: number;
        changePercent: number | null;
    }) => {
        const changeSummary = getChangeSummary(params.changeAmount, params.changePercent);
        const rangeLabel = formatInsightRange(params.start, params.end, language);

        return (
            <View style={styles.insightMetricCard}>
                <Text style={[styles.insightMetricLabel, { fontSize: scaleFont(typography.fontSize.xs) }]}>
                    {params.title}
                </Text>
                <Text style={[styles.insightMetricAmount, { fontSize: scaleFont(typography.fontSize.xl) }]}>
                    {formatCurrency(params.total, user?.currency)}
                </Text>
                <Text style={[styles.insightMetricRange, { fontSize: scaleFont(typography.fontSize.xs) }]}>
                    {rangeLabel}
                </Text>
                <View style={[styles.insightChangePill, { backgroundColor: changeSummary.backgroundColor }]}>
                    <Text
                        style={[
                            styles.insightChangeText,
                            {
                                fontSize: scaleFont(typography.fontSize.xs),
                                color: changeSummary.color,
                            },
                        ]}
                    >
                        {changeSummary.label}
                    </Text>
                </View>
            </View>
        );
    }, [getChangeSummary, language, scaleFont, styles.insightChangePill, styles.insightChangeText, styles.insightMetricAmount, styles.insightMetricCard, styles.insightMetricLabel, styles.insightMetricRange, user?.currency]);
    const weeklySummaryCard = (
        <View
            style={[
                styles.glassCard,
                {
                    padding: cardPadding,
                },
            ]}
        >
            <Text style={[styles.eyebrow, { fontSize: scaleFont(typography.fontSize.xs) }]}>
                {t('analytics.thisWeek')}
            </Text>
            <Text
                style={[
                    styles.heroAmount,
                    { fontSize: scaleFont(typography.fontSize['4xl']) },
                ]}
            >
                {formatCurrency(weeklyTotal, user?.currency)}
            </Text>
            {!!weeklyPeriodLabel && (
                <Text
                    style={[
                        styles.periodMeta,
                        { fontSize: scaleFont(typography.fontSize.xs) },
                    ]}
                >
                    {weeklyPeriodLabel}
                    {weeklyPeriodRange ? ` • ${weeklyPeriodRange}` : ''}
                </Text>
            )}
            <View style={styles.progressLabels}>
                <Text style={[styles.progressText, { fontSize: scaleFont(typography.fontSize.xs) }]}>
                    {`${t('analytics.budget')} (${formatCurrency(weeklyBudgetAmount, user?.currency)})`}
                </Text>
                <Text style={[styles.progressText, { fontSize: scaleFont(typography.fontSize.xs) }]}>
                    {`${t('analytics.expenses')} (${formatCurrency(weeklyTotal, user?.currency)})`}
                </Text>
            </View>
            <View style={styles.progressTrack}>
                <View
                    style={[
                        styles.progressFill,
                        { width: `${progress * 100}%`, backgroundColor: colors.success },
                    ]}
                />
            </View>
            <Text style={[styles.miniText, { fontSize: scaleFont(typography.fontSize.xs) }]}>
                {t('analytics.dailyAvg')}: {formatCurrency(weeklyAverage, user?.currency)}
            </Text>
        </View>
    );
    const spendingSignalsCard = insights ? (
        <View
            style={[
                styles.glassCard,
                {
                    padding: cardPadding,
                },
            ]}
        >
            <Text style={[styles.cardTitle, { fontSize: scaleFont(typography.fontSize.base) }]}>
                {t('analytics.spendingSignals')}
            </Text>
            <View style={styles.insightGrid}>
                {renderSpendMetric({
                    title: t('analytics.weekToDate'),
                    total: insights.weeklySpend.totalSpent,
                    start: insights.weeklySpend.start,
                    end: insights.weeklySpend.end,
                    changeAmount: insights.weeklySpend.changeAmount,
                    changePercent: insights.weeklySpend.changePercent,
                })}
                {renderSpendMetric({
                    title: t('analytics.monthToDate'),
                    total: insights.monthlySpend.totalSpent,
                    start: insights.monthlySpend.start,
                    end: insights.monthlySpend.end,
                    changeAmount: insights.monthlySpend.changeAmount,
                    changePercent: insights.monthlySpend.changePercent,
                })}
            </View>
            <Text style={[styles.insightFootnote, { fontSize: scaleFont(typography.fontSize.sm) }]}>
                {t('analytics.projectedMonthEnd', {
                    amount: formatCurrency(insights.monthlySpend.projectedTotal, user?.currency),
                })}
            </Text>
            <View style={styles.topCategoryRow}>
                <View
                    style={[
                        styles.topCategoryIcon,
                        {
                            backgroundColor: insights.topCategory?.color
                                ? withAlpha(insights.topCategory.color, 0.18)
                                : withAlpha(colors.primaryLight, 0.18),
                        },
                    ]}
                >
                    <CategoryIcon
                        icon={insights.topCategory?.icon}
                        categoryName={insights.topCategory?.name ?? 'Other'}
                        size={16}
                        color={getReadableIconColor(insights.topCategory?.color || colors.primaryLight)}
                    />
                </View>
                <Text style={[styles.insightFootnote, { fontSize: scaleFont(typography.fontSize.sm) }]}>
                    {insights.topCategory
                        ? t('analytics.topCategoryImpact', {
                            name: insights.topCategory.name,
                            percent: Math.round(insights.topCategory.percentage),
                        })
                        : t('analytics.noCategoryImpact')}
                </Text>
            </View>
        </View>
    ) : null;
    const subscriptionSavingsCard = insights ? (
        <View
            style={[
                styles.glassCard,
                {
                    padding: cardPadding,
                },
            ]}
        >
            <Text style={[styles.cardTitle, { fontSize: scaleFont(typography.fontSize.base) }]}>
                {t('analytics.subscriptionSavingsTitle')}
            </Text>
            <View style={styles.horizonRow}>
                {[3, 6, 12].map((months) => {
                    const isActive = savingsHorizonMonths === months;
                    return (
                        <TouchableOpacity
                            key={months}
                            activeOpacity={0.84}
                            onPress={() => setSavingsHorizonMonths(months)}
                            style={[
                                styles.horizonChip,
                                isActive ? styles.horizonChipActive : null,
                            ]}
                        >
                            <Text
                                style={[
                                    styles.horizonChipText,
                                    isActive ? styles.horizonChipTextActive : null,
                                    { fontSize: scaleFont(typography.fontSize.xs) },
                                ]}
                            >
                                {months}M
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
            <Text
                style={[
                    styles.heroAmount,
                    { fontSize: scaleFont(typography.fontSize['4xl']) },
                ]}
            >
                {formatCurrency(insights.subscriptionSavings.projectedSavings, user?.currency)}
            </Text>
            <Text style={[styles.insightFootnote, { fontSize: scaleFont(typography.fontSize.sm) }]}>
                {t('analytics.saveByCancelling', {
                    amount: formatCurrency(
                        insights.subscriptionSavings.projectedSavings,
                        user?.currency,
                    ),
                    months: savingsHorizonMonths,
                })}
            </Text>
            <Text style={[styles.insightMetricRange, { fontSize: scaleFont(typography.fontSize.xs) }]}>
                {tPlural('analytics.activeSubscriptionsMeta', insights.subscriptionSavings.activeSubscriptions, {
                    amount: formatCurrency(
                        insights.subscriptionSavings.monthlyRecurringSpend,
                        user?.currency,
                    ),
                })}
            </Text>
            {insights.subscriptionSavings.topSubscriptions.length > 0 ? (
                <View style={styles.subscriptionOpportunityList}>
                    <Text
                        style={[
                            styles.cardTitle,
                            styles.subsectionTitle,
                            { fontSize: scaleFont(typography.fontSize.sm) },
                        ]}
                    >
                        {t('analytics.topSubscriptions')}
                    </Text>
                    {insights.subscriptionSavings.topSubscriptions.map((subscription) => (
                        <View key={subscription.id} style={styles.subscriptionOpportunityRow}>
                            <View style={styles.subscriptionOpportunityInfo}>
                                <Text
                                    style={[
                                        styles.categoryName,
                                        { fontSize: scaleFont(typography.fontSize.sm) },
                                    ]}
                                    numberOfLines={1}
                                >
                                    {subscription.name}
                                </Text>
                                <Text
                                    style={[
                                        styles.subscriptionOpportunityMeta,
                                        { fontSize: scaleFont(typography.fontSize.xs) },
                                    ]}
                                >
                                    {formatCurrency(
                                        subscription.monthlyEquivalent,
                                        subscription.currency || user?.currency,
                                    )}
                                    {language === 'es' ? '/mes' : '/mo'}
                                </Text>
                            </View>
                            <Text
                                style={[
                                    styles.subscriptionOpportunitySavings,
                                    { fontSize: scaleFont(typography.fontSize.xs) },
                                ]}
                            >
                                {t('analytics.saveInMonths', {
                                    amount: formatCurrency(
                                        subscription.projectedSavings,
                                        subscription.currency || user?.currency,
                                    ),
                                    months: savingsHorizonMonths,
                                })}
                            </Text>
                        </View>
                    ))}
                </View>
            ) : (
                <Text style={[styles.insightFootnote, { fontSize: scaleFont(typography.fontSize.sm) }]}>
                    {t('analytics.noSubscriptionsToOptimize')}
                </Text>
            )}
        </View>
    ) : null;
    const dailyTrendCard = (
        <View
            style={[
                styles.glassCard,
                {
                    padding: cardPadding,
                },
            ]}
        >
            <Text style={[styles.cardTitle, { fontSize: scaleFont(typography.fontSize.base) }]}>
                {dailyTrendTitle}
            </Text>
            <View style={styles.trendChart}>
                <View style={styles.axisColumn}>
                    <Text style={[styles.axisLabel, { fontSize: scaleFont(10) }]}>{maxLabel}</Text>
                    <Text style={[styles.axisLabel, { fontSize: scaleFont(10) }]}>{midLabel}</Text>
                    <Text style={[styles.axisLabel, { fontSize: scaleFont(10) }]}>
                        {formatCurrency(0, user?.currency)}
                    </Text>
                </View>
                <View style={styles.chartArea}>
                    {dailyTotals && dailyTotals.length > 0 ? (
                        <View style={styles.barChart}>
                            {dailyTotals.map((day, i) => {
                                const barHeight = maxDaily > 0 ? (day.total / maxDaily) * 120 : 0;
                                const dayLabel = new Date(day.date + 'T12:00:00').toLocaleDateString(
                                    language === 'es' ? 'es-ES' : 'en',
                                    {
                                        weekday: 'short',
                                    },
                                );
                                const isToday = i === (dailyTotals?.length ?? 0) - 1;
                                return (
                                    <View key={day.date} style={styles.barColumn}>
                                        <View
                                            style={[
                                                styles.bar,
                                                isSmallPhone ? styles.barSmall : styles.barRegular,
                                                {
                                                    height: Math.max(barHeight, 6),
                                                    backgroundColor: isToday
                                                        ? colors.success
                                                        : withAlpha(colors.primaryLight, 0.4),
                                                },
                                            ]}
                                        />
                                        <Text style={[styles.barLabel, { fontSize: scaleFont(10) }]}>
                                            {dayLabel}
                                        </Text>
                                    </View>
                                );
                            })}
                        </View>
                    ) : (
                        <EmptyState
                            icon="bar-chart-outline"
                            title={t('analytics.noDailyDataTitle')}
                            description={t('analytics.noDailyDataDesc')}
                        />
                    )}
                </View>
            </View>
        </View>
    );
    const categoryCard = (
        <View
            style={[
                styles.glassCard,
                {
                    padding: cardPadding,
                },
            ]}
        >
            <Text style={[styles.cardTitle, { fontSize: scaleFont(typography.fontSize.base) }]}>
                {t('analytics.byCategory')}
            </Text>
            <View style={styles.categoryWrap}>
                <View
                    style={[
                        styles.donut,
                        {
                            width: donutSize,
                            height: donutSize,
                            borderRadius: donutSize / 2,
                        },
                    ]}
                >
                    {donutSegments.map((segment, index) => (
                        <View
                            key={`${segment.color}-${index}`}
                            style={[
                                styles.donutSegment,
                                {
                                    borderTopColor: segment.color,
                                    borderWidth: donutThickness,
                                    width: donutSize,
                                    height: donutSize,
                                    borderRadius: donutSize / 2,
                                    transform: [{ rotate: `${index * 90}deg` }],
                                },
                            ]}
                        />
                    ))}
                    <View
                        style={[
                            styles.donutHole,
                            {
                                width: donutHole,
                                height: donutHole,
                                borderRadius: donutHole / 2,
                            },
                        ]}
                    />
                </View>
                <View style={styles.categoryList}>
                    {sortedCategories.map((cat) => (
                        <View key={cat.name} style={styles.categoryRow}>
                            <View style={styles.categoryLeft}>
                                <View
                                    style={[
                                        styles.categoryIcon,
                                        { backgroundColor: cat.color || colors.primaryLight },
                                    ]}
                                >
                                    <CategoryIcon
                                        icon={cat.icon}
                                        categoryName={cat.name}
                                        size={14}
                                        color={getReadableIconColor(cat.color || colors.primaryLight)}
                                    />
                                </View>
                                <View>
                                    <Text
                                        style={[
                                            styles.categoryName,
                                            { fontSize: scaleFont(typography.fontSize.base) },
                                        ]}
                                    >
                                        {cat.name}
                                    </Text>
                                    <Text
                                        style={[
                                            styles.categoryAmount,
                                            { fontSize: scaleFont(typography.fontSize.xs) },
                                        ]}
                                    >
                                        {formatCurrency(cat.total, user?.currency)}
                                    </Text>
                                </View>
                            </View>
                            <Text style={[styles.categoryPercent, { fontSize: scaleFont(typography.fontSize.sm) }]}>
                                {Math.round(cat.percentage)}%
                            </Text>
                        </View>
                    ))}
                    {sortedCategories.length === 0 && (
                        <EmptyState
                            icon="pie-chart-outline"
                            title={t('analytics.noCategoryDataTitle')}
                            description={t('analytics.noCategoryDataDesc')}
                        />
                    )}
                </View>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <HomeBackground />
            <AnimatedScreen style={styles.flex1} delay={8} duration={200} travelY={6}>
                <View
                    style={[
                        styles.header,
                        { paddingTop: insets.top + spacing.base, paddingHorizontal: horizontalPadding },
                        constrainedContentStyle,
                    ]}
                >
                    <Text style={[styles.headerTitle, { fontSize: scaleFont(typography.fontSize['3xl']) }]}>
                        {t('analytics.title')}
                    </Text>
                    <Text style={[styles.headerSubtitle, { fontSize: scaleFont(typography.fontSize.md) }]}>
                        {t('analytics.subtitle')}
                    </Text>
                    <TouchableOpacity
                        activeOpacity={0.84}
                        style={styles.datePill}
                        onPress={onOpenDatePicker}
                    >
                        <Icon name="calendar-outline" size={14} color={colors.textMuted} />
                        <Text style={[styles.dateText, { fontSize: scaleFont(typography.fontSize.xs) }]}>
                            {dateLabel}
                        </Text>
                    </TouchableOpacity>
                    {Platform.OS === 'ios' && showDatePicker ? (
                        <View style={styles.iosDatePickerCard}>
                            <DateTimePicker
                                mode="date"
                                display="spinner"
                                value={selectedDailyDateValue}
                                maximumDate={new Date()}
                                onChange={onChangeSelectedDate}
                            />
                        </View>
                    ) : null}
                </View>

                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={[
                        styles.content,
                        {
                            paddingBottom: bottomPadding,
                            paddingHorizontal: horizontalPadding,
                        },
                        constrainedContentStyle,
                    ]}
                    refreshControl={
                        <RefreshControl
                            refreshing={isLoading}
                            onRefresh={refetchAll}
                            tintColor={colors.primary}
                        />
                    }
                >
                    {showSkeleton ? (
                        <AnalyticsSkeleton horizontalPadding={0} />
                    ) : (
                        <>
                            {weeklySummaryCard}
                            {spendingSignalsCard}
                            {subscriptionSavingsCard}
                            {dailyTrendCard}
                            {categoryCard}
                        </>
                    )}
                </ScrollView>
            </AnimatedScreen>
        </View>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    flex1: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        paddingBottom: spacing['5xl'],
    },
    header: {
        marginBottom: spacing.lg,
    },
    headerTitle: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.bold,
    },
    headerSubtitle: {
        color: colors.textMuted,
        marginTop: spacing.xs,
    },
    datePill: {
        marginTop: spacing.md,
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.md,
        paddingVertical: 6,
        borderRadius: borderRadius.full,
        backgroundColor: colors.surfaceElevated,
        borderWidth: 1,
        borderColor: colors.border,
    },
    dateText: {
        color: colors.textMuted,
        fontWeight: typography.fontWeight.semibold,
    },
    glassCard: {
        backgroundColor: colors.surfaceCard,
        borderRadius: borderRadius.xl,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: spacing.lg,
    },
    eyebrow: {
        color: colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    heroAmount: {
        fontWeight: typography.fontWeight.bold,
        color: colors.textPrimary,
        marginTop: spacing.xs,
    },
    cardTitle: {
        fontSize: typography.fontSize.base,
        fontWeight: typography.fontWeight.semibold,
        color: colors.textSecondary,
        marginBottom: spacing.md,
    },
    insightGrid: {
        gap: spacing.md,
    },
    insightMetricCard: {
        backgroundColor: colors.surfaceElevated,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.md,
    },
    insightMetricLabel: {
        color: colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    insightMetricAmount: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.bold,
        marginTop: spacing.xs,
    },
    insightMetricRange: {
        color: colors.textMuted,
        marginTop: spacing.xs,
    },
    insightChangePill: {
        marginTop: spacing.sm,
        alignSelf: 'flex-start',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.full,
    },
    insightChangeText: {
        fontWeight: typography.fontWeight.semibold,
    },
    insightFootnote: {
        color: colors.textSecondary,
        marginTop: spacing.md,
    },
    topCategoryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginTop: spacing.sm,
    },
    topCategoryIcon: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
    },
    horizonRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginBottom: spacing.sm,
    },
    horizonChip: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs + 2,
        borderRadius: borderRadius.full,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surfaceElevated,
    },
    horizonChipActive: {
        backgroundColor: colors.primaryAction,
        borderColor: colors.primaryAction,
    },
    horizonChipText: {
        color: colors.textSecondary,
        fontWeight: typography.fontWeight.semibold,
    },
    horizonChipTextActive: {
        color: '#FFFFFF',
    },
    subsectionTitle: {
        marginTop: spacing.lg,
        marginBottom: spacing.sm,
    },
    subscriptionOpportunityList: {
        marginTop: spacing.sm,
    },
    subscriptionOpportunityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.sm,
        paddingVertical: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    subscriptionOpportunityInfo: {
        flex: 1,
    },
    subscriptionOpportunityMeta: {
        color: colors.textMuted,
        marginTop: 2,
    },
    subscriptionOpportunitySavings: {
        color: colors.success,
        fontWeight: typography.fontWeight.semibold,
        textAlign: 'right',
        flexShrink: 1,
    },
    iosDatePickerCard: {
        marginTop: spacing.md,
        borderRadius: borderRadius.lg,
        backgroundColor: colors.surfaceElevated,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
    },
    periodMeta: {
        fontSize: typography.fontSize.xs,
        color: colors.textMuted,
        marginTop: -spacing.xs,
        marginBottom: spacing.sm,
    },
    progressLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: spacing.md,
    },
    progressText: {
        color: colors.textMuted,
    },
    progressTrack: {
        height: 10,
        borderRadius: 999,
        backgroundColor: withAlpha(colors.primaryAction, 0.12),
        overflow: 'hidden',
        marginTop: spacing.sm,
    },
    progressFill: {
        height: '100%',
        borderRadius: 999,
    },
    miniText: {
        color: colors.textMuted,
        marginTop: spacing.sm,
    },
    trendChart: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginTop: spacing.sm,
        backgroundColor: colors.surfaceElevated,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    axisColumn: {
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    axisLabel: {
        color: colors.textMuted,
    },
    chartArea: {
        flex: 1,
    },
    barChart: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        height: 160,
        paddingTop: spacing.lg,
    },
    barColumn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-end',
    },
    bar: {
        borderRadius: borderRadius.sm,
        minHeight: 4,
    },
    barSmall: {
        width: 16,
    },
    barRegular: {
        width: 20,
    },
    barLabel: {
        color: colors.textMuted,
        marginTop: 6,
        fontWeight: typography.fontWeight.medium,
    },
    categoryWrap: {
        flexDirection: 'row',
        gap: spacing.lg,
        alignItems: 'center',
    },
    donut: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    donutSegment: {
        position: 'absolute',
        borderColor: 'transparent',
    },
    donutHole: {
        backgroundColor: colors.surface,
    },
    categoryList: {
        flex: 1,
        gap: spacing.md,
    },
    categoryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    categoryLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        flex: 1,
    },
    categoryIcon: {
        width: 26,
        height: 26,
        borderRadius: 13,
        alignItems: 'center',
        justifyContent: 'center',
    },
    categoryName: {
        fontWeight: typography.fontWeight.semibold,
        color: colors.textPrimary,
    },
    categoryAmount: {
        color: colors.textMuted,
        marginTop: 2,
    },
    categoryPercent: {
        color: colors.textMuted,
        fontWeight: typography.fontWeight.semibold,
    },
});
