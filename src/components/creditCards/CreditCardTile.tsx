import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Button } from '../ui/primitives/Button';
import { daysUntilDueDate, parseDateOnly } from '../../modules/creditCards/cardPaymentSchedule';
import { formatCardPercent, utilizationToneOf } from '../../modules/creditCards/cardPercent';
import {
    dueLabelOf,
    overviewCardStatus,
} from '../../modules/creditCards/cardStatus';
import { buildCycleTimeline, inferToday } from '../../modules/creditCards/cycleTimeline';
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
import { summarizeInstallmentPlans } from '../../modules/creditCards/installmentPlans';
import { CardCycleTimeline } from './CardCycleTimeline';
import { CardPaymentProgress } from './CardPaymentProgress';
import { cardBadgeColor, cardBadgeLabel, dueLabelText, utilizationToneLabel } from './cardLabels';
import { CreditCardFace } from './CreditCardFace';
import { formatCardShortDate } from './creditCardFormat';

type CreditCardTileProps = {
    card: CreditCard;
    overview?: CreditCardOverviewCard;
    onEdit: () => void;
    onDeactivate: () => void;
    onActivate: () => void;
    onOpenStatements?: () => void;
    onOpenInstallmentPlans?: () => void;
    onViewStatement?: (statementImportId: string) => void;
    onRegisterPayment?: (statementImportId: string) => void;
    isRemoving?: boolean;
    isUpdating?: boolean;
    /** The card art lives in the carousel above; show only the details. */
    hideFace?: boolean;
};

type Row = { key: string; label: string; value: string; hint?: string | null };

export function CreditCardTile({
    card,
    overview,
    onEdit,
    onDeactivate,
    onActivate,
    onOpenStatements,
    onOpenInstallmentPlans,
    onViewStatement,
    onRegisterPayment,
    isRemoving,
    isUpdating,
    hideFace,
}: CreditCardTileProps) {
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);
    const { t, tPlural, language } = useI18n();
    const { scaleFont } = useResponsive();
    const locale = getCurrencyLocale(language);
    const [expanded, setExpanded] = useState(false);
    const currency = overview?.currency ?? card.currency ?? undefined;
    const theme = creditCardTheme(card);
    const summary = overview?.statementSummary ?? null;
    const hasStatement = summary?.statementImportId != null;

    const money = (amount: number) => formatCurrency(amount, currency, locale);
    const timeline = (days: number | null | undefined) => dueLabelText(dueLabelOf(days), t);

    const status = overview ? overviewCardStatus(overview) : null;
    const statusLabel = status ? cardBadgeLabel(status.badge, t) : null;
    const statusColor = status ? cardBadgeColor(status.badge) : undefined;

    const dueDate = overview?.nextPayment?.dueDate ?? summary?.dueDate ?? null;
    const dueDays = dueDate ? daysUntilDueDate(dueDate) : null;
    const noInterest = summary?.currentPaymentDue ?? summary?.noInterestTarget ?? null;
    const showPaymentBlock = hasStatement && summary?.paymentStatus !== 'PAID';

    const utilization = overview?.creditStatus.utilizationPercent ?? null;
    const tone = utilizationToneOf(utilization);
    const toneColor = tone === 'HIGH' ? colors.error : tone === 'CAUTION' ? colors.warning : colors.success;
    const barWidth = `${Math.max(0, Math.min(100, utilization ?? 0))}%` as const;

    const signals: Array<{ key: string; label: string; color: string }> = [];
    if (overview) {
        if (overview.flags.overLimit) {
            signals.push({ key: 'over', label: t('creditCards.overLimit'), color: colors.error });
        } else if (overview.flags.highUtilization) {
            signals.push({ key: 'high', label: t('creditCards.highUsage'), color: colors.warning });
        }
        if (status?.overdueDays != null) {
            signals.push({
                key: 'overdue',
                label: t('creditCards.overdueDays', { count: status.overdueDays }),
                color: colors.error,
            });
        }
        if (overview.flags.paymentDueSoon && status?.badge === 'DUE_SOON') {
            signals.push({ key: 'due', label: t('creditCards.dueSoon'), color: colors.warning });
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

    const closingDate = overview?.schedule.nextClosingDate
        ? parseDateOnly(overview.schedule.nextClosingDate)
        : null;
    const nextDue = overview?.schedule.nextPaymentDueDate
        ? parseDateOnly(overview.schedule.nextPaymentDueDate)
        : null;
    const cycleTimeline = overview
        ? buildCycleTimeline(
            inferToday(
                closingDate,
                overview.schedule.daysUntilClosing,
                nextDue,
                overview.schedule.daysUntilPaymentDue,
                new Date(),
            ),
            closingDate,
            nextDue,
            card.closingDay,
        )
        : null;
    const hasDueSchedule = nextDue != null;

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

    const installmentSummary = summarizeInstallmentPlans(overview?.installmentPlans ?? []);
    const installmentTotal =
        installmentSummary.totals.find(total => total.currency === currency) ??
        installmentSummary.totals[0];

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
            {hideFace ? null : (
                <CreditCardFace
                    card={card}
                    statusLabel={statusLabel}
                    statusColor={statusColor}
                    inactiveLabel={t('creditCards.inactive')}
                />
            )}

            {overview?.creditStatus.limit != null ? (
                <View
                    style={styles.utilization}
                    accessible
                    accessibilityLabel={t('creditCards.utilizationCd', {
                        percent: formatCardPercent(utilization),
                        tone: utilizationToneLabel(tone, t),
                    })}
                >
                    <View style={styles.utilizationHeader}>
                        <Text
                            style={[styles.utilizationTitle, { fontSize: scaleFont(typography.fontSize.md) }]}
                        >
                            {t('creditCards.utilOfLimit', { percent: formatCardPercent(utilization) })}
                        </Text>
                        <Text
                            style={[
                                styles.utilizationTone,
                                { color: toneColor, fontSize: scaleFont(typography.fontSize.xs) },
                            ]}
                        >
                            {utilizationToneLabel(tone, t)}
                        </Text>
                    </View>
                    <View style={styles.barTrack}>
                        <View
                            style={[styles.barFill, { width: barWidth, backgroundColor: toneColor }]}
                        />
                    </View>
                    <Text style={[styles.rowHint, { fontSize: scaleFont(typography.fontSize.xs) }]}>
                        {overview.creditStatus.availableCredit != null
                            ? t('creditCards.utilizationUsedAvailable', {
                                used: money(overview.creditStatus.owedBalance ?? 0),
                                available: money(overview.creditStatus.availableCredit),
                            })
                            : money(overview.creditStatus.owedBalance ?? 0)}
                    </Text>
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

            {overview && cycleTimeline ? (
                <CardCycleTimeline
                    timeline={cycleTimeline}
                    daysUntilClosing={overview.schedule.daysUntilClosing}
                    daysUntilDue={overview.schedule.daysUntilPaymentDue}
                    statementPaid={status?.paid ?? false}
                />
            ) : null}
            {overview && !hasDueSchedule && !showPaymentBlock ? (
                <Text style={[styles.rowHint, { fontSize: scaleFont(typography.fontSize.sm) }]}>
                    {t('creditCards.nextPaymentNone')}
                </Text>
            ) : null}

            {installmentSummary.count > 0 && installmentTotal ? (
                <TouchableOpacity
                    onPress={onOpenInstallmentPlans}
                    disabled={!onOpenInstallmentPlans}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    style={styles.installmentsLine}
                >
                    <Text
                        style={[styles.installmentsText, { fontSize: scaleFont(typography.fontSize.sm) }]}
                        numberOfLines={1}
                    >
                        {tPlural('cardInstallments.summaryLine', installmentSummary.count, {
                            amount: formatCurrency(installmentTotal.monthly, installmentTotal.currency, locale),
                        })}
                    </Text>
                    <Text style={styles.installmentsChevron}>{'›'}</Text>
                </TouchableOpacity>
            ) : null}

            {hasStatement && summary && onRegisterPayment ? (
                <CardPaymentProgress
                    summary={summary}
                    currency={currency}
                    barColor={theme.bar}
                    onRegister={() => onRegisterPayment(summary.statementImportId as string)}
                    onViewAll={() => onViewStatement?.(summary.statementImportId as string)}
                />
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
    utilization: {
        gap: spacing.sm,
    },
    utilizationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.sm,
    },
    utilizationTitle: {
        flex: 1,
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.semibold,
    },
    utilizationTone: {
        fontWeight: typography.fontWeight.semibold,
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
    installmentsLine: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.surfaceElevated,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: spacing.sm,
        minHeight: 44,
    },
    installmentsText: {
        flex: 1,
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.semibold,
    },
    installmentsChevron: {
        color: colors.primaryLight,
        fontSize: typography.fontSize.lg,
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
