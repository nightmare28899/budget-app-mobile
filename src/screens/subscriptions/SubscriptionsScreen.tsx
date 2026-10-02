import React, { useMemo } from 'react';
import {
    ActivityIndicator,
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MainDrawerScreenProps } from '../../navigation/types';
import { AnimatedScreen } from '../../components/ui/primitives/AnimatedScreen';
import { EmptyState } from '../../components/ui/primitives/EmptyState';
import { Button } from '../../components/ui/primitives/Button';
import { SubscriptionItem } from '../../components/ui/domain/SubscriptionItem';
import { SwipeHintCard } from '../../components/ui/primitives/SwipeHintCard';
import { formatCurrencyBreakdown } from '../../utils/domain/currency';
import { withAlpha } from '../../utils/domain/subscriptions';
import {
    borderRadius,
    spacing,
    typography,
    useResponsive,
    useTheme,
    useThemedStyles,
    SemanticColors,
} from '../../theme/index';
import { useI18n } from '../../hooks/shared/useI18n';
import { useSubscriptionsScreen } from '../../hooks/subscriptions/useSubscriptionsScreen';
import { useSwipeHint } from '../../hooks/shared/useSwipeHint';
import { HomeBackground } from '../../components/ui/layout/HomeBackground';
import { ScreenHeader } from '../../components/ui/layout/ScreenHeader';

function formatDateGroupLabel(value: string, locale: 'en-US' | 'es-MX'): string {
    const parsed = new Date(`${value}T12:00:00`);
    if (Number.isNaN(parsed.getTime())) {
        return value;
    }
    return parsed.toLocaleDateString(locale, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
    });
}

export function SubscriptionsScreen({
    route,
    navigation,
}: MainDrawerScreenProps<'Subscriptions' | 'UpcomingSubscriptions'>) {
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);
    const insets = useSafeAreaInsets();
    const {
        horizontalPadding,
        contentMaxWidth,
        isSmallPhone,
        scaleFont,
        scaleSize,
    } = useResponsive();
    const { t } = useI18n();

    const isUpcomingOnly = route.name === 'UpcomingSubscriptions';
    const upcomingDays =
        isUpcomingOnly && route.params && 'upcomingDays' in route.params
            ? (route.params.upcomingDays ?? 3)
            : 3;
    const successMessage =
        !isUpcomingOnly && route.params && 'successMessage' in route.params
            ? route.params.successMessage
            : undefined;

    const {
        user,
        isLoading,
        isRefreshing,
        subscriptions,
        refetch,
        monthlyCurrencyBreakdown,
        locale,
        activeCountLabel,
        hasError,
        hasPartialError,
        activeSwipeableRef,
        activeSwipeableIdRef,
        goHomeOnBack,
        onEditSubscription,
        onDeleteSubscription,
    } = useSubscriptionsScreen({
        navigation,
        successMessage,
        upcomingOnly: isUpcomingOnly,
        upcomingDays,
    });
    const {
        isVisible: subscriptionsSwipeHintVisible,
        dismiss: dismissSubscriptionsSwipeHint,
    } = useSwipeHint('subscriptions', user);
    const showSwipeHint =
        subscriptionsSwipeHintVisible && !isUpcomingOnly && subscriptions.length > 0;
    const constrainedContentStyle = useMemo(
        () => (
            contentMaxWidth
                ? {
                    alignSelf: 'center' as const,
                    maxWidth: contentMaxWidth,
                    width: '100%' as const,
                }
                : null
        ),
        [contentMaxWidth],
    );
    const upcomingDateGroups = useMemo(() => {
        if (!isUpcomingOnly) {
            return [] as Array<{ date: string; items: typeof subscriptions }>;
        }

        const grouped = new Map<string, typeof subscriptions>();
        for (const subscription of subscriptions) {
            const sourceDate = subscription.chargeDate || subscription.nextPaymentDate;
            const normalizedDate = sourceDate ? sourceDate.slice(0, 10) : '';
            const groupDate = normalizedDate || 'unknown';
            const existing = grouped.get(groupDate) || [];
            existing.push(subscription);
            grouped.set(groupDate, existing);
        }

        return Array.from(grouped.entries())
            .sort(([a], [b]) => {
                if (a === 'unknown') return 1;
                if (b === 'unknown') return -1;
                return (
                    new Date(`${a}T12:00:00`).getTime() -
                    new Date(`${b}T12:00:00`).getTime()
                );
            })
            .map(([date, items]) => ({ date, items }));
    }, [isUpcomingOnly, subscriptions]);

    return (
        <View style={styles.container}>
            <HomeBackground />
            <AnimatedScreen style={styles.flex1} delay={10} duration={240} travelY={8}>
                <ScrollView
                    contentContainerStyle={[
                        styles.content,
                        {
                            paddingTop: insets.top + spacing.lg,
                            paddingHorizontal: horizontalPadding,
                            paddingBottom: insets.bottom + spacing['5xl'],
                        },
                        constrainedContentStyle,
                    ]}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefreshing || isLoading}
                            onRefresh={refetch}
                            tintColor={colors.primary}
                            colors={[colors.primary]}
                        />
                    }
                >
                    <View style={styles.headerBlock}>
                        <ScreenHeader
                            title={isUpcomingOnly
                                ? t('subscriptions.upcomingTitle')
                                : t('subscriptions.title')}
                            subtitle={isUpcomingOnly
                                ? t('subscriptions.upcomingSubtitle', { days: upcomingDays })
                                : t('subscriptions.subtitle')}
                            onBack={goHomeOnBack}
                        />
                    </View>

                    {!isUpcomingOnly && (
                        <View
                            style={[
                                styles.totalCard,
                                {
                                    padding: isSmallPhone
                                        ? scaleSize(spacing.lg, 0.45)
                                        : scaleSize(spacing.xl, 0.45),
                                },
                            ]}
                        >
                            <View style={styles.totalGlow} />
                            <Text style={[styles.totalLabel, { fontSize: scaleFont(typography.fontSize.sm) }]}>
                                {t('subscriptions.totalMonthly')}
                            </Text>
                            <Text style={[styles.totalValue, { fontSize: scaleFont(typography.fontSize['4xl']) }]}>
                                {formatCurrencyBreakdown(monthlyCurrencyBreakdown, {
                                    locale,
                                    emptyCurrency: user?.currency,
                                })}
                            </Text>
                            <Text style={[styles.totalMeta, { fontSize: scaleFont(typography.fontSize.xs) }]}>
                                {activeCountLabel}
                            </Text>
                        </View>
                    )}

                    {showSwipeHint ? (
                        <SwipeHintCard
                            accentColor={colors.primary}
                            onDismiss={dismissSubscriptionsSwipeHint}
                        />
                    ) : null}

                    {hasPartialError ? (
                        <TouchableOpacity
                            style={styles.partialErrorCard}
                            onPress={refetch}
                            activeOpacity={0.82}
                            accessibilityRole="button"
                            accessibilityLabel={t('common.retry')}
                        >
                            <Text style={styles.partialErrorTitle}>{t('common.error')}</Text>
                            <Text style={styles.partialErrorText}>{t('common.retry')}</Text>
                        </TouchableOpacity>
                    ) : null}

                    {isLoading && subscriptions.length === 0 && !hasError ? (
                        <View style={styles.loadingBlock}>
                            <ActivityIndicator color={colors.primary} />
                            <Text style={styles.loadingText}>{t('common.loading')}</Text>
                        </View>
                    ) : hasError ? (
                        <View style={styles.emptyBlock}>
                            <EmptyState
                                icon="alert-circle-outline"
                                title={t('common.error')}
                                description={t('subscriptions.upcomingLoadError')}
                            />
                            <Button
                                title={t('common.retry')}
                                onPress={refetch}
                                containerStyle={styles.emptyButton}
                            />
                        </View>
                    ) : !subscriptions.length ? (
                        <View style={styles.emptyBlock}>
                            <EmptyState
                                icon="card-outline"
                                title={
                                    isUpcomingOnly
                                        ? t('subscriptions.upcomingEmptyTitle')
                                        : t('subscriptions.emptyTitle')
                                }
                                description={
                                    isUpcomingOnly
                                        ? t('subscriptions.upcomingEmptyDescription', { days: upcomingDays })
                                        : t('subscriptions.emptyDescription')
                                }
                            />
                            {!isUpcomingOnly && (
                                <Button
                                    title={t('subscriptions.addFirst')}
                                    onPress={() =>
                                        navigation.navigate('AddEntry', { initialTab: 'subscription' })
                                    }
                                    containerStyle={styles.emptyButton}
                                />
                            )}
                        </View>
                    ) : (
                        <View style={styles.cardsList}>
                            {isUpcomingOnly
                                ? upcomingDateGroups.map((group) => (
                                      <View key={group.date} style={styles.dateGroup}>
                                          <Text
                                              style={[
                                                  styles.dateHeading,
                                                  { fontSize: scaleFont(typography.fontSize.sm) },
                                              ]}
                                          >
                                              {group.date === 'unknown'
                                                  ? t('subscriptions.unknownDate')
                                                  : formatDateGroupLabel(group.date, locale)}
                                          </Text>
                                          {group.items.map((subscription, index) => (
                                              <View
                                                  key={subscription.id}
                                                  style={
                                                      index < group.items.length - 1
                                                          ? styles.cardSpacing
                                                          : null
                                                  }
                                              >
                                                  <SubscriptionItem
                                                      subscription={subscription}
                                                      locale={locale}
                                                      onPress={onEditSubscription}
                                                      onEdit={undefined}
                                                      onDelete={undefined}
                                                      activeSwipeableRef={activeSwipeableRef}
                                                      activeSwipeableIdRef={activeSwipeableIdRef}
                                                      animationDelay={index * 45}
                                                  />
                                              </View>
                                          ))}
                                      </View>
                                  ))
                                : subscriptions.map((subscription, index) => (
                                      <View
                                          key={subscription.id}
                                          style={
                                              index < subscriptions.length - 1
                                                  ? styles.cardSpacing
                                                  : null
                                          }
                                      >
                                          <SubscriptionItem
                                              subscription={subscription}
                                              locale={locale}
                                              onPress={onEditSubscription}
                                              onEdit={onEditSubscription}
                                              onDelete={onDeleteSubscription}
                                              activeSwipeableRef={activeSwipeableRef}
                                              activeSwipeableIdRef={activeSwipeableIdRef}
                                              animationDelay={index * 45}
                                          />
                                      </View>
                                  ))}
                        </View>
                    )}
                </ScrollView>
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
    content: {
        paddingBottom: spacing['5xl'],
    },
    headerBlock: {
        marginBottom: spacing.lg,
    },
    moduleSwitcher: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: borderRadius.full,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: withAlpha(colors.surfaceElevated, 0.7),
        padding: 4,
        marginBottom: spacing.base,
    },
    moduleButton: {
        flex: 1,
        borderRadius: borderRadius.full,
        paddingVertical: spacing.sm,
        alignItems: 'center',
    },
    moduleButtonActive: {
        backgroundColor: withAlpha(colors.primary, 0.25),
        borderWidth: 1,
        borderColor: withAlpha(colors.primary, 0.45),
    },
    moduleButtonText: {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.semibold,
        color: colors.textMuted,
    },
    moduleButtonTextActive: {
        color: colors.textPrimary,
    },
    addSubscriptionButton: {
        alignItems: 'center',
        backgroundColor: withAlpha(colors.primary, 0.24),
        borderColor: withAlpha(colors.primary, 0.55),
        borderRadius: borderRadius.md,
        borderWidth: 1,
        height: 34,
        justifyContent: 'center',
        width: 34,
    },
    totalCard: {
        backgroundColor: colors.surfaceCard,
        borderRadius: borderRadius.xl,
        borderWidth: 1,
        borderColor: withAlpha(colors.primary, 0.45),
        marginBottom: spacing.lg,
        overflow: 'hidden',
    },
    totalGlow: {
        position: 'absolute',
        right: -20,
        top: -30,
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: withAlpha(colors.primary, 0.35),
    },
    totalLabel: {
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.7,
        fontWeight: typography.fontWeight.semibold,
    },
    totalValue: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.extrabold,
        marginTop: spacing.sm,
    },
    totalMeta: {
        color: colors.textMuted,
        marginTop: spacing.xs,
    },
    cardsList: {
        marginTop: spacing.xs,
    },
    dateGroup: {
        marginBottom: spacing.base,
    },
    dateHeading: {
        color: colors.textSecondary,
        fontWeight: typography.fontWeight.semibold,
        marginBottom: spacing.sm,
        textTransform: 'capitalize',
    },
    cardSpacing: {
        marginBottom: spacing.sm,
    },
    emptyBlock: {
        marginTop: spacing.xl,
        alignItems: 'center',
    },
    loadingBlock: {
        alignItems: 'center',
        gap: spacing.sm,
        paddingVertical: spacing['3xl'],
    },
    loadingText: {
        color: colors.textMuted,
        fontWeight: typography.fontWeight.medium,
    },
    partialErrorCard: {
        minHeight: 56,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: withAlpha(colors.error, 0.45),
        backgroundColor: withAlpha(colors.error, 0.12),
        paddingHorizontal: spacing.base,
        paddingVertical: spacing.sm,
        justifyContent: 'center',
        marginBottom: spacing.base,
    },
    partialErrorTitle: {
        color: colors.error,
        fontWeight: typography.fontWeight.semibold,
    },
    partialErrorText: {
        color: colors.textSecondary,
        marginTop: 2,
    },
    emptyButton: {
        width: '100%',
        marginTop: spacing.base,
    },
});
