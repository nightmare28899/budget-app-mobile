import React, { useEffect, useMemo, useState } from 'react';
import {
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';
import { AnimatedScreen } from '../../components/ui/primitives/AnimatedScreen';
import { Button } from '../../components/ui/primitives/Button';
import { EmptyState } from '../../components/ui/primitives/EmptyState';
import { ScreenBackButton } from '../../components/ui/primitives/ScreenBackButton';
import { Skeleton } from '../../components/ui/primitives/Skeleton';
import { SavingsFundsModal } from '../../components/savings/SavingsFundsModal';
import { SavingsGoalCard } from '../../components/savings/SavingsGoalCard';
import { SavingsGoalFormModal } from '../../components/savings/SavingsGoalFormModal';
import { useI18n } from '../../hooks/useI18n';
import { MainDrawerScreenProps } from '../../navigation/types';
import { useSavingsStore } from '../../store/savingsStore';
import {
    borderRadius,
    spacing,
    typography,
    useResponsive,
    useThemedStyles,
    SemanticColors,
} from '../../theme/index';
import { CreateSavingsGoalPayload, SavingsGoal } from '../../types/index';
import { formatCurrency } from '../../utils/core/format';
import { API_BASE_URL } from '../../utils/core/constants';
import {
    getRemainingSavings,
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

function SavingsGoalsSkeleton() {
    return (
        <View style={stylesSkeleton.block}>
            <Skeleton width="100%" height={164} radius={24} />
            <Skeleton width="100%" height={164} radius={24} style={stylesSkeleton.item} />
            <Skeleton width="100%" height={164} radius={24} style={stylesSkeleton.item} />
        </View>
    );
}

const stylesSkeleton = StyleSheet.create({
    block: {
        width: '100%',
    },
    item: {
        marginTop: spacing.base,
    },
});

const HEADER_ROW_MIN_HEIGHT = 56;
const HEADER_VERTICAL_PADDING = spacing.base;
const HEADER_OFFSET = HEADER_ROW_MIN_HEIGHT + HEADER_VERTICAL_PADDING * 2;

export function SavingsScreen({
    navigation,
}: MainDrawerScreenProps<'Savings'>) {
    const insets = useSafeAreaInsets();
    const styles = useThemedStyles(createStyles);
    const {
        horizontalPadding,
        contentMaxWidth,
        scaleFont,
    } = useResponsive();
    const { t } = useI18n();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedGoalForFunds, setSelectedGoalForFunds] = useState<SavingsGoal | null>(null);
    const {
        goals,
        isLoadingGoals,
        isCreatingGoal,
        isAddingFunds,
        isWithdrawingFunds,
        errors,
        fetchGoals,
        createGoal,
        addFunds,
        clearError,
    } = useSavingsStore(useShallow((state) => ({
        goals: state.goals,
        isLoadingGoals: state.isLoadingGoals,
        isCreatingGoal: state.isCreatingGoal,
        isAddingFunds: state.isAddingFunds,
        isWithdrawingFunds: state.isWithdrawingFunds,
        errors: state.errors,
        fetchGoals: state.fetchGoals,
        createGoal: state.createGoal,
        addFunds: state.addFunds,
        clearError: state.clearError,
    })));

    useEffect(() => {
        if (goals.length > 0) {
            return;
        }

        fetchGoals().catch(() => undefined);
    }, [fetchGoals, goals.length]);

    const summary = useMemo(() => {
        const totalSaved = goals.reduce((sum, goal) => sum + goal.currentAmount, 0);
        const totalTarget = goals.reduce((sum, goal) => sum + goal.targetAmount, 0);
        const totalRemaining = Math.max(totalTarget - totalSaved, 0);
        const overallProgress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;
        const activeGoals = goals.filter((goal) => goal.currentAmount < goal.targetAmount).length;

        return {
            totalSaved,
            totalTarget,
            totalRemaining,
            overallProgress: Math.min(100, Math.max(0, overallProgress)),
            activeGoals,
        };
    }, [goals]);
    const goalsCountLabel = t(
        goals.length === 1 ? 'savings.goalsCount.one' : 'savings.goalsCount.other',
        { count: goals.length },
    );

    const constrainedContentStyle = contentMaxWidth
        ? { maxWidth: contentMaxWidth, alignSelf: 'center' as const, width: '100%' as const }
        : null;

    const goalsErrorMessage = resolveActionErrorMessage(
        errors.loadGoals,
        t('savings.loadGoalsError'),
        t('network.cannotReachApi', { baseUrl: API_BASE_URL }),
    );
    const createGoalErrorMessage = errors.createGoal
        ? resolveActionErrorMessage(
            errors.createGoal,
            t('savings.failedCreateGoal'),
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
    const handleBackPress = () => {
        if (navigation.canGoBack()) {
            navigation.goBack();
            return;
        }

        navigation.navigate('Tabs', { screen: 'Dashboard' });
    };

    const openCreateModal = () => {
        clearError('createGoal');
        setShowCreateModal(true);
    };

    const openFundsModal = (goal: SavingsGoal) => {
        clearError('addFunds');
        setSelectedGoalForFunds(goal);
    };

    const handleCreateGoal = async (payload: CreateSavingsGoalPayload) => {
        try {
            await createGoal(payload);
            setShowCreateModal(false);
        } catch (error) {
            console.error('Failed to create goal', error);
        }
    };

    const handleAddFunds = async (payload: { amount: number }) => {
        if (!selectedGoalForFunds) {
            return;
        }

        try {
            await addFunds(selectedGoalForFunds.id, payload);
            setSelectedGoalForFunds(null);
        } catch (error) {
            console.error('Failed to add funds', error);
        }
    };

    return (
        <View style={styles.container}>
            <AnimatedScreen style={styles.flex1} delay={12} duration={240} travelY={8}>
                <View
                    style={[
                        styles.fixedHeader,
                        {
                            paddingTop: insets.top + HEADER_VERTICAL_PADDING,
                            paddingBottom: HEADER_VERTICAL_PADDING,
                            paddingHorizontal: horizontalPadding,
                        },
                    ]}
                >
                    <View style={styles.headerRow}>
                        <ScreenBackButton
                            onPress={handleBackPress}
                            containerStyle={styles.backButton}
                        />
                        <View style={styles.headerCopy}>
                            <Text
                                style={[
                                    styles.headerTitle,
                                    { fontSize: scaleFont(typography.fontSize['3xl']) },
                                ]}
                            >
                                {t('savings.title')}
                            </Text>
                            <Text
                                style={[
                                    styles.headerSubtitle,
                                    { fontSize: scaleFont(typography.fontSize.md) },
                                ]}
                            >
                                {t('savings.subtitle')}
                            </Text>
                        </View>
                    </View>
                </View>

                <ScrollView
                    contentContainerStyle={[
                        styles.content,
                        {
                            paddingTop: insets.top + HEADER_OFFSET + spacing.lg + 20,
                            paddingHorizontal: horizontalPadding,
                            paddingBottom: insets.bottom + spacing['3xl'],
                        },
                        constrainedContentStyle,
                    ]}
                    refreshControl={
                        <RefreshControl
                            refreshing={isLoadingGoals}
                            onRefresh={() => {
                                fetchGoals().catch(() => undefined);
                            }}
                        />
                    }
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.summaryCard}>
                        <View style={styles.summaryHeader}>
                            <View style={styles.summaryCopy}>
                                <Text
                                    style={[
                                        styles.summaryLabel,
                                        { fontSize: scaleFont(typography.fontSize.sm) },
                                    ]}
                                >
                                    {t('savings.totalSavedLabel')}
                                </Text>
                                <Text
                                    style={[
                                        styles.summaryValue,
                                        { fontSize: scaleFont(typography.fontSize['4xl']) },
                                    ]}
                                >
                                    {formatCurrency(summary.totalSaved, 'MXN')}
                                </Text>
                            </View>
                            <View style={styles.summaryChip}>
                                <Text
                                    style={[
                                        styles.summaryChipText,
                                        { fontSize: scaleFont(typography.fontSize.xs) },
                                    ]}
                                >
                                    {`${summary.activeGoals} ${t('savings.activeGoalsLabel')}`}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.summaryProgressBlock}>
                            <View style={styles.summaryProgressRow}>
                                <Text
                                    style={[
                                        styles.summaryProgressLabel,
                                        { fontSize: scaleFont(typography.fontSize.sm) },
                                    ]}
                                >
                                    {t('savings.overallProgressLabel')}
                                </Text>
                                <Text
                                    style={[
                                        styles.summaryProgressValue,
                                        { fontSize: scaleFont(typography.fontSize.sm) },
                                    ]}
                                >
                                    {`${Math.round(summary.overallProgress)}%`}
                                </Text>
                            </View>

                            <View style={styles.summaryProgressTrack}>
                                <View
                                    style={[
                                        styles.summaryProgressFill,
                                        { width: `${Math.round(summary.overallProgress)}%` },
                                    ]}
                                />
                            </View>
                        </View>

                        <View style={styles.summaryStatsRow}>
                            <View style={styles.summaryStatItem}>
                                <Text
                                    style={[
                                        styles.summaryStatLabel,
                                        { fontSize: scaleFont(typography.fontSize.xs) },
                                    ]}
                                >
                                    {t('savings.targetAmountLabel')}
                                </Text>
                                <Text
                                    style={[
                                        styles.summaryStatValue,
                                        { fontSize: scaleFont(typography.fontSize.base) },
                                    ]}
                                >
                                    {formatCurrency(summary.totalTarget, 'MXN')}
                                </Text>
                            </View>
                            <View style={styles.summaryStatDivider} />
                            <View style={styles.summaryStatItem}>
                                <Text
                                    style={[
                                        styles.summaryStatLabel,
                                        { fontSize: scaleFont(typography.fontSize.xs) },
                                    ]}
                                >
                                    {t('savings.remainingAmountLabel')}
                                </Text>
                                <Text
                                    style={[
                                        styles.summaryStatValue,
                                        { fontSize: scaleFont(typography.fontSize.base) },
                                    ]}
                                >
                                    {formatCurrency(summary.totalRemaining, 'MXN')}
                                </Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionCopy}>
                            <Text
                                style={[
                                    styles.sectionTitle,
                                    { fontSize: scaleFont(typography.fontSize.lg) },
                                ]}
                            >
                                {t('savings.goalsSectionTitle')}
                            </Text>
                            <Text
                                style={[
                                    styles.sectionSubtitle,
                                    { fontSize: scaleFont(typography.fontSize.sm) },
                                ]}
                            >
                                {t('savings.goalsSectionSubtitle')}
                            </Text>
                        </View>
                        {goals.length > 0 ? (
                            <View style={styles.sectionCountPill}>
                                <Text
                                    style={[
                                        styles.sectionCountText,
                                        { fontSize: scaleFont(typography.fontSize.xs) },
                                    ]}
                                >
                                    {goalsCountLabel}
                                </Text>
                            </View>
                        ) : null}
                    </View>

                    {errors.loadGoals && goals.length > 0 ? (
                        <View style={styles.errorBanner}>
                            <Text
                                style={[
                                    styles.errorBannerText,
                                    { fontSize: scaleFont(typography.fontSize.sm) },
                                ]}
                            >
                                {goalsErrorMessage}
                            </Text>
                            <Button
                                title={t('common.retry')}
                                variant="secondary"
                                onPress={() => {
                                    fetchGoals().catch(() => undefined);
                                }}
                                containerStyle={styles.errorBannerButton}
                            />
                        </View>
                    ) : null}

                    {isLoadingGoals && goals.length === 0 ? (
                        <SavingsGoalsSkeleton />
                    ) : goals.length === 0 ? (
                        <View style={styles.emptyBlock}>
                            <EmptyState
                                icon="wallet-outline"
                                title={
                                    errors.loadGoals
                                        ? t('common.error')
                                        : t('savings.emptyTitle')
                                }
                                description={
                                    errors.loadGoals
                                        ? goalsErrorMessage
                                        : t('savings.emptyDescription')
                                }
                            />
                            <Button
                                title={
                                    errors.loadGoals
                                        ? t('common.retry')
                                        : t('savings.createGoalAction')
                                }
                                onPress={() => {
                                    if (errors.loadGoals) {
                                        fetchGoals().catch(() => undefined);
                                        return;
                                    }

                                    openCreateModal();
                                }}
                                containerStyle={styles.emptyButton}
                            />
                        </View>
                    ) : (
                        <View style={styles.goalsList}>
                            {goals.map((goal) => (
                                <SavingsGoalCard
                                    key={goal.id}
                                    goal={goal}
                                    onPress={() =>
                                        navigation.navigate('SavingsGoalDetail', {
                                            goalId: goal.id,
                                            title: goal.title,
                                        })
                                    }
                                    onAddFunds={() => openFundsModal(goal)}
                                    disabled={isAddingFunds || isWithdrawingFunds}
                                />
                            ))}
                        </View>
                    )}

                    {goals.length > 0 ? (
                        <View style={styles.footerActionWrap}>
                            <View style={styles.footerActionCard}>
                                <Button
                                    title={t('savings.newGoalAction')}
                                    onPress={openCreateModal}
                                />
                            </View>
                        </View>
                    ) : null}
                </ScrollView>
            </AnimatedScreen>

            <SavingsGoalFormModal
                visible={showCreateModal}
                loading={isCreatingGoal}
                errorMessage={createGoalErrorMessage}
                onClose={() => setShowCreateModal(false)}
                onSubmit={handleCreateGoal}
            />

            <SavingsFundsModal
                visible={!!selectedGoalForFunds}
                goalTitle={selectedGoalForFunds?.title ?? ''}
                currentAmount={selectedGoalForFunds?.currentAmount ?? 0}
                remainingAmount={
                    selectedGoalForFunds
                        ? getRemainingSavings(selectedGoalForFunds)
                        : 0
                }
                loading={isAddingFunds}
                errorMessage={addFundsErrorMessage}
                accentColor={selectedGoalForFunds?.color}
                onClose={() => setSelectedGoalForFunds(null)}
                onSubmit={handleAddFunds}
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
            gap: spacing.lg,
        },
        fixedHeader: {
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
            zIndex: 10,
        },
        headerRow: {
            minHeight: HEADER_ROW_MIN_HEIGHT,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.base,
        },
        backButton: {
            marginRight: spacing.sm,
        },
        headerCopy: {
            flex: 1,
            marginRight: spacing.base,
        },
        headerTitle: {
            color: colors.textPrimary,
            fontWeight: typography.fontWeight.bold,
        },
        headerSubtitle: {
            color: colors.textSecondary,
            marginTop: spacing.xs,
        },
        summaryCard: {
            borderRadius: borderRadius.xl,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surfaceCard,
            padding: spacing.lg,
        },
        summaryHeader: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: spacing.base,
        },
        summaryCopy: {
            flex: 1,
        },
        summaryLabel: {
            color: colors.textSecondary,
            fontWeight: typography.fontWeight.semibold,
        },
        summaryValue: {
            color: colors.textPrimary,
            fontWeight: typography.fontWeight.extrabold,
            marginTop: spacing.xs,
        },
        summaryChip: {
            borderRadius: borderRadius.full,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surfaceElevated,
            paddingHorizontal: spacing.base,
            paddingVertical: spacing.xs + 2,
        },
        summaryChipText: {
            color: colors.textSecondary,
            fontWeight: typography.fontWeight.semibold,
        },
        summaryProgressBlock: {
            marginTop: spacing.lg,
        },
        summaryProgressRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: spacing.sm,
        },
        summaryProgressLabel: {
            color: colors.textSecondary,
        },
        summaryProgressValue: {
            color: colors.textPrimary,
            fontWeight: typography.fontWeight.semibold,
        },
        summaryProgressTrack: {
            height: 8,
            borderRadius: borderRadius.full,
            backgroundColor: colors.surfaceElevated,
            overflow: 'hidden',
        },
        summaryProgressFill: {
            height: '100%',
            borderRadius: borderRadius.full,
            backgroundColor: colors.success,
        },
        summaryStatsRow: {
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: spacing.lg,
        },
        summaryStatItem: {
            flex: 1,
            minHeight: 48,
        },
        summaryStatLabel: {
            color: colors.textMuted,
            fontWeight: typography.fontWeight.medium,
            marginBottom: spacing.xs,
        },
        summaryStatValue: {
            color: colors.textPrimary,
            fontWeight: typography.fontWeight.bold,
        },
        summaryStatDivider: {
            width: 1,
            alignSelf: 'stretch',
            backgroundColor: colors.border,
            marginHorizontal: spacing.base,
        },
        sectionHeader: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: spacing.base,
        },
        sectionCopy: {
            flex: 1,
        },
        sectionTitle: {
            color: colors.textPrimary,
            fontWeight: typography.fontWeight.semibold,
        },
        sectionSubtitle: {
            color: colors.textSecondary,
            marginTop: spacing.xs,
        },
        sectionCountPill: {
            borderRadius: borderRadius.full,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surfaceElevated,
            paddingHorizontal: spacing.base,
            paddingVertical: spacing.xs + 2,
        },
        sectionCountText: {
            color: colors.textSecondary,
            fontWeight: typography.fontWeight.medium,
        },
        goalsList: {
            gap: spacing.base,
        },
        emptyBlock: {
            borderRadius: borderRadius.xl,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surfaceCard,
            paddingVertical: spacing.xl,
            paddingHorizontal: spacing.base,
        },
        emptyButton: {
            marginHorizontal: spacing.base,
        },
        errorBanner: {
            borderRadius: borderRadius.xl,
            borderWidth: 1,
            borderColor: 'rgba(239, 68, 68, 0.28)',
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            padding: spacing.base,
            marginBottom: spacing.base,
        },
        errorBannerText: {
            color: colors.textPrimary,
        },
        errorBannerButton: {
            marginTop: spacing.sm,
            alignSelf: 'flex-start',
        },
        footerActionWrap: {
            marginTop: spacing.sm,
        },
        footerActionCard: {
            borderRadius: borderRadius['2xl'],
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            padding: spacing.sm,
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.14,
            shadowRadius: 14,
            elevation: 8,
        },
    });
