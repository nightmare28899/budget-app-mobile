import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Button } from '../ui/primitives/Button';
import { useI18n } from '../../hooks/shared/useI18n';
import { useStatementDetail } from '../../hooks/statements/useStatementDetail';
import {
    computeCardPaymentProgress,
    recentActivePayments,
} from '../../modules/creditCards/cardStatementPayments';
import { formatStatementDate } from '../../modules/statements/statementFormat';
import type { CreditCardStatementSummary } from '../../types/index';
import { formatCurrency } from '../../utils/core/format';
import { getCurrencyLocale } from '../../utils/domain/currency';
import {
    borderRadius,
    SemanticColors,
    spacing,
    typography,
    useThemedStyles,
} from '../../theme/index';

type CardPaymentProgressProps = {
    summary: CreditCardStatementSummary;
    currency: string | undefined;
    barColor: string;
    onRegister: () => void;
    onViewAll: () => void;
};

/** Progress + "Registrar abono" for the latest statement; payments load only on demand. */
export function CardPaymentProgress({
    summary,
    currency,
    barColor,
    onRegister,
    onViewAll,
}: CardPaymentProgressProps) {
    const styles = useThemedStyles(createStyles);
    const { t, language } = useI18n();
    const locale = getCurrencyLocale(language);
    const [expanded, setExpanded] = useState(false);
    const statementId = summary.statementImportId ?? '';
    const { statement, isLoading } = useStatementDetail(statementId, expanded);
    const progress = computeCardPaymentProgress(summary);
    const money = (amount: number) => formatCurrency(amount, currency, locale);

    if (!statementId) {
        return null;
    }
    if (summary.paymentStatus === 'PAID') {
        return <Text style={styles.paid}>{t('cardPayments.fullyPaid')}</Text>;
    }

    const recent = recentActivePayments(statement?.paymentHistory ?? [], 3);

    return (
        <View style={styles.wrap}>
            {progress ? (
                <>
                    <Text style={styles.progressText}>
                        {t('cardPayments.progress', {
                            paid: money(progress.paid),
                            total: money(progress.total),
                            remaining: money(progress.remaining),
                        })}
                    </Text>
                    <View style={styles.track}>
                        <View
                            style={[
                                styles.fill,
                                { width: `${Math.round(progress.fraction * 100)}%`, backgroundColor: barColor },
                            ]}
                        />
                    </View>
                </>
            ) : null}

            <Button title={t('cardPayments.register')} onPress={onRegister} />

            <TouchableOpacity
                onPress={() => setExpanded(value => !value)}
                accessibilityRole="button"
                activeOpacity={0.8}
            >
                <Text style={styles.link}>
                    {expanded ? t('cardPayments.hidePayments') : t('cardPayments.showPayments')}
                </Text>
            </TouchableOpacity>

            {expanded ? (
                <View style={styles.list}>
                    <Text style={styles.muted}>
                        {isLoading ? t('common.loading') : t('cardPayments.recent')}
                    </Text>
                    {recent.map(payment => (
                        <View key={payment.id} style={styles.payment}>
                            <Text style={styles.paymentAmount}>
                                {formatCurrency(payment.amount, payment.currency || currency, locale)}
                            </Text>
                            <Text style={styles.muted}>
                                {formatStatementDate(payment.paidAt, locale) ?? payment.paidAt}
                            </Text>
                        </View>
                    ))}
                    {!isLoading && statement ? (
                        <TouchableOpacity onPress={onViewAll} accessibilityRole="button">
                            <Text style={styles.link}>{t('cardPayments.viewAll')}</Text>
                        </TouchableOpacity>
                    ) : null}
                </View>
            ) : null}
        </View>
    );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
    wrap: {
        gap: spacing.sm,
    },
    progressText: {
        color: colors.textPrimary,
        fontSize: typography.fontSize.sm,
    },
    track: {
        height: 6,
        borderRadius: borderRadius.full,
        backgroundColor: colors.surfaceElevated,
        overflow: 'hidden',
    },
    fill: {
        height: '100%',
        borderRadius: borderRadius.full,
    },
    paid: {
        color: colors.success,
        fontWeight: typography.fontWeight.semibold,
        fontSize: typography.fontSize.sm,
    },
    link: {
        color: colors.primaryAction,
        fontWeight: typography.fontWeight.semibold,
        fontSize: typography.fontSize.sm,
    },
    list: {
        gap: spacing.xs,
    },
    muted: {
        color: colors.textSecondary,
        fontSize: typography.fontSize.sm,
    },
    payment: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    paymentAmount: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.semibold,
        fontSize: typography.fontSize.sm,
    },
});
