import React, { useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    RefreshControl,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DrawerActions } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { MainDrawerScreenProps } from '../../navigation/types';
import { useAuthStore } from '../../store/authStore';
import { formatCurrencyBreakdown, getCurrencyLocale } from '../../utils/domain/currency';
import { withAlpha } from '../../utils/domain/subscriptions';
import {
    spacing,
    typography,
    borderRadius,
    useResponsive,
    useTheme,
    useThemedStyles,
    SemanticColors,
} from '../../theme/index';
import { Expense } from '../../types/index';
import { ExpenseItem } from '../../components/ui/domain/ExpenseItem';
import { EmptyState } from '../../components/ui/primitives/EmptyState';
import { AnimatedScreen } from '../../components/ui/primitives/AnimatedScreen';
import { HistorySkeleton } from '../../components/ui/primitives/Skeleton';
import { Button } from '../../components/ui/primitives/Button';
import { useI18n } from '../../hooks/useI18n';
import { HomeBackground } from '../../components/ui/layout/HomeBackground';
import { useExpensesScreen } from '../../hooks/useExpensesScreen';

export function ExpensesScreen({ route, navigation }: MainDrawerScreenProps<'Expenses'>) {
    const { colors } = useTheme();
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
    const { t, tPlural, language } = useI18n();
    const locale = getCurrencyLocale(language);
    const {
        items,
        totalCount,
        currencyBreakdown,
        isLoading,
        isRefreshing,
        isLoadingMore,
        error,
        refreshError,
        loadMoreError,
        hasNext,
        refresh,
        loadMore,
        retry,
        onDeleteExpense,
        activeSwipeableRef,
        activeSwipeableIdRef,
    } = useExpensesScreen({
        navigation,
        successMessage: route.params?.successMessage,
    });
    const onOpenSidebar = () => {
        navigation.dispatch(DrawerActions.openDrawer());
    };

    const expenses = items;
    const summaryText = t('expenses.overviewSubtitle', {
        count: totalCount,
        total: formatCurrencyBreakdown(currencyBreakdown, {
            locale,
            emptyCurrency: user?.currency,
        }),
    });
    const expensesCountLabel = tPlural('analytics.expenseCount', totalCount);
    const showSkeleton = isLoading && expenses.length === 0;
    const showInitialError = !!error && expenses.length === 0;
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

    const listFooter = useMemo(() => {
        if (isLoadingMore) {
            return (
                <View style={styles.footerState}>
                    <ActivityIndicator color={colors.primary} />
                </View>
            );
        }

        if (loadMoreError) {
            return (
                <View style={styles.footerState}>
                    <Text style={styles.footerErrorText}>{t('expenses.loadMoreError')}</Text>
                    <Button
                        title={t('common.retry')}
                        onPress={loadMore}
                        variant="secondary"
                        containerStyle={styles.footerRetryButton}
                    />
                </View>
            );
        }

        if (!hasNext) {
            return <View style={styles.footerSpacer} />;
        }

        return <View style={styles.footerSpacer} />;
    }, [
        colors.primary,
        hasNext,
        isLoadingMore,
        loadMore,
        loadMoreError,
        styles.footerErrorText,
        styles.footerRetryButton,
        styles.footerSpacer,
        styles.footerState,
        t,
    ]);

    const listHeader = (
        <>
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
                            {t('expenses.title')}
                        </Text>
                        <Text style={[styles.headerSubtitle, { fontSize: scaleFont(typography.fontSize.md) }]}>
                            {summaryText}
                        </Text>
                    </View>
                    <TouchableOpacity
                        onPress={() =>
                            navigation.navigate('AddEntry', { initialTab: 'expense' })
                        }
                        activeOpacity={0.85}
                        style={styles.addExpenseButton}
                    >
                        <Icon name="add" size={16} color={colors.textPrimary} />
                    </TouchableOpacity>
                </View>
            </View>
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
                    {t('expenses.totalSpending')}
                </Text>
                <Text style={[styles.totalValue, { fontSize: scaleFont(typography.fontSize['4xl']) }]}>
                    {formatCurrencyBreakdown(currencyBreakdown, {
                        locale,
                        emptyCurrency: user?.currency,
                    })}
                </Text>
                <Text style={[styles.totalMeta, { fontSize: scaleFont(typography.fontSize.xs) }]}>
                    {expensesCountLabel}
                </Text>
            </View>

            {refreshError ? (
                <View style={styles.inlineErrorCard}>
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

    return (
        <View style={styles.container}>
            <HomeBackground />
            <AnimatedScreen style={styles.flex1} delay={8} duration={200} travelY={6}>
                {showSkeleton ? (
                    <View
                        style={[
                            styles.listContent,
                            {
                                paddingTop: insets.top + spacing.lg,
                                paddingBottom: insets.bottom + spacing['5xl'],
                                paddingHorizontal: horizontalPadding,
                            },
                            constrainedContentStyle,
                        ]}
                    >
                        {listHeader}
                        <HistorySkeleton horizontalPadding={0} />
                    </View>
                ) : showInitialError ? (
                    <View
                        style={[
                            styles.listContent,
                            {
                                paddingTop: insets.top + spacing.lg,
                                paddingBottom: insets.bottom + spacing['5xl'],
                                paddingHorizontal: horizontalPadding,
                            },
                            constrainedContentStyle,
                        ]}
                    >
                        {listHeader}
                        <View style={styles.emptyBlock}>
                            <EmptyState
                                icon="alert-circle-outline"
                                title={t('common.error')}
                                description={t('expenses.loadErrorDescription')}
                            />
                            <Button
                                title={t('common.retry')}
                                onPress={retry}
                                containerStyle={styles.retryButton}
                            />
                        </View>
                    </View>
                ) : (
                    <FlatList
                        data={expenses}
                        keyExtractor={(item) => item.id}
                        ListHeaderComponent={listHeader}
                        refreshControl={
                            <RefreshControl
                                refreshing={isRefreshing}
                                onRefresh={refresh}
                                tintColor={colors.primary}
                                colors={[colors.primary]}
                            />
                        }
                        renderItem={({ item, index }: { item: Expense; index: number }) => (
                            <ExpenseItem
                                key={item.id}
                                expense={item}
                                onPress={(id) => navigation.navigate('EditExpense', { id })}
                                onEdit={(id) => navigation.navigate('EditExpense', { id })}
                                onDelete={onDeleteExpense}
                                activeSwipeableRef={activeSwipeableRef}
                                activeSwipeableIdRef={activeSwipeableIdRef}
                                animationDelay={Math.min(index * 35, 180)}
                            />
                        )}
                        ListEmptyComponent={
                            <View style={styles.emptyBlock}>
                                <EmptyState
                                    icon="wallet-outline"
                                    title={t('expenses.emptyTitle')}
                                    description={t('expenses.emptyDescription')}
                                />
                            </View>
                        }
                        ListFooterComponent={listFooter}
                        onEndReached={loadMore}
                        onEndReachedThreshold={0.35}
                        initialNumToRender={8}
                        maxToRenderPerBatch={8}
                        windowSize={7}
                        updateCellsBatchingPeriod={50}
                        contentContainerStyle={[
                            styles.listContent,
                            {
                                paddingTop: insets.top + spacing.lg,
                                paddingBottom: insets.bottom + spacing['5xl'],
                                paddingHorizontal: horizontalPadding,
                            },
                            constrainedContentStyle,
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
    headerBlock: {
        marginBottom: spacing.lg,
    },
    headerRow: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    menuButton: {
        alignItems: 'center',
        backgroundColor: withAlpha(colors.surfaceElevated, 0.9),
        borderColor: colors.border,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        height: 34,
        justifyContent: 'center',
        marginRight: spacing.sm,
        width: 34,
    },
    headerCopy: {
        flex: 1,
        marginRight: spacing.base,
    },
    headerTitle: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.extrabold,
    },
    headerSubtitle: {
        color: colors.textSecondary,
        marginTop: spacing.xs,
    },
    addExpenseButton: {
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
    listContent: {
        paddingBottom: spacing['5xl'],
    },
    emptyBlock: {
        alignItems: 'center',
        marginTop: spacing.lg,
    },
    retryButton: {
        marginTop: spacing.base,
        width: '100%',
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
    footerState: {
        alignItems: 'center',
        paddingTop: spacing.sm,
        paddingBottom: spacing.lg,
    },
    footerErrorText: {
        color: colors.textSecondary,
        marginBottom: spacing.sm,
    },
    footerRetryButton: {
        minWidth: 140,
    },
    footerSpacer: {
        height: spacing.lg,
    },
});
