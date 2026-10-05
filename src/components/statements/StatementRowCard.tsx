import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useI18n } from '../../hooks/shared/useI18n';
import { formatStatementDate } from '../../modules/statements/statementFormat';
import {
    STATEMENT_ROW_DECISIONS,
    canIncludeAsExpense,
    isIncludedRowValid,
} from '../../modules/statements/statementReview';
import type { StatementRow, StatementRowDecision } from '../../types/statementImports';
import { formatCurrency } from '../../utils/core/format';
import { getCurrencyLocale } from '../../utils/domain/currency';
import {
    borderRadius,
    SemanticColors,
    spacing,
    typography,
    useResponsive,
    useTheme,
    useThemedStyles,
} from '../../theme/index';

type StatementRowCardProps = {
    /** Row with unsaved draft edits already applied. */
    row: StatementRow;
    dirty: boolean;
    editable: boolean;
    selected: boolean;
    hasDefaultCard: boolean;
    categoryName: string | null;
    onToggleSelect: () => void;
    onDecision: (decision: StatementRowDecision) => void;
    onEdit: () => void;
};

const DECISION_LABEL = {
    PENDING: 'statements.row.decision.PENDING',
    INCLUDE_EXPENSE: 'statements.row.decision.INCLUDE_EXPENSE',
    EXCLUDE: 'statements.row.decision.EXCLUDE',
    INFO_ONLY: 'statements.row.decision.INFO_ONLY',
} as const;

export function StatementRowCard({
    row,
    dirty,
    editable,
    selected,
    hasDefaultCard,
    categoryName,
    onToggleSelect,
    onDecision,
    onEdit,
}: StatementRowCardProps) {
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);
    const { t, language } = useI18n();
    const { scaleFont } = useResponsive();
    const locale = getCurrencyLocale(language);
    const includable = canIncludeAsExpense(row);
    const invalid =
        row.decision === 'INCLUDE_EXPENSE' && !isIncludedRowValid(row, hasDefaultCard);
    const accent =
        row.decision === 'PENDING'
            ? colors.warning
            : invalid
                ? colors.error
                : row.decision === 'INCLUDE_EXPENSE'
                    ? colors.success
                    : colors.border;
    const dateText = row.transactionDate
        ? formatStatementDate(row.transactionDate, locale)
        : null;
    const matched = row.matchedExpense;
    const isMatchAccepted = Boolean(row.matchedExpenseId) && row.decision === 'INFO_ONLY';

    return (
        <View style={[styles.card, { borderLeftColor: accent }, selected ? styles.cardSelected : null]}>
            <View style={styles.head}>
                {editable ? (
                    <TouchableOpacity
                        onPress={onToggleSelect}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: selected }}
                    >
                        <Icon
                            name={selected ? 'checkbox' : 'square-outline'}
                            size={22}
                            color={selected ? colors.primaryAction : colors.textMuted}
                        />
                    </TouchableOpacity>
                ) : null}
                <TouchableOpacity style={styles.headText} onPress={editable ? onEdit : undefined} activeOpacity={0.8}>
                    <Text
                        style={[styles.description, { fontSize: scaleFont(typography.fontSize.base) }]}
                        numberOfLines={2}
                    >
                        {row.merchantName || row.description}
                    </Text>
                    <Text style={styles.muted}>
                        {[dateText, categoryName ?? (includable ? t('statements.row.noCategory') : null)]
                            .filter(Boolean)
                            .join('  |  ')}
                    </Text>
                </TouchableOpacity>
                <View style={styles.amountCol}>
                    <Text style={[styles.amount, { fontSize: scaleFont(typography.fontSize.base) }]}>
                        {formatCurrency(row.amount, row.currency, locale)}
                    </Text>
                    {row.isAdjusted ? (
                        <Text style={styles.adjusted}>
                            {t('statements.row.adjustedFrom', {
                                amount: formatCurrency(row.parsedAmount, row.parsedCurrency, locale),
                            })}
                        </Text>
                    ) : null}
                </View>
            </View>

            {dirty ? <Text style={styles.dirty}>{t('statements.row.unsaved')}</Text> : null}
            {row.isAdjusted && !row.decisionNote?.trim() ? (
                <Text style={styles.error}>{t('statements.row.needsNote')}</Text>
            ) : null}
            {invalid ? <Text style={styles.error}>{t('statements.row.missingData')}</Text> : null}

            {matched ? (
                <View style={styles.match}>
                    <Icon name="link-outline" size={16} color={colors.info} />
                    <View style={styles.matchText}>
                        <Text style={styles.matchTitle}>
                            {isMatchAccepted
                                ? t('statements.row.matchAccepted')
                                : t('statements.row.matchFound')}
                        </Text>
                        <Text style={styles.muted} numberOfLines={2}>
                            {matched.title} - {formatCurrency(matched.cost, row.currency, locale)}
                            {matched.date ? ` - ${formatStatementDate(matched.date, locale) ?? ''}` : ''}
                        </Text>
                        {editable && includable ? (
                            <TouchableOpacity
                                onPress={() => onDecision(isMatchAccepted ? 'INCLUDE_EXPENSE' : 'INFO_ONLY')}
                                accessibilityRole="button"
                            >
                                <Text style={styles.matchAction}>
                                    {isMatchAccepted
                                        ? t('statements.row.matchClear')
                                        : t('statements.row.matchAccept')}
                                </Text>
                            </TouchableOpacity>
                        ) : null}
                    </View>
                </View>
            ) : null}

            {editable ? (
                <View style={styles.chips}>
                    {STATEMENT_ROW_DECISIONS.map(decision => {
                        const disabled = decision === 'INCLUDE_EXPENSE' && !includable;
                        const active = row.decision === decision;
                        return (
                            <TouchableOpacity
                                key={decision}
                                disabled={disabled}
                                onPress={() => onDecision(decision)}
                                style={[
                                    styles.chip,
                                    active ? styles.chipActive : null,
                                    disabled ? styles.chipDisabled : null,
                                ]}
                                accessibilityRole="button"
                                accessibilityState={{ selected: active, disabled }}
                            >
                                <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>
                                    {t(DECISION_LABEL[decision])}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                    <TouchableOpacity onPress={onEdit} style={styles.editBtn} accessibilityRole="button">
                        <Icon name="create-outline" size={18} color={colors.primaryAction} />
                    </TouchableOpacity>
                </View>
            ) : (
                <Text style={styles.muted}>{t(DECISION_LABEL[row.decision])}</Text>
            )}
        </View>
    );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
    card: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        borderLeftWidth: 4,
        padding: spacing.base,
        gap: spacing.sm,
    },
    cardSelected: {
        borderColor: colors.primaryAction,
    },
    head: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    headText: {
        flex: 1,
        gap: 2,
    },
    description: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.semibold,
    },
    muted: {
        color: colors.textSecondary,
        fontSize: typography.fontSize.sm,
    },
    amountCol: {
        alignItems: 'flex-end',
    },
    amount: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.bold,
    },
    adjusted: {
        color: colors.warning,
        fontSize: typography.fontSize.xs,
    },
    dirty: {
        color: colors.info,
        fontSize: typography.fontSize.xs,
    },
    error: {
        color: colors.error,
        fontSize: typography.fontSize.sm,
    },
    match: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.sm,
        backgroundColor: colors.surfaceElevated,
        borderRadius: borderRadius.md,
        padding: spacing.sm,
    },
    matchText: {
        flex: 1,
    },
    matchTitle: {
        color: colors.info,
        fontWeight: typography.fontWeight.semibold,
        fontSize: typography.fontSize.sm,
    },
    matchAction: {
        color: colors.primaryAction,
        fontWeight: typography.fontWeight.semibold,
        fontSize: typography.fontSize.sm,
        paddingTop: spacing.xs,
    },
    chips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: spacing.xs,
    },
    chip: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 6,
        borderRadius: borderRadius.full,
        borderWidth: 1,
        borderColor: colors.border,
    },
    chipActive: {
        backgroundColor: colors.primaryAction,
        borderColor: colors.primaryAction,
    },
    chipDisabled: {
        opacity: 0.35,
    },
    chipText: {
        color: colors.textSecondary,
        fontSize: typography.fontSize.xs,
        fontWeight: typography.fontWeight.semibold,
    },
    chipTextActive: {
        color: colors.textOnAction,
    },
    editBtn: {
        marginLeft: 'auto',
        padding: spacing.xs,
    },
});
