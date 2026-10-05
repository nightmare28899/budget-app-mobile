import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useI18n } from '../../hooks/shared/useI18n';
import { CreditCardPortfolioOverview } from '../../types/index';
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
import { CardKpiTile } from './CardKpiTile';
import { formatCardShortDate } from './creditCardFormat';

type CreditCardKpiSectionProps = {
    portfolio: CreditCardPortfolioOverview;
    /** Records counted in the current cycles of the active cards. */
    transactionCount: number;
};

export function CreditCardKpiSection({ portfolio, transactionCount }: CreditCardKpiSectionProps) {
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);
    const { t, language } = useI18n();
    const { scaleFont } = useResponsive();
    const locale = getCurrencyLocale(language);
    const showCurrencyLabel = portfolio.byCurrency.length > 1;

    return (
        <View style={[styles.container, { borderColor: withAlpha(colors.primaryAction, 0.28) }]}>
            <View style={styles.header}>
                <Text style={[styles.title, { fontSize: scaleFont(typography.fontSize.lg) }]}>
                    {t('creditCards.walletTitle')}
                </Text>
                <Text style={[styles.subtitle, { fontSize: scaleFont(typography.fontSize.sm) }]}>
                    {t('creditCards.kpiCards', { count: portfolio.activeCards })}
                </Text>
            </View>

            {portfolio.byCurrency.map(group => {
                const money = (amount: number) => formatCurrency(amount, group.currency, locale);
                const hasLimit = group.totalCreditLimit > 0;
                const dueDate = formatCardShortDate(group.earliestPaymentDueDate, locale);
                const usedHint = hasLimit
                    ? `${t('creditCards.kpiAvailable')} ${money(group.totalAvailableCredit)}`
                    : null;

                return (
                    <View key={group.currency} style={styles.group}>
                        {showCurrencyLabel ? (
                            <Text
                                style={[styles.groupLabel, { fontSize: scaleFont(typography.fontSize.xs) }]}
                            >
                                {group.currency}
                            </Text>
                        ) : null}
                        <View style={styles.grid}>
                            {hasLimit ? (
                                <CardKpiTile
                                    label={t('creditCards.kpiCapacity')}
                                    value={money(group.totalCreditLimit)}
                                    hint={
                                        group.utilizationPercent != null
                                            ? `${t('creditCards.utilization')} ${group.utilizationPercent}%`
                                            : null
                                    }
                                />
                            ) : null}
                            <CardKpiTile
                                label={t('creditCards.kpiUsed')}
                                value={money(group.totalOwedBalance)}
                                hint={usedHint}
                            />
                            <CardKpiTile
                                label={t('creditCards.kpiPaymentDue')}
                                value={
                                    group.totalCurrentPaymentDue > 0
                                        ? money(group.totalCurrentPaymentDue)
                                        : t('creditCards.kpiNoPending')
                                }
                                hint={
                                    group.totalCurrentPaymentDue > 0 && dueDate
                                        ? t('creditCards.kpiNextDue', { date: dueDate })
                                        : null
                                }
                                valueColor={
                                    group.totalCurrentPaymentDue > 0 ? colors.warning : undefined
                                }
                            />
                            {group.monthlyRecurringSpend > 0 ? (
                                <CardKpiTile
                                    label={t('creditCards.monthlyRecurring')}
                                    value={money(group.monthlyRecurringSpend)}
                                />
                            ) : null}
                        </View>
                    </View>
                );
            })}

            <View style={styles.grid}>
                <CardKpiTile
                    label={t('creditCards.kpiTransactions')}
                    value={String(transactionCount)}
                    hint={t('creditCards.kpiTransactionsHint')}
                />
            </View>
        </View>
    );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
    container: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.xl,
        borderWidth: 1,
        padding: spacing.base,
        gap: spacing.base,
    },
    header: {
        gap: spacing.xs,
    },
    title: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.bold,
    },
    subtitle: {
        color: colors.textSecondary,
    },
    group: {
        gap: spacing.xs,
    },
    groupLabel: {
        color: colors.textMuted,
        fontWeight: typography.fontWeight.semibold,
        letterSpacing: 0.5,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
});
