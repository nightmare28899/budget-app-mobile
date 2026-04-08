import React from 'react';
import {
  Platform,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker, {
  DateTimePickerAndroid,
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { AnalyticsSkeleton } from '../../components/ui/Skeleton';
import { AnimatedScreen } from '../../components/ui/AnimatedScreen';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { HomeBackground } from '../../components/ui/HomeBackground';
import { ScreenBackButton } from '../../components/ui/ScreenBackButton';
import { useAppAlert } from '../../components/alerts/AlertProvider';
import { reportsApi } from '../../api/reports';
import { useAppAccess } from '../../hooks/useAppAccess';
import { useI18n } from '../../hooks/useI18n';
import { MainDrawerScreenProps } from '../../navigation/types';
import {
  borderRadius,
  spacing,
  typography,
  useResponsive,
  useTheme,
  useThemedStyles,
} from '../../theme';
import {
  ReportHistoryItem,
  ReportPeriodType,
  ReportSnapshot,
} from '../../types';
import { getCurrencyLocale } from '../../utils/currency';
import { formatCurrency, formatDate, todayISO } from '../../utils/format';
import { withAlpha } from '../../utils/subscriptions';
import { useAuthStore } from '../../store/authStore';

function parsePickerDate(value?: string) {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day, 12, 0, 0, 0);
  }

  return new Date();
}

function formatRangeLabel(
  start: string,
  end: string,
  locale: 'es-MX' | 'en-US',
) {
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

function buildShareMessage(
  report: ReportSnapshot,
  currency: string | undefined,
  t: ReturnType<typeof useI18n>['t'],
  locale: 'es-MX' | 'en-US',
) {
  const lines = [
    `${t('reports.title')} • ${report.report.label}`,
    formatRangeLabel(report.report.start, report.report.end, locale),
    `${t('reports.summaryIncome')}: ${formatCurrency(
      report.summary.totalIncome,
      currency,
    )}`,
    `${t('reports.summarySpent')}: ${formatCurrency(
      report.summary.totalSpent,
      currency,
    )}`,
    `${t('reports.summaryNet')}: ${formatCurrency(
      report.summary.net,
      currency,
    )}`,
    `${t('reports.safeMoveTitle')}: ${formatCurrency(
      report.highlights.suggestedSavingsMove,
      currency,
    )}`,
    `${t('reports.subscriptionProjectedSavings')}: ${formatCurrency(
      report.insights.subscriptionSavings.projectedSavings,
      currency,
    )}`,
  ];

  if (report.insights.topCategory) {
    lines.push(
      `${t('reports.topCategoryTitle')}: ${
        report.insights.topCategory.name
      } (${formatCurrency(report.insights.topCategory.total, currency)})`,
    );
  }

  if (report.savings.nextGoal) {
    lines.push(
      `${t('reports.nextGoalTitle')}: ${
        report.savings.nextGoal.title
      } (${formatCurrency(
        report.savings.nextGoal.currentAmount,
        currency,
      )}/${formatCurrency(report.savings.nextGoal.targetAmount, currency)})`,
    );
  }

  return lines.join('\n');
}

type MetricCardProps = {
  label: string;
  value: string;
  meta?: string;
};

function MetricCard({ label, value, meta }: MetricCardProps) {
  const styles = useThemedStyles(createStyles);
  const { scaleFont } = useResponsive();

  return (
    <View style={styles.metricCard}>
      <Text
        style={[
          styles.metricLabel,
          { fontSize: scaleFont(typography.fontSize.xs) },
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          styles.metricValue,
          { fontSize: scaleFont(typography.fontSize.xl) },
        ]}
      >
        {value}
      </Text>
      {!!meta && (
        <Text
          style={[
            styles.metricMeta,
            { fontSize: scaleFont(typography.fontSize.xs) },
          ]}
        >
          {meta}
        </Text>
      )}
    </View>
  );
}

export function ReportsScreen({
  navigation,
}: MainDrawerScreenProps<'Reports'>) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { t, language } = useI18n();
  const { alert } = useAppAlert();
  const { isGuest } = useAppAccess();
  const queryClient = useQueryClient();
  const user = useAuthStore(state => state.user);
  const {
    horizontalPadding,
    contentMaxWidth,
    isSmallPhone,
    scaleFont,
    scaleSize,
  } = useResponsive();
  const locale = getCurrencyLocale(language);
  const [periodType, setPeriodType] =
    React.useState<ReportPeriodType>('weekly');
  const [selectedDate, setSelectedDate] = React.useState(todayISO());
  const [showDatePicker, setShowDatePicker] = React.useState(false);
  const pickerDateValue = React.useMemo(
    () => parsePickerDate(selectedDate),
    [selectedDate],
  );
  const formattedDate = pickerDateValue.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
  });
  const constrainedContentStyle = contentMaxWidth
    ? {
        maxWidth: contentMaxWidth,
        alignSelf: 'center' as const,
        width: '100%' as const,
      }
    : null;

  const reportQuery = useQuery({
    queryKey: ['reports', periodType, selectedDate, 6],
    queryFn: () =>
      reportsApi.getSummary({
        periodType,
        referenceDate: selectedDate,
        horizonMonths: 6,
      }),
  });

  const historyQuery = useQuery({
    queryKey: ['report-history', 8],
    queryFn: () => reportsApi.getHistory(8),
    enabled: !isGuest,
  });

  const sendReportMutation = useMutation({
    mutationFn: reportsApi.sendReport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-history'] });
      alert(t('reports.emailSentTitle'), t('reports.emailSentDesc'));
    },
    onError: () => {
      alert(t('common.error'), t('reports.emailFailed'));
    },
  });

  const saveReportMutation = useMutation({
    mutationFn: reportsApi.saveSummary,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-history'] });
      alert(t('reports.saveSentTitle'), t('reports.saveSentDesc'));
    },
    onError: () => {
      alert(t('common.error'), t('reports.saveFailed'));
    },
  });

  const handleBackPress = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.navigate('Tabs', { screen: 'Dashboard' });
  };

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
      setSelectedDate(formatDate(nextDate, 'YYYY-MM-DD'));
    },
    [],
  );

  const onOpenDatePicker = React.useCallback(() => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        mode: 'date',
        value: pickerDateValue,
        maximumDate: new Date(),
        onChange: onChangeSelectedDate,
      });
      return;
    }

    setShowDatePicker(prev => !prev);
  }, [onChangeSelectedDate, pickerDateValue]);

  const onRefresh = React.useCallback(() => {
    Promise.all([
      reportQuery.refetch(),
      !isGuest ? historyQuery.refetch() : Promise.resolve(),
    ]).catch(() => undefined);
  }, [historyQuery, isGuest, reportQuery]);

  const onShareReport = React.useCallback(async () => {
    if (!reportQuery.data) {
      return;
    }

    await Share.share({
      message: buildShareMessage(reportQuery.data, user?.currency, t, locale),
    });
  }, [locale, reportQuery.data, t, user?.currency]);

  const onEmailReport = React.useCallback(() => {
    const userEmail = user?.email?.trim();
    if (!userEmail) {
      alert(t('common.error'), t('settings.noEmail'));
      return;
    }

    alert(t('reports.emailTitle'), t('reports.emailConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.send'),
        onPress: () =>
          sendReportMutation.mutate({
            email: userEmail,
            periodType,
            referenceDate: selectedDate,
            horizonMonths: 6,
          }),
      },
    ]);
  }, [alert, periodType, selectedDate, sendReportMutation, t, user?.email]);

  const onSaveReport = React.useCallback(() => {
    saveReportMutation.mutate({
      periodType,
      referenceDate: selectedDate,
      horizonMonths: 6,
    });
  }, [periodType, saveReportMutation, selectedDate]);

  const onOpenHistoryItem = React.useCallback((item: ReportHistoryItem) => {
    setPeriodType(item.periodType);
    setSelectedDate(item.referenceDate);
  }, []);

  const report = reportQuery.data;
  const historyItems = historyQuery.data ?? [];
  const hasAnyData =
    !!report &&
    (report.summary.totalIncome > 0 ||
      report.summary.totalSpent > 0 ||
      report.insights.subscriptionSavings.activeSubscriptions > 0 ||
      report.savings.goalCount > 0);
  const cardPadding = isSmallPhone
    ? scaleSize(spacing.lg, 0.5)
    : scaleSize(spacing.xl, 0.5);
  const topCategoryLabel = report?.insights.topCategory
    ? `${report.insights.topCategory.icon} ${report.insights.topCategory.name}`
    : t('reports.noTopCategory');

  return (
    <View style={styles.container}>
      <HomeBackground />
      <AnimatedScreen
        style={styles.flex1}
        delay={12}
        duration={220}
        travelY={8}
      >
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
          <View style={styles.headerRow}>
            <ScreenBackButton onPress={handleBackPress} />
            <View style={styles.headerCopy}>
              <Text
                style={[
                  styles.headerTitle,
                  { fontSize: scaleFont(typography.fontSize['2xl']) },
                ]}
              >
                {t('reports.title')}
              </Text>
              <Text
                style={[
                  styles.headerSubtitle,
                  { fontSize: scaleFont(typography.fontSize.sm) },
                ]}
              >
                {t('reports.subtitle')}
              </Text>
            </View>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.content,
            {
              paddingHorizontal: horizontalPadding,
              paddingBottom: insets.bottom + spacing['4xl'],
            },
            constrainedContentStyle,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={reportQuery.isRefetching}
              onRefresh={onRefresh}
              tintColor={colors.primaryAction}
              colors={[colors.primaryAction]}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.heroCard, { padding: cardPadding }]}>
            <View style={styles.segmentRow}>
              {(['weekly', 'monthly'] as ReportPeriodType[]).map(item => {
                const isActive = item === periodType;
                return (
                  <TouchableOpacity
                    key={item}
                    style={[
                      styles.segmentButton,
                      isActive ? styles.segmentButtonActive : null,
                    ]}
                    activeOpacity={0.85}
                    onPress={() => setPeriodType(item)}
                  >
                    <Text
                      style={[
                        styles.segmentButtonText,
                        { fontSize: scaleFont(typography.fontSize.sm) },
                        isActive ? styles.segmentButtonTextActive : null,
                      ]}
                    >
                      {item === 'weekly'
                        ? t('reports.periodWeek')
                        : t('reports.periodMonth')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={styles.dateButton}
              activeOpacity={0.84}
              onPress={onOpenDatePicker}
            >
              <Icon
                name="calendar-outline"
                size={16}
                color={colors.textPrimary}
              />
              <Text
                style={[
                  styles.dateButtonText,
                  { fontSize: scaleFont(typography.fontSize.sm) },
                ]}
              >
                {t('reports.dateLabel', { date: formattedDate })}
              </Text>
            </TouchableOpacity>

            <View style={styles.actionRow}>
              <Button
                title={t('reports.shareCta')}
                onPress={onShareReport}
                variant="secondary"
                containerStyle={styles.actionButton}
                disabled={!report}
              />
              {!isGuest && (
                <Button
                  title={t('reports.saveCta')}
                  onPress={onSaveReport}
                  variant="secondary"
                  loading={saveReportMutation.isPending}
                  containerStyle={styles.actionButton}
                  disabled={!report}
                />
              )}
              {!isGuest && (
                <Button
                  title={t('reports.emailCta')}
                  onPress={onEmailReport}
                  loading={sendReportMutation.isPending}
                  containerStyle={styles.actionButton}
                  disabled={!report}
                />
              )}
            </View>

            <Text
              style={[
                styles.rangeLabel,
                { fontSize: scaleFont(typography.fontSize.xs) },
              ]}
            >
              {report
                ? formatRangeLabel(
                    report.report.start,
                    report.report.end,
                    locale,
                  )
                : t('reports.loadingRange')}
            </Text>
          </View>

          {Platform.OS === 'ios' && showDatePicker ? (
            <View style={styles.datePickerCard}>
              <DateTimePicker
                mode="date"
                display="spinner"
                value={pickerDateValue}
                maximumDate={new Date()}
                onChange={onChangeSelectedDate}
              />
            </View>
          ) : null}

          {reportQuery.error ? (
            <TouchableOpacity
              style={styles.errorCard}
              activeOpacity={0.82}
              onPress={onRefresh}
            >
              <Icon
                name="refresh-outline"
                size={18}
                color={colors.textPrimary}
              />
              <Text
                style={[
                  styles.errorText,
                  { fontSize: scaleFont(typography.fontSize.sm) },
                ]}
              >
                {t('reports.loadError')}
              </Text>
            </TouchableOpacity>
          ) : null}

          {reportQuery.isLoading && !report ? (
            <AnalyticsSkeleton
              horizontalPadding={0}
              contentMaxWidth={contentMaxWidth}
            />
          ) : !hasAnyData ? (
            <View style={styles.emptyWrap}>
              <EmptyState
                icon="document-text-outline"
                title={t('reports.emptyTitle')}
                description={t('reports.emptyDescription')}
              />
              <Button
                title={t('reports.emptyCta')}
                onPress={() =>
                  navigation.navigate('AddEntry', { initialTab: 'income' })
                }
                containerStyle={styles.emptyButton}
              />
            </View>
          ) : report ? (
            <>
              <View style={styles.metricsGrid}>
                <MetricCard
                  label={t('reports.summaryIncome')}
                  value={formatCurrency(
                    report.summary.totalIncome,
                    user?.currency,
                  )}
                  meta={t('reports.summaryIncomeMeta', {
                    count: report.summary.incomeCount,
                  })}
                />
                <MetricCard
                  label={t('reports.summarySpent')}
                  value={formatCurrency(
                    report.summary.totalSpent,
                    user?.currency,
                  )}
                  meta={t('reports.summarySpentMeta', {
                    count: report.summary.expenseCount,
                  })}
                />
                <MetricCard
                  label={t('reports.summaryNet')}
                  value={formatCurrency(report.summary.net, user?.currency)}
                  meta={
                    report.summary.savingsRate === null
                      ? t('reports.summaryNoSavingsRate')
                      : t('reports.summarySavingsRateValue', {
                          value: report.summary.savingsRate.toFixed(1),
                        })
                  }
                />
                <MetricCard
                  label={t('reports.summaryAverageDaily')}
                  value={formatCurrency(
                    report.summary.averagePerDay,
                    user?.currency,
                  )}
                  meta={t('reports.summaryTrackedDays', {
                    days: report.report.trackedDays,
                  })}
                />
              </View>

              <View style={[styles.sectionCard, { padding: cardPadding }]}>
                <Text
                  style={[
                    styles.sectionTitle,
                    { fontSize: scaleFont(typography.fontSize.lg) },
                  ]}
                >
                  {t('reports.highlightsTitle')}
                </Text>
                <View style={styles.highlightGrid}>
                  <View style={styles.highlightCard}>
                    <Text
                      style={[
                        styles.highlightLabel,
                        { fontSize: scaleFont(typography.fontSize.xs) },
                      ]}
                    >
                      {t('reports.safeMoveTitle')}
                    </Text>
                    <Text
                      style={[
                        styles.highlightValue,
                        { fontSize: scaleFont(typography.fontSize.lg) },
                      ]}
                    >
                      {formatCurrency(
                        report.highlights.suggestedSavingsMove,
                        user?.currency,
                      )}
                    </Text>
                  </View>
                  <View style={styles.highlightCard}>
                    <Text
                      style={[
                        styles.highlightLabel,
                        { fontSize: scaleFont(typography.fontSize.xs) },
                      ]}
                    >
                      {t('reports.topCategoryTitle')}
                    </Text>
                    <Text
                      style={[
                        styles.highlightValue,
                        { fontSize: scaleFont(typography.fontSize.base) },
                      ]}
                    >
                      {topCategoryLabel}
                    </Text>
                  </View>
                  <View style={styles.highlightCard}>
                    <Text
                      style={[
                        styles.highlightLabel,
                        { fontSize: scaleFont(typography.fontSize.xs) },
                      ]}
                    >
                      {t('reports.subscriptionProjectedSavings')}
                    </Text>
                    <Text
                      style={[
                        styles.highlightValue,
                        { fontSize: scaleFont(typography.fontSize.lg) },
                      ]}
                    >
                      {formatCurrency(
                        report.insights.subscriptionSavings.projectedSavings,
                        user?.currency,
                      )}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={[styles.sectionCard, { padding: cardPadding }]}>
                <Text
                  style={[
                    styles.sectionTitle,
                    { fontSize: scaleFont(typography.fontSize.lg) },
                  ]}
                >
                  {t('reports.planTitle')}
                </Text>
                <View style={styles.planRow}>
                  <Text
                    style={[
                      styles.planLabel,
                      { fontSize: scaleFont(typography.fontSize.sm) },
                    ]}
                  >
                    {t('reports.planBudget')}
                  </Text>
                  <Text
                    style={[
                      styles.planValue,
                      { fontSize: scaleFont(typography.fontSize.sm) },
                    ]}
                  >
                    {formatCurrency(report.plan.budgetAmount, user?.currency)}
                  </Text>
                </View>
                <View style={styles.planRow}>
                  <Text
                    style={[
                      styles.planLabel,
                      { fontSize: scaleFont(typography.fontSize.sm) },
                    ]}
                  >
                    {t('reports.planRemaining')}
                  </Text>
                  <Text
                    style={[
                      styles.planValue,
                      { fontSize: scaleFont(typography.fontSize.sm) },
                    ]}
                  >
                    {formatCurrency(report.plan.remaining, user?.currency)}
                  </Text>
                </View>
                <View style={styles.planRow}>
                  <Text
                    style={[
                      styles.planLabel,
                      { fontSize: scaleFont(typography.fontSize.sm) },
                    ]}
                  >
                    {t('reports.planSafeToSpend')}
                  </Text>
                  <Text
                    style={[
                      styles.planValue,
                      { fontSize: scaleFont(typography.fontSize.sm) },
                    ]}
                  >
                    {formatCurrency(
                      report.plan.safeToSpend ?? 0,
                      user?.currency,
                    )}
                  </Text>
                </View>
                <View style={styles.planPills}>
                  <View
                    style={[
                      styles.statusPill,
                      { backgroundColor: withAlpha(colors.error, 0.14) },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        {
                          color: colors.error,
                          fontSize: scaleFont(typography.fontSize.xs),
                        },
                      ]}
                    >
                      {t('reports.overBudgetCount', {
                        count: report.categoryBudgets.overBudgetCount,
                      })}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      { backgroundColor: withAlpha(colors.warning, 0.14) },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        {
                          color: colors.warning,
                          fontSize: scaleFont(typography.fontSize.xs),
                        },
                      ]}
                    >
                      {t('reports.watchBudgetCount', {
                        count: report.categoryBudgets.watchCount,
                      })}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={[styles.sectionCard, { padding: cardPadding }]}>
                <Text
                  style={[
                    styles.sectionTitle,
                    { fontSize: scaleFont(typography.fontSize.lg) },
                  ]}
                >
                  {t('reports.categoriesTitle')}
                </Text>
                {report.categories.length === 0 ? (
                  <Text
                    style={[
                      styles.emptySectionText,
                      { fontSize: scaleFont(typography.fontSize.sm) },
                    ]}
                  >
                    {t('reports.noCategories')}
                  </Text>
                ) : (
                  report.categories.slice(0, 5).map(category => (
                    <View key={category.name} style={styles.categoryRow}>
                      <View style={styles.categoryCopy}>
                        <View
                          style={[
                            styles.categoryIconWrap,
                            {
                              backgroundColor: withAlpha(category.color, 0.14),
                            },
                          ]}
                        >
                          <Text style={styles.categoryIconText}>
                            {category.icon}
                          </Text>
                        </View>
                        <View style={styles.categoryTextWrap}>
                          <Text
                            style={[
                              styles.categoryName,
                              { fontSize: scaleFont(typography.fontSize.sm) },
                            ]}
                          >
                            {category.name}
                          </Text>
                          <Text
                            style={[
                              styles.categoryMeta,
                              { fontSize: scaleFont(typography.fontSize.xs) },
                            ]}
                          >
                            {t('reports.categoryMeta', {
                              count: category.count,
                              percent: category.percentage.toFixed(0),
                            })}
                          </Text>
                        </View>
                      </View>
                      <Text
                        style={[
                          styles.categoryAmount,
                          { fontSize: scaleFont(typography.fontSize.sm) },
                        ]}
                      >
                        {formatCurrency(category.total, user?.currency)}
                      </Text>
                    </View>
                  ))
                )}
              </View>

              <View style={[styles.sectionCard, { padding: cardPadding }]}>
                <Text
                  style={[
                    styles.sectionTitle,
                    { fontSize: scaleFont(typography.fontSize.lg) },
                  ]}
                >
                  {t('reports.subscriptionsTitle')}
                </Text>
                <View style={styles.planRow}>
                  <Text
                    style={[
                      styles.planLabel,
                      { fontSize: scaleFont(typography.fontSize.sm) },
                    ]}
                  >
                    {t('reports.subscriptionRecurringSpend')}
                  </Text>
                  <Text
                    style={[
                      styles.planValue,
                      { fontSize: scaleFont(typography.fontSize.sm) },
                    ]}
                  >
                    {formatCurrency(
                      report.insights.subscriptionSavings.monthlyRecurringSpend,
                      user?.currency,
                    )}
                  </Text>
                </View>
                <View style={styles.planRow}>
                  <Text
                    style={[
                      styles.planLabel,
                      { fontSize: scaleFont(typography.fontSize.sm) },
                    ]}
                  >
                    {t('reports.subscriptionProjectedSavings')}
                  </Text>
                  <Text
                    style={[
                      styles.planValue,
                      { fontSize: scaleFont(typography.fontSize.sm) },
                    ]}
                  >
                    {formatCurrency(
                      report.insights.subscriptionSavings.projectedSavings,
                      user?.currency,
                    )}
                  </Text>
                </View>
                <View style={styles.planRow}>
                  <Text
                    style={[
                      styles.planLabel,
                      { fontSize: scaleFont(typography.fontSize.sm) },
                    ]}
                  >
                    {t('reports.subscriptionActiveCount')}
                  </Text>
                  <Text
                    style={[
                      styles.planValue,
                      { fontSize: scaleFont(typography.fontSize.sm) },
                    ]}
                  >
                    {report.insights.subscriptionSavings.activeSubscriptions}
                  </Text>
                </View>
                {report.insights.subscriptionSavings.topSubscriptions.map(
                  item => (
                    <View key={item.id} style={styles.subscriptionRow}>
                      <View>
                        <Text
                          style={[
                            styles.categoryName,
                            { fontSize: scaleFont(typography.fontSize.sm) },
                          ]}
                        >
                          {item.name}
                        </Text>
                        <Text
                          style={[
                            styles.categoryMeta,
                            { fontSize: scaleFont(typography.fontSize.xs) },
                          ]}
                        >
                          {t('reports.subscriptionItemMeta', {
                            months:
                              report.insights.subscriptionSavings.horizonMonths,
                          })}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.categoryAmount,
                          { fontSize: scaleFont(typography.fontSize.sm) },
                        ]}
                      >
                        {formatCurrency(item.projectedSavings, user?.currency)}
                      </Text>
                    </View>
                  ),
                )}
              </View>

              <View style={[styles.sectionCard, { padding: cardPadding }]}>
                <Text
                  style={[
                    styles.sectionTitle,
                    { fontSize: scaleFont(typography.fontSize.lg) },
                  ]}
                >
                  {t('reports.savingsTitle')}
                </Text>
                <View style={styles.planRow}>
                  <Text
                    style={[
                      styles.planLabel,
                      { fontSize: scaleFont(typography.fontSize.sm) },
                    ]}
                  >
                    {t('reports.savingsSaved')}
                  </Text>
                  <Text
                    style={[
                      styles.planValue,
                      { fontSize: scaleFont(typography.fontSize.sm) },
                    ]}
                  >
                    {formatCurrency(report.savings.totalSaved, user?.currency)}
                  </Text>
                </View>
                <View style={styles.planRow}>
                  <Text
                    style={[
                      styles.planLabel,
                      { fontSize: scaleFont(typography.fontSize.sm) },
                    ]}
                  >
                    {t('reports.savingsTarget')}
                  </Text>
                  <Text
                    style={[
                      styles.planValue,
                      { fontSize: scaleFont(typography.fontSize.sm) },
                    ]}
                  >
                    {formatCurrency(report.savings.totalTarget, user?.currency)}
                  </Text>
                </View>
                <View style={styles.planRow}>
                  <Text
                    style={[
                      styles.planLabel,
                      { fontSize: scaleFont(typography.fontSize.sm) },
                    ]}
                  >
                    {t('reports.savingsProgress')}
                  </Text>
                  <Text
                    style={[
                      styles.planValue,
                      { fontSize: scaleFont(typography.fontSize.sm) },
                    ]}
                  >
                    {report.savings.progressPercent === null
                      ? '0%'
                      : `${report.savings.progressPercent.toFixed(1)}%`}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.nextGoalText,
                    { fontSize: scaleFont(typography.fontSize.sm) },
                  ]}
                >
                  {report.savings.nextGoal
                    ? t('reports.nextGoalValue', {
                        title: report.savings.nextGoal.title,
                        date: report.savings.nextGoal.targetDate
                          ? formatDate(
                              report.savings.nextGoal.targetDate,
                              'MMM D',
                            )
                          : t('reports.noGoalDate'),
                      })
                    : t('reports.noNextGoal')}
                </Text>
              </View>

              {!isGuest ? (
                <View style={[styles.sectionCard, { padding: cardPadding }]}>
                  <Text
                    style={[
                      styles.sectionTitle,
                      { fontSize: scaleFont(typography.fontSize.lg) },
                    ]}
                  >
                    {t('reports.historyTitle')}
                  </Text>
                  {historyQuery.isLoading && historyItems.length === 0 ? (
                    <Text
                      style={[
                        styles.emptySectionText,
                        { fontSize: scaleFont(typography.fontSize.sm) },
                      ]}
                    >
                      {t('reports.historyLoading')}
                    </Text>
                  ) : historyQuery.error ? (
                    <Text
                      style={[
                        styles.emptySectionText,
                        { fontSize: scaleFont(typography.fontSize.sm) },
                      ]}
                    >
                      {t('reports.historyLoadError')}
                    </Text>
                  ) : historyItems.length === 0 ? (
                    <Text
                      style={[
                        styles.emptySectionText,
                        { fontSize: scaleFont(typography.fontSize.sm) },
                      ]}
                    >
                      {t('reports.historyEmpty')}
                    </Text>
                  ) : (
                    historyItems.map(item => (
                      <TouchableOpacity
                        key={item.id}
                        style={styles.historyItem}
                        activeOpacity={0.84}
                        onPress={() => onOpenHistoryItem(item)}
                      >
                        <View style={styles.historyRow}>
                          <Text
                            style={[
                              styles.categoryName,
                              { fontSize: scaleFont(typography.fontSize.sm) },
                            ]}
                          >
                            {item.periodType === 'monthly'
                              ? t('reports.periodMonth')
                              : t('reports.periodWeek')}
                          </Text>
                          <View
                            style={[
                              styles.historySourcePill,
                              {
                                backgroundColor: withAlpha(
                                  item.source === 'email'
                                    ? colors.primaryAction
                                    : colors.success,
                                  0.14,
                                ),
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.historySourcePillText,
                                {
                                  fontSize: scaleFont(typography.fontSize.xs),
                                  color:
                                    item.source === 'email'
                                      ? colors.primaryAction
                                      : colors.success,
                                },
                              ]}
                            >
                              {item.source === 'email'
                                ? t('reports.historySourceEmail')
                                : t('reports.historySourceManual')}
                            </Text>
                          </View>
                        </View>
                        <Text
                          style={[
                            styles.categoryMeta,
                            { fontSize: scaleFont(typography.fontSize.xs) },
                          ]}
                        >
                          {formatRangeLabel(item.start, item.end, locale)}
                        </Text>
                        <View style={styles.historyMetricsRow}>
                          <Text
                            style={[
                              styles.historyMetricText,
                              { fontSize: scaleFont(typography.fontSize.sm) },
                            ]}
                          >
                            {t('reports.summaryNet')}:{' '}
                            {formatCurrency(item.summary.net, user?.currency)}
                          </Text>
                          <Text
                            style={[
                              styles.historyMetricText,
                              { fontSize: scaleFont(typography.fontSize.sm) },
                            ]}
                          >
                            {t('reports.summarySpent')}:{' '}
                            {formatCurrency(
                              item.summary.totalSpent,
                              user?.currency,
                            )}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.categoryMeta,
                            { fontSize: scaleFont(typography.fontSize.xs) },
                          ]}
                        >
                          {t('reports.historyGeneratedAt', {
                            date: formatDate(item.createdAt, 'MMM D'),
                          })}
                        </Text>
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              ) : null}
            </>
          ) : null}
        </ScrollView>
      </AnimatedScreen>
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.surface,
    },
    flex1: {
      flex: 1,
    },
    header: {
      gap: spacing.base,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.base,
    },
    headerCopy: {
      flex: 1,
      gap: spacing.xs,
    },
    headerTitle: {
      color: colors.textPrimary,
      fontWeight: typography.fontWeight.bold,
    },
    headerSubtitle: {
      color: colors.textSecondary,
      lineHeight: typography.fontSize.sm * 1.45,
    },
    content: {
      gap: spacing.base,
      paddingTop: spacing.base,
    },
    heroCard: {
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      borderColor: withAlpha(colors.primaryAction, 0.22),
      backgroundColor: withAlpha(colors.surfaceCard, 0.92),
      gap: spacing.base,
    },
    segmentRow: {
      flexDirection: 'row',
      backgroundColor: withAlpha(colors.textMuted, 0.08),
      borderRadius: borderRadius.full,
      padding: 4,
      gap: 4,
    },
    segmentButton: {
      flex: 1,
      borderRadius: borderRadius.full,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.sm,
    },
    segmentButtonActive: {
      backgroundColor: colors.surfaceElevated,
    },
    segmentButtonText: {
      color: colors.textMuted,
      fontWeight: typography.fontWeight.semibold,
    },
    segmentButtonTextActive: {
      color: colors.textPrimary,
    },
    dateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceElevated,
      borderRadius: borderRadius.lg,
      paddingHorizontal: spacing.base,
      paddingVertical: spacing.base,
    },
    dateButtonText: {
      color: colors.textPrimary,
      fontWeight: typography.fontWeight.medium,
    },
    actionRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    actionButton: {
      flex: 1,
      minWidth: 120,
    },
    rangeLabel: {
      color: colors.textMuted,
    },
    datePickerCard: {
      borderRadius: borderRadius.lg,
      backgroundColor: colors.surfaceCard,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    errorCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: withAlpha(colors.error, 0.24),
      backgroundColor: withAlpha(colors.error, 0.08),
      paddingHorizontal: spacing.base,
      paddingVertical: spacing.base,
    },
    errorText: {
      color: colors.textPrimary,
      flex: 1,
    },
    metricsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.base,
    },
    metricCard: {
      flexGrow: 1,
      minWidth: 150,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceCard,
      padding: spacing.base,
      gap: spacing.xs,
    },
    metricLabel: {
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    metricValue: {
      color: colors.textPrimary,
      fontWeight: typography.fontWeight.bold,
    },
    metricMeta: {
      color: colors.textSecondary,
    },
    sectionCard: {
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceCard,
      gap: spacing.base,
    },
    sectionTitle: {
      color: colors.textPrimary,
      fontWeight: typography.fontWeight.bold,
    },
    highlightGrid: {
      gap: spacing.sm,
    },
    highlightCard: {
      borderRadius: borderRadius.lg,
      backgroundColor: withAlpha(colors.primaryAction, 0.08),
      padding: spacing.base,
      gap: spacing.xs,
    },
    highlightLabel: {
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    highlightValue: {
      color: colors.textPrimary,
      fontWeight: typography.fontWeight.bold,
    },
    planRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: spacing.base,
    },
    planLabel: {
      color: colors.textSecondary,
      flex: 1,
    },
    planValue: {
      color: colors.textPrimary,
      fontWeight: typography.fontWeight.semibold,
      textAlign: 'right',
    },
    planPills: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    statusPill: {
      borderRadius: borderRadius.full,
      paddingHorizontal: spacing.base,
      paddingVertical: spacing.xs,
    },
    statusPillText: {
      fontWeight: typography.fontWeight.semibold,
    },
    emptySectionText: {
      color: colors.textSecondary,
    },
    categoryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: spacing.base,
    },
    categoryCopy: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      flex: 1,
    },
    categoryIconWrap: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
    },
    categoryIconText: {
      fontSize: 16,
    },
    categoryTextWrap: {
      flex: 1,
      gap: 2,
    },
    categoryName: {
      color: colors.textPrimary,
      fontWeight: typography.fontWeight.semibold,
    },
    categoryMeta: {
      color: colors.textMuted,
    },
    categoryAmount: {
      color: colors.textPrimary,
      fontWeight: typography.fontWeight.semibold,
    },
    subscriptionRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: spacing.base,
      paddingTop: spacing.xs,
    },
    nextGoalText: {
      color: colors.textSecondary,
      lineHeight: typography.fontSize.sm * 1.45,
    },
    historyItem: {
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceElevated,
      padding: spacing.base,
      gap: spacing.xs,
    },
    historyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.base,
    },
    historySourcePill: {
      borderRadius: borderRadius.full,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
    },
    historySourcePillText: {
      fontWeight: typography.fontWeight.semibold,
    },
    historyMetricsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.base,
    },
    historyMetricText: {
      color: colors.textPrimary,
      fontWeight: typography.fontWeight.medium,
    },
    emptyWrap: {
      gap: spacing.base,
    },
    emptyButton: {
      alignSelf: 'center',
      minWidth: 180,
    },
  });
