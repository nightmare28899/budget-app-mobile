import React from 'react';
import {
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { DrawerActions } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { analyticsApi } from '../../api/resources/analytics';
import { categoriesApi } from '../../api/resources/categories';
import { useAppAlert } from '../../components/alerts/AlertProvider';
import { CategoryIcon } from '../../components/CategoryIcon';
import { AnimatedScreen } from '../../components/ui/primitives/AnimatedScreen';
import { Button } from '../../components/ui/primitives/Button';
import { EmptyState } from '../../components/ui/primitives/EmptyState';
import { HomeBackground } from '../../components/ui/layout/HomeBackground';
import { Input } from '../../components/ui/primitives/Input';
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
    SemanticColors,
} from '../../theme/index';
import type { CategoryBudgetStatus } from '../../types/index';
import { budgetLabel } from '../../utils/domain/budget';
import { formatCurrency, formatDate } from '../../utils/core/format';
import { getCurrencyLocale } from '../../utils/domain/currency';
import { withAlpha } from '../../utils/domain/subscriptions';
import {
    MAX_COST_LABEL,
    MAX_COST_VALUE,
    sanitizeMoneyInput,
} from '../../utils/platform/moneyInput';

function buildRangeLabel(start?: string | null, end?: string | null) {
    if (!start || !end) {
        return '';
    }

    return `${formatDate(start, 'MMM D')} - ${formatDate(end, 'MMM D')}`;
}

function formatBudgetInput(value: number) {
    if (!Number.isFinite(value) || value <= 0) {
        return '';
    }

    return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

export function CategoryBudgetsScreen({
    navigation,
}: MainDrawerScreenProps<'CategoryBudgets'>) {
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);
    const insets = useSafeAreaInsets();
    const queryClient = useQueryClient();
    const { alert } = useAppAlert();
    const {
        horizontalPadding,
        contentMaxWidth,
        modalMaxWidth,
        isSmallPhone,
        scaleFont,
        scaleSize,
    } = useResponsive();
    const { t, language } = useI18n();
    const user = useAuthStore((state) => state.user);
    const locale = getCurrencyLocale(language);
    const [selectedItem, setSelectedItem] = React.useState<CategoryBudgetStatus | null>(null);
    const [budgetValue, setBudgetValue] = React.useState('');
    const [budgetError, setBudgetError] = React.useState<string | undefined>();

    const {
        data: overview,
        isLoading,
        isRefetching,
        error,
        refetch,
    } = useQuery({
        queryKey: ['analytics', 'category-budgets', 'screen'],
        queryFn: () => analyticsApi.getCategoryBudgetOverview(),
        staleTime: 30_000,
    });

    const updateMutation = useMutation({
        mutationFn: async (params: { id: string; budgetAmount: number }) =>
            categoriesApi.update(params.id, { budgetAmount: params.budgetAmount }),
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['categories'] }),
                queryClient.invalidateQueries({ queryKey: ['analytics'] }),
            ]);
            setSelectedItem(null);
            setBudgetValue('');
            setBudgetError(undefined);
        },
        onError: () => {
            alert(t('common.error'), t('categoryBudgets.failedUpdate'));
        },
    });

    const constrainedContentStyle = contentMaxWidth
        ? { maxWidth: contentMaxWidth, alignSelf: 'center' as const, width: '100%' as const }
        : null;
    const periodLabel = overview?.period?.type
        ? budgetLabel(overview.period.type, t)
        : t('common.notAvailable');
    const rangeLabel = buildRangeLabel(overview?.period?.start, overview?.period?.end);
    const onOpenSidebar = () => {
        navigation.dispatch(DrawerActions.openDrawer());
    };
    const onEditBudget = (item: CategoryBudgetStatus) => {
        setSelectedItem(item);
        setBudgetValue(formatBudgetInput(item.budgetAmount));
        setBudgetError(undefined);
    };
    const onCloseModal = () => {
        if (updateMutation.isPending) {
            return;
        }
        setSelectedItem(null);
        setBudgetValue('');
        setBudgetError(undefined);
    };
    const onSubmitBudget = () => {
        if (!selectedItem) {
            return;
        }

        const normalized = budgetValue.replace(',', '.').trim();
        const nextAmount = Number.parseFloat(normalized);
        if (!normalized.length || Number.isNaN(nextAmount) || nextAmount < 0) {
            setBudgetError(t('categoryBudgets.validationAmount'));
            return;
        }
        if (nextAmount > MAX_COST_VALUE) {
            setBudgetError(t('common.maxAmountExceeded', { max: MAX_COST_LABEL }));
            return;
        }

        setBudgetError(undefined);
        updateMutation.mutate({
            id: selectedItem.categoryId,
            budgetAmount: Math.round(nextAmount * 100) / 100,
        });
    };
    const onRemoveBudget = () => {
        if (!selectedItem) {
            return;
        }

        setBudgetError(undefined);
        updateMutation.mutate({
            id: selectedItem.categoryId,
            budgetAmount: 0,
        });
    };

    const summaryCards = [
        {
            key: 'planned',
            label: t('categoryBudgets.summaryPlanned'),
            value: String(overview?.categoriesWithBudget ?? 0),
        },
        {
            key: 'watch',
            label: t('categoryBudgets.summaryWatch'),
            value: String((overview?.watchCount ?? 0) + (overview?.overBudgetCount ?? 0)),
        },
        {
            key: 'remaining',
            label: t('categoryBudgets.summaryRemaining'),
            value: formatCurrency(overview?.totalRemaining ?? 0, user?.currency, locale),
        },
    ];

    return (
        <View style={styles.container}>
            <HomeBackground />
            <AnimatedScreen style={styles.flex1} delay={8} duration={200} travelY={6}>
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
                            refreshing={isRefetching || isLoading}
                            onRefresh={refetch}
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
                                    {t('categoryBudgets.title')}
                                </Text>
                                <Text style={[styles.headerSubtitle, { fontSize: scaleFont(typography.fontSize.md) }]}>
                                    {t('categoryBudgets.subtitle')}
                                </Text>
                            </View>
                        </View>
                    </View>

                    <View
                        style={[
                            styles.summaryCard,
                            {
                                padding: isSmallPhone
                                    ? scaleSize(spacing.lg, 0.45)
                                    : scaleSize(spacing.xl, 0.45),
                            },
                        ]}
                    >
                        <View style={styles.summaryGlow} />
                        <Text style={[styles.summaryEyebrow, { fontSize: scaleFont(typography.fontSize.xs) }]}>
                            {t('categoryBudgets.currentPeriod')}
                        </Text>
                        <Text style={[styles.summaryTitle, { fontSize: scaleFont(typography.fontSize.xl) }]}>
                            {periodLabel}
                        </Text>
                        <Text style={[styles.summarySubtitle, { fontSize: scaleFont(typography.fontSize.sm) }]}>
                            {t('categoryBudgets.periodHint', { range: rangeLabel || t('common.notAvailable') })}
                        </Text>
                        <View style={styles.summaryMetaRow}>
                            {summaryCards.map((item) => (
                                <View key={item.key} style={styles.summaryMetaItem}>
                                    <Text style={[styles.summaryMetaLabel, { fontSize: scaleFont(typography.fontSize.xs) }]}>
                                        {item.label}
                                    </Text>
                                    <Text style={[styles.summaryMetaValue, { fontSize: scaleFont(typography.fontSize.base) }]}>
                                        {item.value}
                                    </Text>
                                </View>
                            ))}
                        </View>
                        <Text style={[styles.summaryTotals, { fontSize: scaleFont(typography.fontSize.sm) }]}>
                            {t('categoryBudgets.summaryTotals', {
                                planned: formatCurrency(overview?.totalBudgeted ?? 0, user?.currency, locale),
                                spent: formatCurrency(overview?.totalSpentBudgeted ?? 0, user?.currency, locale),
                            })}
                        </Text>
                    </View>

                    {error && !(overview?.items?.length) ? (
                        <View style={styles.emptyBlock}>
                            <EmptyState
                                icon="alert-circle-outline"
                                title={t('common.error')}
                                description={t('categoryBudgets.loadError')}
                            />
                            <Button
                                title={t('common.retry')}
                                onPress={() => {
                                    refetch();
                                }}
                                containerStyle={styles.emptyButton}
                            />
                        </View>
                    ) : !(overview?.items?.length) && !isLoading ? (
                        <View style={styles.emptyBlock}>
                            <EmptyState
                                icon="pie-chart-outline"
                                title={t('categoryBudgets.emptyTitle')}
                                description={t('categoryBudgets.emptyDescription')}
                            />
                        </View>
                    ) : (
                        <View style={styles.listBlock}>
                            <View style={styles.sectionHeader}>
                                <Text style={[styles.sectionTitle, { fontSize: scaleFont(typography.fontSize.lg) }]}>
                                    {t('categoryBudgets.sectionTitle')}
                                </Text>
                                <Text style={[styles.sectionMeta, { fontSize: scaleFont(typography.fontSize.sm) }]}>
                                    {t('categoryBudgets.sectionMeta', {
                                        count: overview?.items?.length ?? 0,
                                    })}
                                </Text>
                            </View>

                            {overview?.items?.map((item, index) => {
                                const itemCount = overview?.items?.length ?? 0;
                                const isOffTrack = item.status === 'off_track';
                                const isWatch = item.status === 'watch';
                                const progress = item.budgetAmount > 0
                                    ? Math.min(item.spent / item.budgetAmount, 1)
                                    : 0;
                                const fillColor = isOffTrack
                                    ? colors.error
                                    : isWatch
                                        ? colors.warning
                                        : colors.success;
                                const chipBackground = item.budgetAmount > 0
                                    ? withAlpha(fillColor, 0.16)
                                    : withAlpha(colors.textMuted, 0.14);
                                const chipColor = item.budgetAmount > 0 ? fillColor : colors.textMuted;
                                const iconBackground = withAlpha(item.color || colors.primaryAction, 0.16);
                                const formattedSpent = formatCurrency(item.spent, user?.currency, locale);
                                const formattedBudget = formatCurrency(item.budgetAmount, user?.currency, locale);
                                const formattedRemaining = formatCurrency(item.remaining, user?.currency, locale);

                                return (
                                    <View
                                        key={item.categoryId}
                                        style={[styles.categoryCard, index < (itemCount - 1) ? styles.cardSpacing : null]}
                                    >
                                        <View style={styles.categoryHeader}>
                                            <View style={styles.categoryLeading}>
                                                <View style={[styles.categoryIconWrap, { backgroundColor: iconBackground }]}>
                                                    <CategoryIcon
                                                        icon={item.icon}
                                                        categoryName={item.name}
                                                        size={18}
                                                        color={item.color || colors.primaryAction}
                                                    />
                                                </View>
                                                <View style={styles.categoryCopy}>
                                                    <Text
                                                        style={[styles.categoryTitle, { fontSize: scaleFont(typography.fontSize.base) }]}
                                                        numberOfLines={1}
                                                    >
                                                        {item.name}
                                                    </Text>
                                                    <Text
                                                        style={[styles.categoryMeta, { fontSize: scaleFont(typography.fontSize.sm) }]}
                                                        numberOfLines={2}
                                                    >
                                                        {item.budgetAmount > 0
                                                            ? t('categoryBudgets.spentOfLimit', {
                                                                spent: formattedSpent,
                                                                limit: formattedBudget,
                                                            })
                                                            : item.spent > 0
                                                                ? t('categoryBudgets.noBudgetSpent', {
                                                                    spent: formattedSpent,
                                                                })
                                                                : t('categoryBudgets.noBudgetSet')}
                                                    </Text>
                                                </View>
                                            </View>

                                            <TouchableOpacity
                                                activeOpacity={0.84}
                                                style={styles.editButton}
                                                onPress={() => onEditBudget(item)}
                                            >
                                                <Text style={[styles.editButtonText, { fontSize: scaleFont(typography.fontSize.sm) }]}>
                                                    {item.budgetAmount > 0 ? t('common.edit') : t('categoryBudgets.setBudget')}
                                                </Text>
                                            </TouchableOpacity>
                                        </View>

                                        <View style={styles.progressTrack}>
                                            <View
                                                style={[
                                                    styles.progressFill,
                                                    {
                                                        width: `${Math.max(0, Math.min(progress, 1)) * 100}%`,
                                                        backgroundColor: fillColor,
                                                    },
                                                ]}
                                            />
                                        </View>

                                        <View style={styles.categoryFooter}>
                                            <View
                                                style={[
                                                    styles.statusChip,
                                                    { backgroundColor: chipBackground },
                                                ]}
                                            >
                                                <Text
                                                    style={[
                                                        styles.statusChipText,
                                                        {
                                                            color: chipColor,
                                                            fontSize: scaleFont(typography.fontSize.xs),
                                                        },
                                                    ]}
                                                >
                                                    {item.status === 'off_track'
                                                        ? t('categoryBudgets.statusOffTrack')
                                                        : item.status === 'watch'
                                                            ? t('categoryBudgets.statusWatch')
                                                            : item.status === 'on_track'
                                                                ? t('categoryBudgets.statusOnTrack')
                                                                : t('categoryBudgets.statusNoBudget')}
                                                </Text>
                                            </View>

                                            <Text
                                                style={[
                                                    styles.categoryFooterText,
                                                    { fontSize: scaleFont(typography.fontSize.xs) },
                                                ]}
                                            >
                                                {item.budgetAmount > 0
                                                    ? t('categoryBudgets.remainingLabel', {
                                                        amount: formattedRemaining,
                                                    })
                                                    : t('categoryBudgets.expenseCountLabel', {
                                                        count: item.expenseCount,
                                                    })}
                                            </Text>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    )}
                </ScrollView>
            </AnimatedScreen>

            <Modal
                animationType="fade"
                transparent
                visible={!!selectedItem}
                onRequestClose={onCloseModal}
            >
                <View style={styles.modalBackdrop}>
                    <View style={[styles.modalCard, { maxWidth: modalMaxWidth }]}>
                        <Text style={[styles.modalTitle, { fontSize: scaleFont(typography.fontSize.xl) }]}>
                            {selectedItem
                                ? t('categoryBudgets.modalTitle', { name: selectedItem.name })
                                : t('categoryBudgets.title')}
                        </Text>
                        <Text style={[styles.modalSubtitle, { fontSize: scaleFont(typography.fontSize.sm) }]}>
                            {t('categoryBudgets.modalSubtitle', { period: periodLabel.toLowerCase() })}
                        </Text>

                        <Input
                            label={t('categoryBudgets.inputLabel')}
                            value={budgetValue}
                            onChangeText={(value) => {
                                setBudgetValue(sanitizeMoneyInput(value));
                                if (budgetError) {
                                    setBudgetError(undefined);
                                }
                            }}
                            keyboardType="decimal-pad"
                            autoFocus
                            placeholder={t('common.amountPlaceholder')}
                            error={budgetError}
                        />

                        <View style={styles.modalActions}>
                            <Button
                                title={t('common.cancel')}
                                variant="ghost"
                                onPress={onCloseModal}
                                disabled={updateMutation.isPending}
                            />
                            {!!selectedItem?.budgetAmount && (
                                <Button
                                    title={t('categoryBudgets.removeBudget')}
                                    variant="danger"
                                    onPress={onRemoveBudget}
                                    loading={updateMutation.isPending}
                                    containerStyle={styles.removeButton}
                                />
                            )}
                            <Button
                                title={t('common.save')}
                                onPress={onSubmitBudget}
                                loading={updateMutation.isPending}
                                containerStyle={styles.saveButton}
                            />
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.surface,
    },
    flex1: {
        flex: 1,
    },
    content: {
        gap: spacing.lg,
    },
    headerBlock: {
        gap: spacing.sm,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.base,
    },
    menuButton: {
        width: 42,
        height: 42,
        borderRadius: borderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: withAlpha(colors.surfaceElevated, 0.9),
        borderWidth: 1,
        borderColor: withAlpha(colors.border, 0.9),
    },
    headerCopy: {
        flex: 1,
        gap: 4,
    },
    headerTitle: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.bold,
    },
    headerSubtitle: {
        color: colors.textSecondary,
    },
    summaryCard: {
        borderRadius: borderRadius.xl,
        backgroundColor: withAlpha(colors.surfaceCard, 0.92),
        borderWidth: 1,
        borderColor: withAlpha(colors.border, 0.9),
        overflow: 'hidden',
        gap: spacing.base,
    },
    summaryGlow: {
        position: 'absolute',
        top: -42,
        right: -28,
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: withAlpha(colors.primaryAction, 0.12),
    },
    summaryEyebrow: {
        color: colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        fontWeight: typography.fontWeight.semibold,
    },
    summaryTitle: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.bold,
    },
    summarySubtitle: {
        color: colors.textSecondary,
    },
    summaryMetaRow: {
        flexDirection: 'row',
        gap: spacing.base,
    },
    summaryMetaItem: {
        flex: 1,
        borderRadius: borderRadius.lg,
        padding: spacing.base,
        backgroundColor: withAlpha(colors.surfaceElevated, 0.92),
        borderWidth: 1,
        borderColor: withAlpha(colors.border, 0.7),
        gap: 6,
    },
    summaryMetaLabel: {
        color: colors.textMuted,
        fontWeight: typography.fontWeight.medium,
    },
    summaryMetaValue: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.bold,
    },
    summaryTotals: {
        color: colors.textSecondary,
    },
    emptyBlock: {
        paddingVertical: spacing['3xl'],
    },
    emptyButton: {
        marginTop: spacing.lg,
    },
    listBlock: {
        gap: spacing.base,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: spacing.base,
    },
    sectionTitle: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.bold,
    },
    sectionMeta: {
        color: colors.textMuted,
    },
    categoryCard: {
        borderRadius: borderRadius.xl,
        padding: spacing.base,
        backgroundColor: withAlpha(colors.surfaceCard, 0.92),
        borderWidth: 1,
        borderColor: withAlpha(colors.border, 0.82),
        gap: spacing.base,
    },
    cardSpacing: {
        marginBottom: spacing.sm,
    },
    categoryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.base,
    },
    categoryLeading: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.base,
    },
    categoryIconWrap: {
        width: 42,
        height: 42,
        borderRadius: borderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
    },
    categoryCopy: {
        flex: 1,
        gap: 4,
    },
    categoryTitle: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.semibold,
    },
    categoryMeta: {
        color: colors.textSecondary,
    },
    editButton: {
        borderRadius: borderRadius.full,
        paddingHorizontal: spacing.base,
        paddingVertical: spacing.sm,
        backgroundColor: withAlpha(colors.primaryAction, 0.12),
    },
    editButtonText: {
        color: colors.primaryAction,
        fontWeight: typography.fontWeight.semibold,
    },
    progressTrack: {
        height: 10,
        borderRadius: borderRadius.full,
        backgroundColor: withAlpha(colors.surfaceElevated, 0.9),
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: borderRadius.full,
    },
    categoryFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: spacing.base,
    },
    statusChip: {
        borderRadius: borderRadius.full,
        paddingHorizontal: spacing.sm,
        paddingVertical: 6,
    },
    statusChipText: {
        fontWeight: typography.fontWeight.semibold,
    },
    categoryFooterText: {
        color: colors.textMuted,
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.42)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    modalCard: {
        width: '100%',
        borderRadius: borderRadius.xl,
        padding: spacing.xl,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        gap: spacing.base,
    },
    modalTitle: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.bold,
    },
    modalSubtitle: {
        color: colors.textSecondary,
    },
    modalActions: {
        gap: spacing.sm,
        marginTop: spacing.sm,
    },
    removeButton: {
        width: '100%',
    },
    saveButton: {
        width: '100%',
    },
});
