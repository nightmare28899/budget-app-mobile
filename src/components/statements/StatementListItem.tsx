import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useI18n } from '../../hooks/shared/useI18n';
import { creditCardTheme } from '../../modules/creditCards/creditCardVisuals';
import { formatStatementDate, formatStatementPeriod } from '../../modules/statements/statementFormat';
import type { CreditCard } from '../../types/index';
import type { StatementImportListItem } from '../../types/statementImports';
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
import { formatCardDisplayName } from '../creditCards/creditCardFormat';
import { StatementStatusBadge } from './StatementStatusBadge';

type StatementListItemProps = {
    item: StatementImportListItem;
    card?: CreditCard;
    onPress: () => void;
};

export function StatementListItem({ item, card, onPress }: StatementListItemProps) {
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);
    const { t, language } = useI18n();
    const { scaleFont } = useResponsive();
    const locale = getCurrencyLocale(language);
    const theme = card ? creditCardTheme(card) : null;
    const accent = theme?.brand ?? colors.primaryAction;
    const period = formatStatementPeriod(item.periodStart, item.periodEnd, locale);
    const dueDate = formatStatementDate(item.paymentSummary.dueDate, locale);
    const currency = item.currency ?? undefined;
    const showPayment = item.status === 'CONFIRMED' || item.closingBalance != null;

    const paymentColor =
        item.paymentStatus === 'PAID'
            ? colors.success
            : item.paymentStatus === 'PARTIAL'
                ? colors.warning
                : colors.error;
    const paymentLabel =
        item.paymentStatus === 'PAID'
            ? t('statements.paymentStatus.PAID')
            : item.paymentStatus === 'PARTIAL'
                ? t('statements.paymentStatus.PARTIAL')
                : t('statements.paymentStatus.UNPAID');

    return (
        <TouchableOpacity
            style={[styles.item, { borderColor: withAlpha(accent, 0.4) }]}
            activeOpacity={0.85}
            onPress={onPress}
            accessibilityRole="button"
        >
            <View style={[styles.strip, { backgroundColor: accent }]} />
            <View style={styles.body}>
                <View style={styles.topRow}>
                    <View style={styles.titleWrap}>
                        <Text
                            style={[styles.title, { fontSize: scaleFont(typography.fontSize.base) }]}
                            numberOfLines={1}
                        >
                            {card ? formatCardDisplayName(card) : t('statements.unknownCard')}
                            {card?.last4 ? ` ·${card.last4}` : ''}
                        </Text>
                        <Text
                            style={[styles.subtitle, { fontSize: scaleFont(typography.fontSize.sm) }]}
                            numberOfLines={1}
                        >
                            {period ?? item.sourceFileName ?? t('statements.periodUnknown')}
                        </Text>
                    </View>
                    <StatementStatusBadge status={item.status} />
                </View>

                {showPayment ? (
                    <View style={styles.metricsRow}>
                        <View style={styles.metric}>
                            <Text style={[styles.metricLabel, { fontSize: scaleFont(typography.fontSize.xs) }]}>
                                {t('statements.closingBalance')}
                            </Text>
                            <Text style={[styles.metricValue, { fontSize: scaleFont(typography.fontSize.base) }]}>
                                {item.closingBalance != null
                                    ? formatCurrency(item.closingBalance, currency, locale)
                                    : '-'}
                            </Text>
                        </View>
                        {item.status === 'CONFIRMED' ? (
                            <View style={styles.metricRight}>
                                <Text style={[styles.metricLabel, { fontSize: scaleFont(typography.fontSize.xs) }]}>
                                    {t('statements.paymentStatusLabel')}
                                </Text>
                                <Text
                                    style={[
                                        styles.metricValue,
                                        { color: paymentColor, fontSize: scaleFont(typography.fontSize.sm) },
                                    ]}
                                >
                                    {paymentLabel}
                                </Text>
                            </View>
                        ) : null}
                    </View>
                ) : null}

                <View style={styles.footerRow}>
                    {dueDate && item.paymentStatus !== 'PAID' ? (
                        <Text style={[styles.footerText, { fontSize: scaleFont(typography.fontSize.xs) }]}>
                            {t('statements.dueOn', { date: dueDate })}
                        </Text>
                    ) : null}
                    {item.warningCount > 0 ? (
                        <Text
                            style={[
                                styles.footerText,
                                { color: colors.warning, fontSize: scaleFont(typography.fontSize.xs) },
                            ]}
                        >
                            {t('statements.warnings', { count: item.warningCount })}
                        </Text>
                    ) : null}
                </View>
            </View>
        </TouchableOpacity>
    );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
    item: {
        flexDirection: 'row',
        backgroundColor: colors.surface,
        borderRadius: borderRadius.xl,
        borderWidth: 1,
        overflow: 'hidden',
    },
    strip: {
        width: 6,
    },
    body: {
        flex: 1,
        padding: spacing.base,
        gap: spacing.sm,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: spacing.sm,
    },
    titleWrap: {
        flex: 1,
        gap: 2,
    },
    title: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.semibold,
    },
    subtitle: {
        color: colors.textSecondary,
    },
    metricsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: spacing.sm,
        backgroundColor: colors.surfaceElevated,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.sm,
    },
    metric: {
        gap: 2,
    },
    metricRight: {
        gap: 2,
        alignItems: 'flex-end',
    },
    metricLabel: {
        color: colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    metricValue: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.semibold,
    },
    footerRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    footerText: {
        color: colors.textMuted,
    },
});
