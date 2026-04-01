import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { MainTabScreenProps } from '../../navigation/types';
import { useAuthStore } from '../../store/authStore';
import { formatCurrency } from '../../utils/format';
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
        scaleFont,
        scaleSize,
    } = useResponsive();
    const { t, language } = useI18n();
    const {
        dailyTotals,
        categories,
        weeklySummary,
        isLoading,
        showSkeleton,
        refetchAll,
        maxDaily,
        weeklyBudgetAmount,
        weeklyPeriodLabel,
        weeklyPeriodRange,
    } = useAnalytics();
    const bottomPadding = getMainTabListBottomPadding({
        insetsBottom: insets.bottom,
        isSmallPhone,
        scaleSize,
    });
    const weeklyTotal = weeklySummary?.totalSpent ?? 0;
    const weeklyAverage = weeklySummary?.dailyAverage ?? 0;
    const progress =
        weeklyBudgetAmount > 0 ? Math.min(weeklyTotal / weeklyBudgetAmount, 1) : 0;
    const formattedDate = new Date().toLocaleDateString(
        language === 'es' ? 'es-ES' : 'en-US',
        { month: 'short', day: 'numeric' },
    );
    const dateLabel = t('analytics.dateLabel', { date: formattedDate });
    const maxLabel = formatCurrency(maxDaily, user?.currency);
    const midLabel = formatCurrency(maxDaily / 2, user?.currency);
    const dailyTrendTitle = t('analytics.dailyTrendTitle');
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
                    <View style={styles.datePill}>
                        <Icon name="calendar-outline" size={14} color={colors.textMuted} />
                        <Text style={[styles.dateText, { fontSize: scaleFont(typography.fontSize.xs) }]}>
                            {dateLabel}
                        </Text>
                    </View>
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
                            <View
                                style={[
                                    styles.glassCard,
                                    {
                                        padding: isSmallPhone
                                            ? scaleSize(spacing.lg, 0.5)
                                            : scaleSize(spacing.xl, 0.5),
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

                            <View
                                style={[
                                    styles.glassCard,
                                    {
                                        padding: isSmallPhone
                                            ? scaleSize(spacing.lg, 0.5)
                                            : scaleSize(spacing.xl, 0.5),
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
                                                                    {
                                                                        height: Math.max(barHeight, 6),
                                                                        width: isSmallPhone ? 16 : 20,
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

                            <View
                                style={[
                                    styles.glassCard,
                                    {
                                        padding: isSmallPhone
                                            ? scaleSize(spacing.lg, 0.5)
                                            : scaleSize(spacing.xl, 0.5),
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
