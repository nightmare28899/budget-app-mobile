import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Button } from '../ui/primitives/Button';
import { StatementPaymentModal, PaymentModalSubmit } from './StatementPaymentModal';
import { StatementReasonModal } from './StatementReasonModal';
import { useI18n } from '../../hooks/shared/useI18n';
import { useStatementErrorMessage } from '../../hooks/statements/useStatementErrorMessage';
import { useStatementPayments } from '../../hooks/statements/useStatementPayments';
import { formatStatementDate } from '../../modules/statements/statementFormat';
import {
    classifyPaymentHistory,
    suggestedPaymentAmount,
} from '../../modules/statements/statementPayments';
import type { StatementImportDetail, StatementPayment } from '../../types/statementImports';
import { formatCurrency } from '../../utils/core/format';
import { getCurrencyLocale } from '../../utils/domain/currency';
import {
    borderRadius,
    SemanticColors,
    spacing,
    typography,
    useResponsive,
    useThemedStyles,
} from '../../theme/index';
import type { StatementError } from '../../modules/statements/statementErrors';

type StatementPaymentsSectionProps = {
    statement: StatementImportDetail;
};

type ModalState =
    | { kind: 'none' }
    | { kind: 'add' }
    | { kind: 'correct'; payment: StatementPayment }
    | { kind: 'void'; payment: StatementPayment };

/** Payments ledger for a confirmed statement: summary, history, add / correct / void. */
export function StatementPaymentsSection({ statement }: StatementPaymentsSectionProps) {
    const styles = useThemedStyles(createStyles);
    const { t, language } = useI18n();
    const { scaleFont } = useResponsive();
    const locale = getCurrencyLocale(language);
    const describeError = useStatementErrorMessage();
    const { addPayment, correctPayment, voidPayment, isWorking } = useStatementPayments(
        statement.id,
        statement.paymentVersion,
    );
    const [modal, setModal] = useState<ModalState>({ kind: 'none' });
    const [error, setError] = useState<string | null>(null);

    const summary = statement.paymentSummary;
    const currency = summary.currency ?? statement.currency ?? '';
    const money = (amount: number | null) =>
        amount == null ? '-' : formatCurrency(amount, currency || undefined, locale);
    const states = classifyPaymentHistory(statement.paymentHistory);
    const canPay = !summary.isPaid && Boolean(currency);
    const closeModal = () => {
        setModal({ kind: 'none' });
        setError(null);
    };
    const fail = (failure: StatementError) =>
        setError(describeError(failure, 'statements.payments.failed'));

    const submitPayment = async (value: PaymentModalSubmit) => {
        setError(null);
        const base = {
            amount: value.amount,
            currency: value.currency,
            paidAt: value.paidAt,
            note: value.note,
        };
        const result =
            modal.kind === 'correct'
                ? await correctPayment(modal.payment.id, base, value.reason ?? '')
                : await addPayment(base);
        if (result.ok) {
            closeModal();
        } else {
            fail(result.error);
        }
    };

    const submitVoid = async (reason: string) => {
        if (modal.kind !== 'void') {
            return;
        }
        setError(null);
        const result = await voidPayment(modal.payment.id, reason);
        if (result.ok) {
            closeModal();
        } else {
            fail(result.error);
        }
    };

    const stateLabel = (payment: StatementPayment) => {
        const state = states[payment.id];
        return t(`statements.payments.state.${state}`);
    };

    return (
        <View style={styles.card}>
            <Text style={[styles.heading, { fontSize: scaleFont(typography.fontSize.lg) }]}>
                {t('statements.payments.title')}
            </Text>

            <View style={styles.summaryRow}>
                <SummaryCell label={t('statements.payments.paid')} value={money(summary.paidTotal)} />
                <SummaryCell
                    label={t('statements.payments.remaining')}
                    value={money(summary.remainingNoInterest ?? summary.remainingStatement)}
                />
            </View>
            {summary.overpaid > 0 ? (
                <Text style={styles.warning}>
                    {t('statements.payments.overpaid', { amount: money(summary.overpaid) })}
                </Text>
            ) : null}

            {canPay ? (
                <Button
                    title={t('statements.payments.add')}
                    onPress={() => setModal({ kind: 'add' })}
                />
            ) : null}

            {statement.paymentHistory.length === 0 ? (
                <Text style={styles.muted}>{t('statements.payments.empty')}</Text>
            ) : (
                statement.paymentHistory.map(payment => {
                    const state = states[payment.id];
                    const active = state === 'active';
                    return (
                        <View key={payment.id} style={styles.payment}>
                            <View style={styles.paymentHead}>
                                <Text
                                    style={[
                                        styles.paymentAmount,
                                        !active ? styles.struck : null,
                                        { fontSize: scaleFont(typography.fontSize.base) },
                                    ]}
                                >
                                    {formatCurrency(payment.amount, payment.currency || undefined, locale)}
                                </Text>
                                <Text style={[styles.badge, active ? styles.badgeActive : null]}>
                                    {stateLabel(payment)}
                                </Text>
                            </View>
                            <Text style={styles.muted}>
                                {formatStatementDate(payment.paidAt, locale) ?? payment.paidAt}
                            </Text>
                            {payment.note ? <Text style={styles.note}>{payment.note}</Text> : null}
                            {payment.voidReason ? (
                                <Text style={styles.muted}>
                                    {t('statements.payments.voidReasonLabel', { reason: payment.voidReason })}
                                </Text>
                            ) : null}
                            {!payment.voidedAt ? (
                                <View style={styles.paymentActions}>
                                    <TouchableOpacity
                                        onPress={() => setModal({ kind: 'correct', payment })}
                                        disabled={isWorking}
                                        accessibilityRole="button"
                                    >
                                        <Text style={styles.link}>{t('statements.payments.correct')}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => setModal({ kind: 'void', payment })}
                                        disabled={isWorking}
                                        accessibilityRole="button"
                                    >
                                        <Text style={[styles.link, styles.danger]}>
                                            {t('statements.payments.void')}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            ) : null}
                        </View>
                    );
                })
            )}

            <StatementPaymentModal
                visible={modal.kind === 'add' || modal.kind === 'correct'}
                currency={currency}
                initialAmount={
                    modal.kind === 'correct' ? modal.payment.amount : suggestedPaymentAmount(summary)
                }
                initialPaidAt={modal.kind === 'correct' ? modal.payment.paidAt : null}
                initialNote={modal.kind === 'correct' ? modal.payment.note : null}
                correction={modal.kind === 'correct'}
                loading={isWorking}
                errorMessage={error}
                onClose={closeModal}
                onSubmit={submitPayment}
            />
            <StatementReasonModal
                visible={modal.kind === 'void'}
                title={t('statements.payments.voidTitle')}
                description={t('statements.payments.voidDescription')}
                label={t('statements.payments.voidReason')}
                confirmLabel={t('statements.payments.void')}
                loading={isWorking}
                errorMessage={error}
                onClose={closeModal}
                onConfirm={submitVoid}
            />
        </View>
    );
}

function SummaryCell({ label, value }: { label: string; value: string }) {
    const styles = useThemedStyles(createStyles);
    return (
        <View style={styles.cell}>
            <Text style={styles.muted}>{label}</Text>
            <Text style={styles.cellValue}>{value}</Text>
        </View>
    );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
    card: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.xl,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.base,
        gap: spacing.sm,
    },
    heading: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.bold,
    },
    summaryRow: {
        flexDirection: 'row',
        gap: spacing.base,
    },
    cell: {
        flex: 1,
        gap: 2,
    },
    cellValue: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.semibold,
        fontSize: typography.fontSize.base,
    },
    muted: {
        color: colors.textSecondary,
        fontSize: typography.fontSize.sm,
    },
    warning: {
        color: colors.warning,
        fontSize: typography.fontSize.sm,
    },
    payment: {
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: colors.border,
        paddingTop: spacing.sm,
        gap: 2,
    },
    paymentHead: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    paymentAmount: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.semibold,
    },
    struck: {
        textDecorationLine: 'line-through',
        color: colors.textMuted,
    },
    badge: {
        color: colors.textSecondary,
        fontSize: typography.fontSize.xs,
        fontWeight: typography.fontWeight.semibold,
    },
    badgeActive: {
        color: colors.success,
    },
    note: {
        color: colors.textPrimary,
        fontSize: typography.fontSize.sm,
    },
    paymentActions: {
        flexDirection: 'row',
        gap: spacing.lg,
        paddingTop: spacing.xs,
    },
    link: {
        color: colors.primaryAction,
        fontWeight: typography.fontWeight.semibold,
        fontSize: typography.fontSize.sm,
    },
    danger: {
        color: colors.error,
    },
});
