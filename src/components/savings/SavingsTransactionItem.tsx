import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { SavingsTransaction } from '../../types/index';
import { useI18n } from '../../hooks/useI18n';
import {
    borderRadius,
    spacing,
    typography,
    useResponsive,
    useTheme,
    useThemedStyles,
    SemanticColors,
} from '../../theme/index';
import { formatCurrency } from '../../utils/core/format';
import { formatSavingsDateTime, withSavingsAlpha } from '../../utils/domain/savings';

interface SavingsTransactionItemProps {
    transaction: SavingsTransaction;
    locale: 'es-MX' | 'en-US';
}

export function SavingsTransactionItem({
    transaction,
    locale,
}: SavingsTransactionItemProps) {
    const styles = useThemedStyles(createStyles);
    const { colors } = useTheme();
    const { scaleFont } = useResponsive();
    const { t } = useI18n();
    const isDeposit = transaction.type === 'DEPOSIT';
    const accentColor = isDeposit ? colors.success : colors.error;
    const iconName = isDeposit ? 'add-circle-outline' : 'remove-circle-outline';
    const amountPrefix = isDeposit ? '+' : '-';

    return (
        <View style={styles.row}>
            <View
                style={[
                    styles.iconWrap,
                    {
                        backgroundColor: withSavingsAlpha(accentColor, 0.14),
                        borderColor: withSavingsAlpha(accentColor, 0.28),
                    },
                ]}
            >
                <Icon name={iconName} size={18} color={accentColor} />
            </View>
            <View style={styles.copy}>
                <Text
                    style={[
                        styles.title,
                        { fontSize: scaleFont(typography.fontSize.base) },
                    ]}
                >
                    {isDeposit
                        ? t('savings.depositTypeLabel')
                        : t('savings.withdrawTypeLabel')}
                </Text>
                <Text
                    style={[
                        styles.subtitle,
                        { fontSize: scaleFont(typography.fontSize.sm) },
                    ]}
                >
                    {formatSavingsDateTime(transaction.createdAt, locale)}
                </Text>
            </View>
            <Text
                style={[
                    styles.amount,
                    {
                        fontSize: scaleFont(typography.fontSize.base),
                        color: accentColor,
                    },
                ]}
            >
                {amountPrefix}
                {formatCurrency(transaction.amount, 'MXN')}
            </Text>
        </View>
    );
}

const createStyles = (colors: SemanticColors) =>
    StyleSheet.create({
        row: {
            flexDirection: 'row',
            alignItems: 'center',
            padding: spacing.base,
            borderRadius: borderRadius.lg,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surfaceCard,
        },
        iconWrap: {
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
        },
        copy: {
            flex: 1,
            marginLeft: spacing.base,
            marginRight: spacing.base,
        },
        title: {
            color: colors.textPrimary,
            fontWeight: typography.fontWeight.semibold,
        },
        subtitle: {
            color: colors.textSecondary,
            marginTop: spacing.xs,
        },
        amount: {
            fontWeight: typography.fontWeight.bold,
        },
    });
