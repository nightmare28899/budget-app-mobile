import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { RootScreenProps } from '../../navigation/types';
import { AnimatedScreen } from '../../components/ui/primitives/AnimatedScreen';
import { HomeBackground } from '../../components/ui/layout/HomeBackground';
import { Button } from '../../components/ui/primitives/Button';
import { PremiumFeatureGate } from '../../components/premium/PremiumFeatureGate';
import { CategoryPickerSheet } from '../../components/ui/domain/CategoryPickerSheet';
import { FilterChipRow } from '../../components/statements/FilterChipRow';
import { StatementRowCard } from '../../components/statements/StatementRowCard';
import { StatementRowEditModal } from '../../components/statements/StatementRowEditModal';
import { StatementScreenHeader } from '../../components/statements/StatementScreenHeader';
import { useAppAlert } from '../../components/alerts/AlertProvider';
import { categoriesApi } from '../../api/resources/categories';
import { useCreditCardsCatalog } from '../../hooks/creditCards/useCreditCardsCatalog';
import { usePremiumAccess } from '../../hooks/access/usePremiumAccess';
import { useStatementActions } from '../../hooks/statements/useStatementActions';
import { useStatementDetail } from '../../hooks/statements/useStatementDetail';
import { useStatementErrorMessage } from '../../hooks/statements/useStatementErrorMessage';
import { useI18n } from '../../hooks/shared/useI18n';
import {
    MAX_STATEMENT_ROWS_PER_SAVE,
    STATEMENT_ROW_FILTERS,
    StatementConfirmBlocker,
    StatementRowDraft,
    StatementRowDrafts,
    StatementRowFilter,
    applyRowDraft,
    buildRowPatches,
    canIncludeAsExpense,
    computeConfirmBlockers,
    filterStatementRows,
    mergeRowDraft,
} from '../../modules/statements/statementReview';
import type { StatementRowDecision } from '../../types/statementImports';
import {
    borderRadius,
    spacing,
    typography,
    useResponsive,
    useTheme,
    useThemedStyles,
    SemanticColors,
} from '../../theme/index';

const FILTER_LABELS = {
    ALL: 'statements.rowFilter.ALL',
    PENDING: 'statements.rowFilter.PENDING',
    MISSING_CATEGORY: 'statements.rowFilter.MISSING_CATEGORY',
    READY: 'statements.rowFilter.READY',
    ADJUSTED: 'statements.rowFilter.ADJUSTED',
    MATCHED: 'statements.rowFilter.MATCHED',
} as const;

export function StatementReviewScreen({ navigation, route }: RootScreenProps<'StatementReview'>) {
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);
    const insets = useSafeAreaInsets();
    const { t, tPlural } = useI18n();
    const { alert } = useAppAlert();
    const { hasPremium } = usePremiumAccess();
    const { horizontalPadding, contentMaxWidth } = useResponsive();
    const id = route.params.id;
    const describeError = useStatementErrorMessage();
    const { statement, isLoading, isError, refetch } = useStatementDetail(id, hasPremium);
    const { cards } = useCreditCardsCatalog({ includeInactive: true, enabled: hasPremium });
    const { data: categories = [] } = useQuery({
        queryKey: ['categories'],
        queryFn: categoriesApi.getAll,
        enabled: hasPremium,
    });
    const actions = useStatementActions(id);

    const [drafts, setDrafts] = useState<StatementRowDrafts>({});
    const [filter, setFilter] = useState<StatementRowFilter>('ALL');
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [editingId, setEditingId] = useState<string | null>(null);
    const [bulkPickerOpen, setBulkPickerOpen] = useState(false);
    const [message, setMessage] = useState<{ tone: 'error' | 'info'; text: string } | null>(null);
    const skipLeaveGuard = useRef(false);

    const draftCount = Object.keys(drafts).length;
    const version = statement?.version ?? 0;

    // A new server version (save, resume, refetch after a conflict) invalidates local drafts.
    useEffect(() => {
        setDrafts({});
        setSelected(new Set());
    }, [version]);

    useEffect(() => {
        const unsubscribe = navigation.addListener('beforeRemove', event => {
            if (skipLeaveGuard.current || draftCount === 0) {
                return;
            }
            event.preventDefault();
            alert(t('statements.review.discardTitle'), t('statements.review.discardMessage'), [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('statements.review.discard'),
                    style: 'destructive',
                    onPress: () => navigation.dispatch(event.data.action),
                },
            ]);
        });
        return unsubscribe;
    }, [alert, draftCount, navigation, t]);

    const rows = useMemo(
        () => (statement?.rows ?? []).map(row => applyRowDraft(row, drafts[row.id])),
        [statement, drafts],
    );
    const storedRowById = useMemo(
        () => new Map((statement?.rows ?? []).map(row => [row.id, row])),
        [statement],
    );
    const visibleRows = useMemo(() => filterStatementRows(rows, filter), [rows, filter]);
    const categoryNames = useMemo(
        () => new Map(categories.map(category => [category.id, category.name])),
        [categories],
    );
    const editable = statement?.status === 'NEEDS_REVIEW';
    const blockers = useMemo(
        () =>
            computeConfirmBlockers({
                rows,
                reconciliationPassed: statement?.reconciliation?.status === 'PASSED',
                hasDefaultCard: Boolean(statement?.creditCardId),
                unsavedCount: draftCount,
            }),
        [rows, statement, draftCount],
    );

    const patchRow = useCallback(
        (rowId: string, patch: StatementRowDraft) => {
            const stored = storedRowById.get(rowId);
            if (!stored) {
                return;
            }
            setDrafts(current => mergeRowDraft(current, stored, patch));
            setMessage(null);
        },
        [storedRowById],
    );

    const toggleSelect = (rowId: string) =>
        setSelected(current => {
            const next = new Set(current);
            if (next.has(rowId)) {
                next.delete(rowId);
            } else {
                next.add(rowId);
            }
            return next;
        });

    const bulkPatch = (patch: StatementRowDraft, onlyIncludable: boolean) => {
        const targets = rows.filter(row => selected.has(row.id));
        const eligible = onlyIncludable ? targets.filter(canIncludeAsExpense) : targets;
        setDrafts(current => {
            let next = current;
            eligible.forEach(row => {
                const stored = storedRowById.get(row.id);
                if (stored) {
                    next = mergeRowDraft(next, stored, patch);
                }
            });
            return next;
        });
        const skipped = targets.length - eligible.length;
        setMessage(
            skipped > 0
                ? { tone: 'info', text: t('statements.review.bulkSkipped', { count: skipped }) }
                : null,
        );
        setSelected(new Set());
    };

    const bulkDecision = (decision: StatementRowDecision) =>
        bulkPatch({ decision }, decision === 'INCLUDE_EXPENSE');

    const save = async (): Promise<boolean> => {
        if (!statement || draftCount === 0) {
            return true;
        }
        if (draftCount > MAX_STATEMENT_ROWS_PER_SAVE) {
            setMessage({
                tone: 'error',
                text: t('statements.review.tooManyEdits', { max: MAX_STATEMENT_ROWS_PER_SAVE }),
            });
            return false;
        }
        const result = await actions.saveRows(statement.version, buildRowPatches(drafts));
        if (!result.ok) {
            setMessage({ tone: 'error', text: describeError(result.error, 'statements.review.saveFailed') });
            return false;
        }
        setMessage({ tone: 'info', text: t('statements.review.saved') });
        return true;
    };

    const runConfirm = async () => {
        if (!statement) {
            return;
        }
        const result = await actions.confirm(statement.version);
        if (!result.ok) {
            setMessage({ tone: 'error', text: describeError(result.error, 'statements.review.confirmFailed') });
            return;
        }
        skipLeaveGuard.current = true;
        alert(
            t('statements.review.confirmedTitle'),
            t('statements.review.confirmedMessage', { count: result.data.createdExpenseCount }),
        );
        navigation.goBack();
    };

    const confirm = () => {
        alert(t('statements.review.confirmTitle'), t('statements.review.confirmMessage'), [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('statements.review.confirm'), onPress: () => void runConfirm() },
        ]);
    };

    const blockerText = (blocker: StatementConfirmBlocker): string => {
        switch (blocker.code) {
            case 'reconciliation':
                return t('statements.blocker.reconciliation');
            case 'pending':
                return tPlural('statements.blocker.pending', blocker.count);
            case 'noExpenses':
                return t('statements.blocker.noExpenses');
            case 'invalidRows':
                return tPlural('statements.blocker.invalidRows', blocker.count);
            case 'missingNotes':
                return tPlural('statements.blocker.missingNotes', blocker.count);
            default:
                return t('statements.blocker.unsaved');
        }
    };

    if (!hasPremium) {
        return (
            <PremiumFeatureGate
                feature="statement_imports"
                onClose={() => navigation.goBack()}
                onContinueToAuth={() => navigation.navigate('Auth', { screen: 'Login' })}
            />
        );
    }

    const contentMaxWidthStyle = contentMaxWidth
        ? { maxWidth: contentMaxWidth, alignSelf: 'center' as const, width: '100%' as const }
        : null;
    const editingRow = editingId ? rows.find(row => row.id === editingId) ?? null : null;
    const busy = actions.isSaving || actions.isConfirming;

    return (
        <View style={styles.container}>
            <HomeBackground />
            <AnimatedScreen style={styles.flex1} delay={20}>
                <StatementScreenHeader
                    title={t('statements.review.title')}
                    onBack={() => navigation.goBack()}
                />
                {isLoading ? (
                    <View style={styles.center}>
                        <ActivityIndicator color={colors.primary} />
                    </View>
                ) : isError || !statement ? (
                    <View style={styles.center}>
                        <Text style={styles.muted}>{t('statements.loadFailed')}</Text>
                        <Button title={t('statements.retry')} variant="secondary" onPress={() => refetch()} />
                    </View>
                ) : (
                    <>
                        {!editable ? (
                            <View style={[styles.banner, { marginHorizontal: horizontalPadding }]}>
                                <Text style={styles.muted}>{t('statements.review.notEditable')}</Text>
                            </View>
                        ) : null}
                        <FilterChipRow
                            chips={STATEMENT_ROW_FILTERS.map(key => ({
                                key,
                                label: t(FILTER_LABELS[key]),
                            }))}
                            selectedKey={filter}
                            onSelect={key => setFilter(key as StatementRowFilter)}
                            horizontalPadding={horizontalPadding}
                        />
                        {editable && selected.size > 0 ? (
                            <View style={[styles.bulkBar, { marginHorizontal: horizontalPadding }]}>
                                <Text style={styles.bulkCount}>
                                    {t('statements.review.selected', { count: selected.size })}
                                </Text>
                                <View style={styles.bulkActions}>
                                    <BulkButton styles={styles} label={t('statements.row.decision.INCLUDE_EXPENSE')} onPress={() => bulkDecision('INCLUDE_EXPENSE')} />
                                    <BulkButton styles={styles} label={t('statements.row.decision.EXCLUDE')} onPress={() => bulkDecision('EXCLUDE')} />
                                    <BulkButton styles={styles} label={t('statements.row.decision.INFO_ONLY')} onPress={() => bulkDecision('INFO_ONLY')} />
                                    <BulkButton styles={styles} label={t('statements.review.bulkCategory')} onPress={() => setBulkPickerOpen(true)} />
                                    <BulkButton styles={styles} label={t('statements.review.clearSelection')} onPress={() => setSelected(new Set())} />
                                </View>
                            </View>
                        ) : null}
                        <FlatList
                            data={visibleRows}
                            keyExtractor={row => row.id}
                            contentContainerStyle={[
                                styles.list,
                                { paddingHorizontal: horizontalPadding },
                                contentMaxWidthStyle,
                            ]}
                            ItemSeparatorComponent={RowSeparator}
                            ListEmptyComponent={
                                <Text style={[styles.muted, styles.empty]}>{t('statements.review.noRows')}</Text>
                            }
                            ListFooterComponent={
                                editable ? (
                                    <View style={styles.footer}>
                                        {message ? (
                                            <Text style={message.tone === 'error' ? styles.error : styles.info}>
                                                {message.text}
                                            </Text>
                                        ) : null}
                                        {blockers.length > 0 ? (
                                            <View style={styles.blockers}>
                                                <Text style={styles.blockersTitle}>
                                                    {t('statements.blocker.title')}
                                                </Text>
                                                {blockers.map(blocker => (
                                                    <Text key={blocker.code} style={styles.blocker}>
                                                        {`• ${blockerText(blocker)}`}
                                                    </Text>
                                                ))}
                                            </View>
                                        ) : null}
                                    </View>
                                ) : null
                            }
                            renderItem={({ item }) => (
                                <StatementRowCard
                                    row={item}
                                    dirty={Boolean(drafts[item.id])}
                                    editable={editable}
                                    selected={selected.has(item.id)}
                                    hasDefaultCard={Boolean(statement.creditCardId)}
                                    categoryName={
                                        item.category?.name
                                        ?? (item.categoryId ? categoryNames.get(item.categoryId) ?? null : null)
                                    }
                                    onToggleSelect={() => toggleSelect(item.id)}
                                    onDecision={decision => patchRow(item.id, { decision })}
                                    onEdit={() => setEditingId(item.id)}
                                />
                            )}
                        />
                        {editable ? (
                            <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.sm }]}>
                                <Button
                                    title={
                                        draftCount > 0
                                            ? t('statements.review.saveCount', { count: draftCount })
                                            : t('common.save')
                                    }
                                    variant="secondary"
                                    onPress={() => void save()}
                                    disabled={draftCount === 0 || busy}
                                    loading={actions.isSaving}
                                    containerStyle={styles.flex1}
                                />
                                <Button
                                    title={t('statements.review.confirm')}
                                    onPress={confirm}
                                    disabled={blockers.length > 0 || busy}
                                    loading={actions.isConfirming}
                                    containerStyle={styles.flex1}
                                />
                            </View>
                        ) : null}
                    </>
                )}
            </AnimatedScreen>

            <StatementRowEditModal
                row={editingRow}
                categories={categories}
                cards={cards}
                onClose={() => setEditingId(null)}
                onApply={draft => {
                    if (editingId) {
                        patchRow(editingId, draft);
                    }
                    setEditingId(null);
                }}
            />
            <CategoryPickerSheet
                categories={categories}
                visible={bulkPickerOpen}
                onClose={() => setBulkPickerOpen(false)}
                onSelectCategory={categoryId =>
                    bulkPatch({ decision: 'INCLUDE_EXPENSE', categoryId }, true)
                }
            />
        </View>
    );

}

function RowSeparator() {
    return <View style={separatorStyle} />;
}

const separatorStyle = { height: spacing.sm };

function BulkButton({
    label,
    onPress,
    styles,
}: {
    label: string;
    onPress: () => void;
    styles: ReturnType<typeof createStyles>;
}) {
    return (
        <TouchableOpacity style={styles.bulkBtn} onPress={onPress} accessibilityRole="button">
            <Text style={styles.bulkBtnText}>{label}</Text>
        </TouchableOpacity>
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
    center: {
        alignItems: 'center',
        gap: spacing.sm,
        padding: spacing.xl,
    },
    muted: {
        color: colors.textSecondary,
        fontSize: typography.fontSize.sm,
    },
    empty: {
        textAlign: 'center',
        paddingVertical: spacing.xl,
    },
    banner: {
        backgroundColor: colors.surfaceElevated,
        borderRadius: borderRadius.lg,
        padding: spacing.base,
        marginBottom: spacing.sm,
    },
    bulkBar: {
        backgroundColor: colors.surfaceElevated,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.primaryAction,
        padding: spacing.sm,
        gap: spacing.xs,
        marginBottom: spacing.sm,
    },
    bulkCount: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.semibold,
        fontSize: typography.fontSize.sm,
    },
    bulkActions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.xs,
    },
    bulkBtn: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 6,
        borderRadius: borderRadius.full,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
    },
    bulkBtnText: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.semibold,
    },
    list: {
        paddingTop: spacing.sm,
        paddingBottom: spacing['4xl'],
    },
    footer: {
        gap: spacing.sm,
        paddingTop: spacing.base,
    },
    error: {
        color: colors.error,
        fontSize: typography.fontSize.sm,
    },
    info: {
        color: colors.info,
        fontSize: typography.fontSize.sm,
    },
    blockers: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.warning,
        padding: spacing.base,
        gap: 4,
    },
    blockersTitle: {
        color: colors.warning,
        fontWeight: typography.fontWeight.semibold,
        fontSize: typography.fontSize.sm,
    },
    blocker: {
        color: colors.textPrimary,
        fontSize: typography.fontSize.sm,
    },
    bottomBar: {
        flexDirection: 'row',
        gap: spacing.sm,
        paddingHorizontal: spacing.base,
        paddingTop: spacing.sm,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: colors.border,
        backgroundColor: colors.background,
    },
});
