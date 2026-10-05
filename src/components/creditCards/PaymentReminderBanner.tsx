import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { listPendingPayments, resolveReminderKind } from '../../modules/creditCards/cardPaymentSchedule';
import { useI18n } from '../../hooks/shared/useI18n';
import { CreditCardOverviewCard } from '../../types/index';
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
import { formatCardDisplayName, formatCardShortDate } from './creditCardFormat';

type PaymentReminderBannerProps = {
    cards: CreditCardOverviewCard[];
};

/** In-app reminder for the nearest pending statement payment. */
export function PaymentReminderBanner({ cards }: PaymentReminderBannerProps) {
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);
    const { t, language } = useI18n();
    const { scaleFont } = useResponsive();
    const locale = getCurrencyLocale(language);
    const pending = useMemo(() => listPendingPayments(cards), [cards]);

    if (cards.every(card => !card.isActive)) {
        return null;
    }

    const urgent = pending.find(item => item.dueDate !== null && item.daysUntilDue !== null);
    const first = pending[0];
    let message: string;
    let title = t('creditCards.reminder.title');
    let tone = colors.success;

    if (urgent && urgent.daysUntilDue !== null) {
        const summary = urgent.card.statementSummary;
        const amount = summary?.currentPaymentDue ?? summary?.noInterestTarget ?? null;
        const days = urgent.daysUntilDue;
        const kind = resolveReminderKind(days);
        tone = days < 0 ? colors.error : days <= 3 ? colors.warning : colors.primaryAction;
        message = [
            t(`creditCards.reminder.${kind}`, {
                card: formatCardDisplayName(urgent.card),
                count: Math.abs(days),
                date: formatCardShortDate(urgent.dueDate, locale) ?? '',
            }),
            amount != null
                ? t('creditCards.reminder.amount', {
                    amount: formatCurrency(amount, urgent.card.currency, locale),
                })
                : null,
        ]
            .filter(Boolean)
            .join(' ');
    } else if (first) {
        tone = colors.warning;
        message = t('creditCards.reminder.noDueDate', {
            card: formatCardDisplayName(first.card),
        });
    } else {
        title = t('creditCards.reminder.allClear');
        message = t('creditCards.reminder.allClearDescription');
    }

    return (
        <View
            style={[
                styles.banner,
                { borderColor: withAlpha(tone, 0.35), backgroundColor: withAlpha(tone, 0.1) },
            ]}
        >
            <View style={[styles.iconWrap, { backgroundColor: withAlpha(tone, 0.18) }]}>
                <Icon
                    name={first ? 'notifications-outline' : 'checkmark-circle-outline'}
                    size={20}
                    color={tone}
                />
            </View>
            <View style={styles.textWrap}>
                <Text style={[styles.title, { fontSize: scaleFont(typography.fontSize.sm) }]}>
                    {title}
                </Text>
                <Text style={[styles.message, { fontSize: scaleFont(typography.fontSize.xs) }]}>
                    {message}
                </Text>
            </View>
        </View>
    );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
    banner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        borderWidth: 1,
        borderRadius: borderRadius.xl,
        padding: spacing.sm,
    },
    iconWrap: {
        width: 36,
        height: 36,
        borderRadius: borderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
    },
    textWrap: {
        flex: 1,
        gap: 2,
    },
    title: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.semibold,
    },
    message: {
        color: colors.textSecondary,
        lineHeight: 16,
    },
});
