import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Button } from '../ui/primitives/Button';
import { daysUntilDueDate } from '../../modules/creditCards/cardPaymentSchedule';
import { creditCardTheme } from '../../modules/creditCards/creditCardVisuals';
import { useI18n } from '../../hooks/shared/useI18n';
import { CreditCard, CreditCardOverviewCard } from '../../types/index';
import { formatCurrency } from '../../utils/core/format';
import { getCurrencyLocale } from '../../utils/domain/currency';
import { withAlpha } from '../../utils/domain/subscriptions';
import {
    borderRadius,
    SemanticColors,
    spacing,
    typography,
    useResponsive,
    useTheme,
    useThemedStyles,
} from '../../theme/index';
import { CreditCardFace } from './CreditCardFace';
import { formatCardShortDate } from './creditCardFormat';

type CreditCardTileProps = {
    card: CreditCard;
    overview?: CreditCardOverviewCard;
    onEdit: () => void;
    onDeactivate: () => void;
    onActivate: () => void;
    onOpenStatements?: () => void;
    onViewStatement?: (statementImportId: string) => void;
    isRemoving?: boolean;
    isUpdating?: boolean;
};

type Row = { key: string; label: string; value: string; hint?: string | null };

export function CreditCardTile({
    card,
    overview,
    onEdit,
    onDeactivate,
    onActivate,
    onOpenStatements,
    onViewStatement,
    isRemoving,
    isUpdating,
}: CreditCardTileProps) {
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);
    const { t, language } = useI18n();
    const { scaleFont } = useResponsive();
    const locale = getCurrencyLocale(language);
    const [expanded, setExpanded] = useState(false);
    const currency = overview?.currency ?? card.currency ?? undefined;
    const theme = creditCardTheme(card);
    const summary = overview?.statementSummary ?? null;
    const hasStatement = summary?.statementImportId != null;

    const money = (amount: number) => formatCurrency(amount, currency, locale);
    const timeline = (days: number | null | undefined) => {
        if (days == null) {
            return null;
        }
        if (days < 0) {
            return t('creditCards.overdueDays', { count: Math.abs(days) });
        }
        if (days === 0) {
            return t('creditCards.today');
        }
        if (days === 1) {
            return t('creditCards.tomorrow');
        }
        return t('creditCards.inDays', { count: days });
    };

    let statusLabel: string | null = null;
    let statusColor: string | undefined;
    if (hasStatement && summary) {
        if (summary.paymentStatus === 'PAID') {
            statusLabel = t('creditCards.statementPaid');
            statusColor = '#34D399';
        } else if (summary.paymentStatus === 'PARTIAL') {
            statusLabel = t('creditCards.statementPartial');
            statusColor = '#FBBF24';
        } else {
            statusLabel = t('creditCards.statementPending');
            statusColor = '#FCA5A5';
        }
    }

    const dueDate = overview?.nextPayment?.dueDate ?? summary?.dueDate ?? null;
    const dueDays = dueDate ? daysUntilDueDate(dueDate) : null;
    const noInterest = summary?.currentPaymentDue ?? summary?.noInterestTarget ?? null;
    const showPaymentBlock = hasStatement && summary?.paymentStatus !== 'PAID';

    const utilization = overview?.creditStatus.utilizationPercent ?? null;
    const barWidth = `${Math.max(0, Math.min(100, utilization ?? 0))}%` as const;
    const barColor = overview?.flags.overLimit
        ? colors.error
        : overview?.flags.highUtilization
            ? colors.warning
            : theme.bar;

    const signals: Array<{ key: string; label: string; color: string }> = [];
    if (overview) {
        if (overview.flags.overLimit) {
            signals.push({ key: 'over', label: t('creditCards.overLimit'), color: colors.error });
        } else if (overview.flags.highUtilization) {
            signals.push({ key: 'high', label: t('creditCards.highUsage'), color: colors.warning });
        }
        if (overview.flags.paymentDueSoon) {
            signals.push({ key: 'due', label: t('creditCards.dueSoon'), color: colors.warning });
        }
        if (overview.flags.closingSoon) {
            signals.push({ key: 'close', label: t('creditCards.closesSoon'), color: colors.textMuted });
        }
        if (overview.flags.missingLimit) {
            signals.push({ key: 'limit', label: t('creditCards.limitMissing'), color: colors.textMuted });
        }
        if (overview.flags.currencyMismatch) {
            signals.push({
                key: 'currency',
                label: t('creditCards.currencyMismatch'),
                color: colors.warning,
            });
        }
    }

    const primaryRows: Row[] = [];
    if (showPaymentBlock && noInterest != null) {
        primaryRows.push({
            key: 'noInterest',
            label: t('creditCards.noInterestPayment'),
            value: money(noInterest),
        });
    }
    if (showPaymentBlock && dueDate) {
        primaryRows.push({
            key: 'deadline',
            label: t('creditCards.deadline'),
            value: formatCardShortDate(dueDate, locale) ?? dueDate,
            hint: timeline(dueDays),
        });
    }
    if (overview) {
        primaryRows.push({
            key: 'cycle',
            label: t('creditCards.currentCycle'),
            value: money(overview.currentCycle.spend),
            hint: t('creditCards.expensesInCycle', { count: overview.currentCycle.expenseCount }),
        });
    }

    const detailRows: Row[] = [];
    if (summary && hasStatement) {
        if (summary.closingBalance != null) {
            detailRows.push({
                key: 'statementBalance',
                label: t('creditCards.statementBalance'),
                value: money(summary.closingBalance),
            });
        }
        if (summary.minimumPayment != null) {
            detailRows.push({
                key: 'minimum',
                label: t('creditCards.minimumPayment'),
                value: money(summary.minimumPayment),
            });
        }
        if (summary.deferredInstallmentBalance > 0) {
            detailRows.push({
                key: 'deferred',
                label: t('creditCards.deferredBalance'),
                value: money(summary.deferredInstallmentBalance),
            });
        }
        if (summary.nextClosePaymentEstimate > 0) {
            detailRows.push({
                key: 'nextClose',
                label: t('creditCards.nextCloseEstimate'),
                value: money(summary.nextClosePaymentEstimate),
            });
        }
        if (summary.nextClosePaymentEstimate > 0 || summary.estimatedRemainingAfterNextClose > 0) {
            detailRows.push({
                key: 'remaining',
                label: t('creditCards.remaining'),
                value: money(summary.estimatedRemainingAfterNextClose),
            });
        }
        if (summary.projectedTotalDebt > 0) {
            detailRows.push({
                key: 'projected',
                label: t('creditCards.projectedDebt'),
                value: money(summary.projectedTotalDebt),
            });
        }
    }
    if (overview) {
        if (overview.creditStatus.availableCredit != null) {
            detailRows.push({
                key: 'available',
                label: t('creditCards.availableCredit'),
                value: money(overview.creditStatus.availableCredit),
                hint:
                    overview.creditStatus.limit != null
                        ? `${t('creditCards.limit')} ${money(overview.creditStatus.limit)}`
                        : null,
            });
        }
        const nextClosing = formatCardShortDate(overview.schedule.nextClosingDate, locale);
        if (nextClosing) {
            detailRows.push({
                key: 'closing',
                label: t('creditCards.nextClosing'),
                value: nextClosing,
                hint: timeline(overview.schedule.daysUntilClosing),
            });
        }
        if (overview.subscriptions.activeCount > 0) {
            detailRows.push({
                key: 'subs',
                label: t('creditCards.linkedSubscriptions'),
                value: String(overview.subscriptions.activeCount),
                hint: money(overview.subscriptions.monthlyRecurringSpend),
            });
        }
    }

    const renderRow = (row: Row) => (
        <View key={row.key} style={styles.row}>
            <Text style={[styles.rowLabel, { fontSize: scaleFont(typography.fontSize.sm) }]}>
                {row.label}
            </Text>
            <View style={styles.rowValueWrap}>
                <Text style={[styles.rowValue, { fontSize: scaleFont(typography.fontSize.sm) }]}>
                    {row.value}
                </Text>
                {row.hint ? (
                    <Text style={[styles.rowHint, { fontSize: scaleFont(typography.fontSize.xs) }]}>
                        {row.hint}
                    </Text>
                ) : null}
            </View>
        </View>
    );

    return (
        <View style={[styles.tile, { borderColor: withAlpha(theme.background, 0.45) }]}>
            <CreditCardFace
                card={card}
                statusLabel={statusLabel}
                statusColor={statusColor}
                inactiveLabel={t('creditCards.inactive')}
            />

            {overview?.creditStatus.limit != null ? (
                <View style={styles.barTrack}>
                    <View
                        style={[styles.barFill, { width: barWidth, backgroundColor: barColor }]}
                    />
                </View>
            ) : null}

            {signals.length ? (
                <View style={styles.signalRow}>
                    {signals.map(signal => (
                        <View
                            key={`${card.id}-${signal.key}`}
                            style={[
                                styles.signalChip,
                                {
                                    backgroundColor: withAlpha(signal.color, 0.14),
                                    borderColor: withAlpha(signal.color, 0.3),
                                },
                            ]}
                        >
                            <Text
                                style={[
                                    styles.signalText,
                                    { color: signal.color, fontSize: scaleFont(typography.fontSize.xs) },
                                ]}
                            >
                                {signal.label}
                            </Text>
                        </View>
                    ))}
                </View>
            ) : null}

            {primaryRows.length ? <View style={styles.rows}>{primaryRows.map(renderRow)}</View> : null}

            {detailRows.length ? (
                <>
                    {expanded ? (
                        <View style={styles.details}>
                            <Text
                                style={[
                                    styles.detailsTitle,
                                    { fontSize: scaleFont(typography.fontSize.xs) },
                                ]}
                            >
                                {t('creditCards.debtBreakdown')}
                            </Text>
                            {detailRows.map(renderRow)}
                        </View>
                    ) : null}
                    <TouchableOpacity
                        onPress={() => setExpanded(value => !value)}
                        activeOpacity={0.8}
                        style={styles.toggle}
                    >
                        <Text
                            style={[styles.toggleText, { fontSize: scaleFont(typography.fontSize.sm) }]}
                        >
                            {expanded ? t('creditCards.hideDetails') : t('creditCards.showDetails')}
                        </Text>
                    </TouchableOpacity>
                </>
            ) : null}

            {onOpenStatements || (onViewStatement && summary?.statementImportId) ? (
                <View style={styles.actionsRow}>
                    {onViewStatement && summary?.statementImportId ? (
                        <Button
                            title={t('creditCards.viewStatement')}
                            variant="secondary"
                            onPress={() => onViewStatement(summary.statementImportId as string)}
                            containerStyle={styles.actionButton}
                            textStyle={styles.actionButtonText}
                        />
                    ) : null}
                    {onOpenStatements ? (
                        <Button
                            title={t('creditCards.statements')}
                            variant="secondary"
                            onPress={onOpenStatements}
                            containerStyle={styles.actionButton}
                            textStyle={styles.actionButtonText}
                        />
                    ) : null}
                </View>
            ) : null}

            <View style={styles.actionsRow}>
                <Button
                    title={t('common.edit')}
                    variant="secondary"
                    onPress={onEdit}
                    containerStyle={styles.actionButton}
                    textStyle={styles.actionButtonText}
                />
                {card.isActive ? (
                    <Button
                        title={t('creditCards.deactivateAction')}
                        variant="danger"
                        onPress={onDeactivate}
                        disabled={isRemoving}
                        containerStyle={styles.actionButton}
                        textStyle={styles.actionButtonText}
                    />
                ) : (
                    <Button
                        title={t('creditCards.activateAction')}
                        onPress={onActivate}
                        disabled={isUpdating}
                        containerStyle={styles.actionButton}
                        textStyle={styles.actionButtonText}
                    />
                )}
            </View>
        </View>
    );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
    tile: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.xl,
        borderWidth: 1,
        padding: spacing.base,
        gap: spacing.sm,
    },
    barTrack: {
        height: 6,
        borderRadius: borderRadius.full,
        backgroundColor: colors.surfaceElevated,
        overflow: 'hidden',
    },
    barFill: {
        height: '100%',
        borderRadius: borderRadius.full,
    },
    signalRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.xs,
    },
    signalChip: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 6,
        borderRadius: borderRadius.full,
        borderWidth: 1,
    },
    signalText: {
        fontWeight: typography.fontWeight.semibold,
    },
    rows: {
        backgroundColor: colors.surfaceElevated,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: spacing.sm,
    },
    details: {
        backgroundColor: colors.surfaceElevated,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: spacing.sm,
        paddingTop: spacing.sm,
    },
    detailsTitle: {
        color: colors.textMuted,
        fontWeight: typography.fontWeight.semibold,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: spacing.sm,
        paddingVertical: spacing.sm,
    },
    rowLabel: {
        flex: 1,
        color: colors.textSecondary,
    },
    rowValueWrap: {
        alignItems: 'flex-end',
    },
    rowValue: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.semibold,
    },
    rowHint: {
        color: colors.textMuted,
        marginTop: 2,
    },
    toggle: {
        alignItems: 'center',
        paddingVertical: spacing.xs,
    },
    toggleText: {
        color: colors.primaryLight,
        fontWeight: typography.fontWeight.semibold,
    },
    actionsRow: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    actionButton: {
        flex: 1,
        minHeight: 44,
    },
    actionButtonText: {
        fontSize: typography.fontSize.sm,
    },
});
