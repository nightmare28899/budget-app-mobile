import React, { useEffect, useMemo, useState } from 'react';
import {
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';
import { showGlobalAlert } from '../../components/alerts/alertBridge';
import { SavingsGoalFormModal } from '../../components/savings/SavingsGoalFormModal';
import { AnimatedScreen } from '../../components/ui/primitives/AnimatedScreen';
import { Button } from '../../components/ui/primitives/Button';
import { EmptyState } from '../../components/ui/primitives/EmptyState';
import { HomeBackground } from '../../components/ui/layout/HomeBackground';
import { Skeleton } from '../../components/ui/primitives/Skeleton';
import { SavingsFundsModal } from '../../components/savings/SavingsFundsModal';
import { SavingsProgressRing } from '../../components/savings/SavingsProgressRing';
import { SavingsTransactionItem } from '../../components/savings/SavingsTransactionItem';
import { useI18n } from '../../hooks/useI18n';
import { RootScreenProps } from '../../navigation/types';
import { useSavingsStore } from '../../store/savingsStore';
import {
    borderRadius,
    spacing,
    typography,
    useResponsive,
    useTheme,
    useThemedStyles,
    SemanticColors,
} from '../../theme/index';
import { CreateSavingsGoalPayload } from '../../types/index';
import { formatCurrency } from '../../utils/core/format';
import { resolveSavingsGoalIconName } from '../../utils/platform/icons';
import { API_BASE_URL } from '../../utils/core/constants';
import {
    formatSavingsDate,
    formatSavingsDateTime,
    getRemainingSavings,
    getSavingsProgress,
    resolveSavingsGoalColor,
    withSavingsAlpha,
} from '../../utils/domain/savings';

function resolveActionErrorMessage(
    message: string | null | undefined,
    fallback: string,
    networkFallback: string,
): string {
    if (!message) {
        return fallback;
    }

    if (message === 'Network Error') {
        return networkFallback;
    }

    return message;
}

function SavingsGoalDetailSkeleton() {
    return (
        <View>
            <Skeleton width="100%" height={320} radius={24} />
            <Skeleton width="100%" height={72} radius={20} style={{ marginTop: spacing.base }} />
            <Skeleton width="100%" height={84} radius={20} style={{ marginTop: spacing.base }} />
            <Skeleton width="100%" height={84} radius={20} style={{ marginTop: spacing.base }} />
        </View>
    );
}

export function SavingsGoalDetailScreen({
    navigation,
    route,
}: RootScreenProps<'SavingsGoalDetail'>) {
    const insets = useSafeAreaInsets();
    const styles = useThemedStyles(createStyles);
    const { colors } = useTheme();
    const {
        horizontalPadding,
        contentMaxWidth,
        scaleFont,
    } = useResponsive();
    const { t, language } = useI18n();
    const locale: 'es-MX' | 'en-US' = language === 'es' ? 'es-MX' : 'en-US';
    const { goalId } = route.params;
    const [showDepositModal, setShowDepositModal] = useState(false);
    const [showWithdrawModal, setShowWithdrawModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [isClosingAfterDelete, setIsClosingAfterDelete] = useState(false);
    const {
        goal,
        transactions,
        isLoadingGoals,
        isLoadingTransactions,
        isAddingFunds,
        isWithdrawingFunds,
        isUpdatingGoal,
        isDeletingGoal,
        loadingTransactionsGoalId,
        errors,
        fetchGoals,
        fetchTransactions,
        addFunds,
        withdrawFunds,
        updateGoal,
        deleteGoal,
        clearError,
    } = useSavingsStore(useShallow((state) => ({
        goal: state.goals.find((item) => item.id === goalId) ?? null,
        transactions:
            state.transactionsByGoal[goalId]
            ?? state.goals.find((item) => item.id === goalId)?.transactions
            ?? [],
        isLoadingGoals: state.isLoadingGoals,
        isLoadingTransactions: state.isLoadingTransactions,
        isAddingFunds: state.isAddingFunds,
        isWithdrawingFunds: state.isWithdrawingFunds,
        isUpdatingGoal: state.isUpdatingGoal,
        isDeletingGoal: state.isDeletingGoal,
        loadingTransactionsGoalId: state.loadingTransactionsGoalId,
        errors: state.errors,
        fetchGoals: state.fetchGoals,
        fetchTransactions: state.fetchTransactions,
        addFunds: state.addFunds,
        withdrawFunds: state.withdrawFunds,
        updateGoal: state.updateGoal,
        deleteGoal: state.deleteGoal,
        clearError: state.clearError,
    })));

    useEffect(() => {
        if (goal || isClosingAfterDelete) {
            return;
        }

        fetchGoals().catch(() => undefined);
    }, [fetchGoals, goal, isClosingAfterDelete]);

    useEffect(() => {
        fetchTransactions(goalId).catch(() => undefined);
    }, [fetchTransactions, goalId]);

    useEffect(() => {
        if (!goal?.title || route.params.title === goal.title) {
            return;
        }

        navigation.setParams({ title: goal.title });
    }, [goal?.title, navigation, route.params.title]);

    useEffect(() => {
        if (!isClosingAfterDelete || goal) {
            return;
        }

        if (navigation.canGoBack()) {
            navigation.goBack();
            return;
        }

        navigation.navigate('Main', { screen: 'Savings' });
    }, [goal, isClosingAfterDelete, navigation]);

    const progress = goal ? getSavingsProgress(goal) : 0;
    const remainingAmount = goal ? getRemainingSavings(goal) : 0;
    const canDeleteGoal = !!goal && goal.currentAmount <= 0.0001;
    const accentColor = resolveSavingsGoalColor(goal?.color, colors.success);
    const targetDateLabel = goal?.targetDate
        ? formatSavingsDate(goal.targetDate, locale)
        : null;
    const isMutatingFunds = isAddingFunds || isWithdrawingFunds;
    const isMutatingGoal = isUpdatingGoal || isDeletingGoal;
    const isBusy = isMutatingFunds || isMutatingGoal;
    const transactionsErrorMessage = errors.loadTransactionsByGoal[goalId]
        ? resolveActionErrorMessage(
            errors.loadTransactionsByGoal[goalId],
            t('savings.loadTransactionsError'),
            t('network.cannotReachApi', { baseUrl: API_BASE_URL }),
        )
        : null;
    const addFundsErrorMessage = errors.addFunds
        ? resolveActionErrorMessage(
            errors.addFunds,
            t('savings.failedAddFunds'),
            t('network.cannotReachApi', { baseUrl: API_BASE_URL }),
        )
        : null;
    const withdrawFundsErrorMessage = errors.withdrawFunds
        ? resolveActionErrorMessage(
            errors.withdrawFunds,
            t('savings.failedWithdrawFunds'),
            t('network.cannotReachApi', { baseUrl: API_BASE_URL }),
        )
        : null;
    const updateGoalErrorMessage = errors.updateGoal
        ? resolveActionErrorMessage(
            errors.updateGoal,
            t('savings.failedUpdateGoal'),
            t('network.cannotReachApi', { baseUrl: API_BASE_URL }),
        )
        : null;
    const deleteGoalErrorMessage = errors.deleteGoal
        ? /current amount is 0/i.test(errors.deleteGoal)
            ? t('savings.deleteGoalRequiresEmptyBalance')
            : resolveActionErrorMessage(
                errors.deleteGoal,
                t('savings.failedDeleteGoal'),
                t('network.cannotReachApi', { baseUrl: API_BASE_URL }),
            )
        : null;
    const goalLoadErrorMessage = resolveActionErrorMessage(
        errors.loadGoals,
        t('savings.loadGoalsError'),
        t('network.cannotReachApi', { baseUrl: API_BASE_URL }),
    );
    const isRefreshing =
        isLoadingGoals || (isLoadingTransactions && loadingTransactionsGoalId === goalId);
    const constrainedContentStyle = contentMaxWidth
        ? { maxWidth: contentMaxWidth, alignSelf: 'center' as const, width: '100%' as const }
        : null;

    useEffect(() => {
        if (!canDeleteGoal && errors.deleteGoal) {
            clearError('deleteGoal');
        }
    }, [canDeleteGoal, clearError, errors.deleteGoal]);

    const detailMetrics = useMemo(() => {
        if (!goal) {
            return [];
        }

        return [
            {
                id: 'saved',
                label: t('savings.savedAmountLabel'),
                value: formatCurrency(goal.currentAmount, 'MXN'),
            },
            {
                id: 'target',
                label: t('savings.targetAmountLabel'),
                value: formatCurrency(goal.targetAmount, 'MXN'),
            },
            {
                id: 'remaining',
                label: t('savings.remainingAmountLabel'),
                value: formatCurrency(remainingAmount, 'MXN'),
            },
        ];
    }, [goal, remainingAmount, t]);

    const handleAddFunds = async (payload: { amount: number }) => {
        if (!goal) {
            return;
        }

        try {
            await addFunds(goalId, payload);
            setShowDepositModal(false);
        } catch (error) {
            console.error('Failed to add funds', error);
        }
    };

    const handleWithdrawFunds = async (payload: { amount: number }) => {
        if (!goal) {
            return;
        }

        try {
            await withdrawFunds(goalId, payload);
            setShowWithdrawModal(false);
        } catch (error) {
            console.error('Failed to withdraw funds', error);
        }
    };

    const handleUpdateGoal = async (payload: CreateSavingsGoalPayload) => {
        if (!goal) {
            return;
        }

        try {
            await updateGoal(goalId, payload);
            setShowEditModal(false);
        } catch (error) {
            console.error('Failed to update goal', error);
        }
    };

    const handleDeleteGoal = () => {
        if (!goal || isDeletingGoal || !canDeleteGoal) {
            return;
        }

        clearError('deleteGoal');
        showGlobalAlert(
            t('savings.deleteGoalTitle'),
            t('savings.deleteGoalDescription'),
            [
                {
                    text: t('common.cancel'),
                    style: 'cancel',
                },
                {
                    text: t('common.delete'),
                    style: 'destructive',
                    onPress: async () => {
                        setShowDepositModal(false);
                        setShowWithdrawModal(false);
                        setShowEditModal(false);
                        setIsClosingAfterDelete(true);

                        try {
                            await deleteGoal(goalId);
                        } catch {
                            setIsClosingAfterDelete(false);
                        }
                    },
                },
            ],
        );
    };

    if (!goal && isClosingAfterDelete) {
        return (
            <View style={styles.loadingContainer}>
                <View style={styles.loadingInner}>
                    <SavingsGoalDetailSkeleton />
                </View>
            </View>
        );
    }

    if (!goal && isLoadingGoals) {
        return (
            <View style={styles.loadingContainer}>
                <View style={styles.loadingInner}>
                    <SavingsGoalDetailSkeleton />
                </View>
            </View>
        );
    }

    if (!goal) {
        return (
            <View style={styles.container}>
                <HomeBackground />
                <AnimatedScreen style={styles.emptyContainer} delay={12} duration={220} travelY={8}>
                    <View style={styles.emptyCard}>
                        <EmptyState
                            icon="alert-circle-outline"
                            title={t('savings.goalNotFoundTitle')}
                            description={goalLoadErrorMessage}
                        />
                        <Button
                            title={t('common.retry')}
                            onPress={() => {
                                fetchGoals().catch(() => undefined);
                            }}
                            containerStyle={styles.emptyAction}
                        />
                    </View>
                </AnimatedScreen>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <HomeBackground />
            <AnimatedScreen style={styles.flex1} delay={12} duration={220} travelY={8}>
                <ScrollView
                    contentContainerStyle={[
                        styles.content,
                        {
                            paddingTop: spacing.base,
                            paddingHorizontal: horizontalPadding,
                            paddingBottom: insets.bottom + spacing['5xl'],
                        },
                        constrainedContentStyle,
                    ]}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefreshing}
                            onRefresh={() => {
                                fetchGoals().catch(() => undefined);
                                fetchTransactions(goalId).catch(() => undefined);
                            }}
                        />
                    }
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.heroCard}>
                        <View
                            style={[
                                styles.heroGlow,
                                { backgroundColor: withSavingsAlpha(accentColor, 0.16) },
                            ]}
                        />
                        <View style={styles.heroTopRow}>
                            <View
                                style={[
                                    styles.heroIconWrap,
                                    {
                                        backgroundColor: withSavingsAlpha(accentColor, 0.14),
                                        borderColor: withSavingsAlpha(accentColor, 0.28),
                                    },
                                ]}
                            >
                                <Icon
                                    name={resolveSavingsGoalIconName(goal.icon)}
                                    size={24}
                                    color={accentColor}
                                />
                            </View>
                            <View style={styles.heroHeading}>
                                <Text
                                    style={[
                                        styles.heroEyebrow,
                                        { fontSize: scaleFont(typography.fontSize.sm) },
                                    ]}
                                >
                                    {t('savings.detailHeroLabel')}
                                </Text>
                                <Text
                                    style={[
                                        styles.heroTitle,
                                        { fontSize: scaleFont(typography.fontSize['3xl']) },
                                    ]}
                                >
                                    {goal.title}
                                </Text>
                                {targetDateLabel ? (
                                    <View style={styles.heroDateRow}>
                                        <Icon
                                            name="calendar-outline"
                                            size={14}
                                            color={colors.textMuted}
                                        />
                                        <Text
                                            style={[
                                                styles.heroDateText,
                                                { fontSize: scaleFont(typography.fontSize.sm) },
                                            ]}
                                        >
                                            {t('savings.targetDateLabel')}: {targetDateLabel}
                                        </Text>
                                    </View>
                                ) : null}
                            </View>
                        </View>

                        <View style={styles.ringWrap}>
                            <SavingsProgressRing
                                progress={progress}
                                color={accentColor}
                                trackColor={withSavingsAlpha(accentColor, 0.18)}
                            >
                                <Text
                                    style={[
                                        styles.ringPercent,
                                        { fontSize: scaleFont(typography.fontSize['3xl']) },
                                    ]}
                                >
                                    {`${Math.round(progress)}%`}
                                </Text>
                                <Text
                                    style={[
                                        styles.ringLabel,
                                        { fontSize: scaleFont(typography.fontSize.sm) },
                                    ]}
                                >
                                    {t('savings.progressRingLabel')}
                                </Text>
                            </SavingsProgressRing>
                        </View>

                        <Text
                            style={[
                                styles.heroAmount,
                                { fontSize: scaleFont(typography.fontSize['4xl']) },
                            ]}
                        >
                            {formatCurrency(goal.currentAmount, 'MXN')}
                        </Text>

                        <View style={styles.progressMetaRow}>
                            <Text
                                style={[
                                    styles.progressMeta,
                                    { fontSize: scaleFont(typography.fontSize.sm) },
                                ]}
                            >
                                {t('savings.progressLabel', {
                                    percent: Math.round(progress),
                                })}
                            </Text>
                            <Text
                                style={[
                                    styles.progressMeta,
                                    { fontSize: scaleFont(typography.fontSize.sm) },
                                ]}
                            >
                                {remainingAmount <= 0
                                    ? t('savings.goalReached')
                                    : t('savings.remainingAmount', {
                                        amount: formatCurrency(remainingAmount, 'MXN'),
                                    })}
                            </Text>
                        </View>

                        <View style={styles.heroActionsRow}>
                            <Button
                                title={t('savings.addFundsAction')}
                                onPress={() => {
                                    clearError('addFunds');
                                    setShowDepositModal(true);
                                }}
                                disabled={isBusy}
                                containerStyle={styles.heroActionButton}
                            />
                            <Button
                                title={t('savings.withdrawFundsAction')}
                                variant="danger"
                                onPress={() => {
                                    clearError('withdrawFunds');
                                    setShowWithdrawModal(true);
                                }}
                                disabled={goal.currentAmount <= 0 || isBusy}
                                containerStyle={styles.heroActionButton}
                            />
                        </View>
                    </View>

                    <View style={styles.metricsRow}>
                        {detailMetrics.map((metric) => (
                            <View key={metric.id} style={styles.metricCard}>
                                <Text
                                    style={[
                                        styles.metricLabel,
                                        { fontSize: scaleFont(typography.fontSize.xs) },
                                    ]}
                                >
                                    {metric.label}
                                </Text>
                                <Text
                                    style={[
                                        styles.metricValue,
                                        { fontSize: scaleFont(typography.fontSize.base) },
                                    ]}
                                >
                                    {metric.value}
                                </Text>
                            </View>
                        ))}
                    </View>

                    <View style={styles.metaGrid}>
                        <View style={styles.metaCard}>
                            <Text
                                style={[
                                    styles.metaLabel,
                                    { fontSize: scaleFont(typography.fontSize.sm) },
                                ]}
                            >
                                {t('savings.createdAtLabel')}
                            </Text>
                            <Text
                                style={[
                                    styles.metaValue,
                                    { fontSize: scaleFont(typography.fontSize.base) },
                                ]}
                            >
                                {formatSavingsDateTime(goal.createdAt, locale)}
                            </Text>
                        </View>
                        {targetDateLabel ? (
                            <View style={styles.metaCard}>
                                <Text
                                    style={[
                                        styles.metaLabel,
                                        { fontSize: scaleFont(typography.fontSize.sm) },
                                    ]}
                                >
                                    {t('savings.targetDateLabel')}
                                </Text>
                                <Text
                                    style={[
                                        styles.metaValue,
                                        { fontSize: scaleFont(typography.fontSize.base) },
                                    ]}
                                >
                                    {targetDateLabel}
                                </Text>
                            </View>
                        ) : null}
                    </View>

                    <TouchableOpacity
                        activeOpacity={0.84}
                        style={[
                            styles.manageActionButton,
                            isMutatingGoal ? styles.manageActionDisabled : null,
                        ]}
                        onPress={() => {
                            clearError('updateGoal');
                            setShowEditModal(true);
                        }}
                        disabled={isMutatingGoal}
                    >
                        <View style={styles.manageActionContent}>
                            <Icon name="create-outline" size={18} color={colors.primaryAction} />
                            <Text
                                style={[
                                    styles.manageActionText,
                                    {
                                        fontSize: scaleFont(typography.fontSize.base),
                                        color: colors.primaryAction,
                                    },
                                ]}
                            >
                                {t('savings.editGoalAction')}
                            </Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        activeOpacity={0.84}
                        style={[
                            styles.manageActionButton,
                            styles.manageDeleteButton,
                            !canDeleteGoal || isMutatingGoal
                                ? styles.manageActionDisabled
                                : null,
                        ]}
                        onPress={handleDeleteGoal}
                        disabled={!canDeleteGoal || isMutatingGoal}
                    >
                        <View style={styles.manageActionContent}>
                            <Icon name="trash-outline" size={18} color={colors.error} />
                            <Text
                                style={[
                                    styles.manageActionText,
                                    {
                                        fontSize: scaleFont(typography.fontSize.base),
                                        color: colors.error,
                                    },
                                ]}
                            >
                                {t('savings.deleteGoalAction')}
                            </Text>
                        </View>
                    </TouchableOpacity>

                    {!canDeleteGoal ? (
                        <View style={styles.helperCard}>
                            <Text
                                style={[
                                    styles.helperText,
                                    { fontSize: scaleFont(typography.fontSize.sm) },
                                ]}
                            >
                                {t('savings.deleteGoalRequiresEmptyBalance')}
                            </Text>
                        </View>
                    ) : null}

                    {canDeleteGoal && errors.deleteGoal ? (
                        <View style={styles.inlineErrorCard}>
                            <Text
                                style={[
                                    styles.inlineErrorText,
                                    { fontSize: scaleFont(typography.fontSize.sm) },
                                ]}
                            >
                                {deleteGoalErrorMessage}
                            </Text>
                        </View>
                    ) : null}

                    <View style={styles.sectionHeader}>
                        <View>
                            <Text
                                style={[
                                    styles.sectionTitle,
                                    { fontSize: scaleFont(typography.fontSize.xl) },
                                ]}
                            >
                                {t('savings.transactionsTitle')}
                            </Text>
                            <Text
                                style={[
                                    styles.sectionSubtitle,
                                    { fontSize: scaleFont(typography.fontSize.sm) },
                                ]}
                            >
                                {t('savings.transactionsSubtitle')}
                            </Text>
                        </View>
                        {errors.loadTransactionsByGoal[goalId] ? (
                            <Button
                                title={t('common.retry')}
                                variant="ghost"
                                onPress={() => {
                                    clearError('loadTransactions', goalId);
                                    fetchTransactions(goalId).catch(() => undefined);
                                }}
                            />
                        ) : null}
                    </View>

                    {errors.loadTransactionsByGoal[goalId] && transactions.length > 0 ? (
                        <View style={styles.inlineErrorCard}>
                            <Text
                                style={[
                                    styles.inlineErrorText,
                                    { fontSize: scaleFont(typography.fontSize.sm) },
                                ]}
                            >
                                {transactionsErrorMessage}
                            </Text>
                        </View>
                    ) : null}

                    {isLoadingTransactions && transactions.length === 0 ? (
                        <View>
                            <Skeleton width="100%" height={84} radius={20} />
                            <Skeleton
                                width="100%"
                                height={84}
                                radius={20}
                                style={{ marginTop: spacing.base }}
                            />
                        </View>
                    ) : errors.loadTransactionsByGoal[goalId] && transactions.length === 0 ? (
                        <View style={styles.emptyCard}>
                            <EmptyState
                                icon="alert-circle-outline"
                                title={t('common.error')}
                                description={transactionsErrorMessage || undefined}
                            />
                            <Button
                                title={t('common.retry')}
                                onPress={() => {
                                    clearError('loadTransactions', goalId);
                                    fetchTransactions(goalId).catch(() => undefined);
                                }}
                                containerStyle={styles.emptyAction}
                            />
                        </View>
                    ) : transactions.length === 0 ? (
                        <View style={styles.emptyCard}>
                            <EmptyState
                                icon="time-outline"
                                title={t('savings.emptyTransactionsTitle')}
                                description={t('savings.emptyTransactionsDescription')}
                            />
                        </View>
                    ) : (
                        <View style={styles.transactionsList}>
                            {transactions.map((transaction) => (
                                <SavingsTransactionItem
                                    key={transaction.id}
                                    transaction={transaction}
                                    locale={locale}
                                />
                            ))}
                        </View>
                    )}
                </ScrollView>
            </AnimatedScreen>

            <SavingsFundsModal
                visible={showDepositModal}
                goalTitle={goal.title}
                currentAmount={goal.currentAmount}
                remainingAmount={remainingAmount}
                loading={isAddingFunds}
                errorMessage={addFundsErrorMessage}
                mode="deposit"
                accentColor={goal.color}
                onClose={() => setShowDepositModal(false)}
                onSubmit={handleAddFunds}
            />

            <SavingsFundsModal
                visible={showWithdrawModal}
                goalTitle={goal.title}
                currentAmount={goal.currentAmount}
                remainingAmount={remainingAmount}
                loading={isWithdrawingFunds}
                errorMessage={withdrawFundsErrorMessage}
                mode="withdraw"
                maxAmount={goal.currentAmount}
                accentColor={goal.color}
                onClose={() => setShowWithdrawModal(false)}
                onSubmit={handleWithdrawFunds}
            />

            <SavingsGoalFormModal
                visible={showEditModal}
                loading={isUpdatingGoal}
                errorMessage={updateGoalErrorMessage}
                mode="edit"
                initialValues={goal}
                onClose={() => setShowEditModal(false)}
                onSubmit={handleUpdateGoal}
            />
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
        content: {
            width: '100%',
            gap: spacing.base,
        },
        loadingContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: colors.background,
        },
        loadingInner: {
            width: '100%',
            paddingHorizontal: spacing.xl,
        },
        emptyContainer: {
            flex: 1,
            justifyContent: 'center',
            paddingHorizontal: spacing.xl,
        },
        heroCard: {
            borderRadius: borderRadius.xl,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surfaceCard,
            padding: spacing.xl,
            overflow: 'hidden',
        },
        heroGlow: {
            position: 'absolute',
            width: 260,
            height: 180,
            right: -90,
            top: -50,
            borderRadius: 160,
        },
        heroTopRow: {
            flexDirection: 'row',
            alignItems: 'flex-start',
        },
        heroIconWrap: {
            width: 54,
            height: 54,
            borderRadius: 27,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            marginRight: spacing.base,
        },
        heroHeading: {
            flex: 1,
        },
        heroEyebrow: {
            color: colors.textSecondary,
            textTransform: 'uppercase',
            letterSpacing: 0.8,
            fontWeight: typography.fontWeight.semibold,
        },
        heroTitle: {
            color: colors.textPrimary,
            fontWeight: typography.fontWeight.bold,
            marginTop: spacing.sm,
        },
        heroDateRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.xs,
            marginTop: spacing.sm,
        },
        heroDateText: {
            color: colors.textMuted,
            flexShrink: 1,
        },
        ringWrap: {
            alignItems: 'center',
            marginTop: spacing.xl,
        },
        ringPercent: {
            color: colors.textPrimary,
            fontWeight: typography.fontWeight.extrabold,
        },
        ringLabel: {
            color: colors.textSecondary,
            marginTop: spacing.xs,
        },
        heroAmount: {
            color: colors.textPrimary,
            fontWeight: typography.fontWeight.extrabold,
            marginTop: spacing.lg,
            textAlign: 'center',
        },
        progressMetaRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            gap: spacing.base,
            marginTop: spacing.sm,
        },
        progressMeta: {
            color: colors.textSecondary,
            flex: 1,
        },
        heroActionsRow: {
            flexDirection: 'row',
            gap: spacing.sm,
            marginTop: spacing.lg,
        },
        heroActionButton: {
            flex: 1,
        },
        metricsRow: {
            flexDirection: 'row',
            gap: spacing.base,
            marginTop: spacing.base,
        },
        metricCard: {
            flex: 1,
            borderRadius: borderRadius.lg,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surfaceCard,
            padding: spacing.base,
        },
        metricLabel: {
            color: colors.textMuted,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            fontWeight: typography.fontWeight.medium,
            marginBottom: spacing.xs,
        },
        metricValue: {
            color: colors.textPrimary,
            fontWeight: typography.fontWeight.bold,
        },
        metaGrid: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: spacing.base,
            marginTop: spacing.base,
        },
        metaCard: {
            flex: 1,
            minWidth: 140,
            borderRadius: borderRadius.lg,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surfaceCard,
            padding: spacing.base,
        },
        metaLabel: {
            color: colors.textMuted,
            marginBottom: spacing.xs,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            fontWeight: typography.fontWeight.medium,
        },
        metaValue: {
            color: colors.textPrimary,
            fontWeight: typography.fontWeight.semibold,
        },
        manageActionButton: {
            marginTop: spacing.base,
            borderRadius: borderRadius.lg,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surfaceCard,
            paddingHorizontal: spacing.base,
            paddingVertical: spacing.base,
        },
        manageDeleteButton: {
            borderColor: 'rgba(239, 68, 68, 0.24)',
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
        },
        manageActionDisabled: {
            opacity: 0.6,
        },
        manageActionContent: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
        },
        manageActionText: {
            fontWeight: typography.fontWeight.semibold,
        },
        sectionHeader: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginTop: spacing.xl,
            marginBottom: spacing.base,
            gap: spacing.base,
        },
        sectionTitle: {
            color: colors.textPrimary,
            fontWeight: typography.fontWeight.bold,
        },
        sectionSubtitle: {
            color: colors.textSecondary,
            marginTop: spacing.xs,
        },
        helperCard: {
            borderRadius: borderRadius.lg,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surfaceCard,
            padding: spacing.base,
        },
        helperText: {
            color: colors.textSecondary,
        },
        inlineErrorCard: {
            borderRadius: borderRadius.lg,
            borderWidth: 1,
            borderColor: 'rgba(239, 68, 68, 0.28)',
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            padding: spacing.base,
            marginBottom: spacing.base,
        },
        inlineErrorText: {
            color: colors.textPrimary,
        },
        emptyCard: {
            borderRadius: borderRadius.xl,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surfaceCard,
            paddingVertical: spacing.xl,
            paddingHorizontal: spacing.base,
        },
        emptyAction: {
            marginHorizontal: spacing.base,
        },
        transactionsList: {
            gap: spacing.base,
        },
    });
