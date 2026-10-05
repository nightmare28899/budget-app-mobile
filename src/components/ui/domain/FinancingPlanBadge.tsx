import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FinancingPlan } from '../../../types/index';
import { formatCurrency } from '../../../utils/core/format';
import {
    buildFinancingPlanAmountLabel,
    buildFinancingPlanLabel,
} from '../../../utils/domain/financingPlan';
import { useI18n } from '../../../hooks/shared/useI18n';
import {
    SemanticColors,
    borderRadius,
    spacing,
    typography,
    useThemedStyles,
} from '../../../theme/index';

interface FinancingPlanBadgeProps {
    plan?: FinancingPlan | null;
    currency: string;
}

export function FinancingPlanBadge({ plan, currency }: FinancingPlanBadgeProps) {
    const styles = useThemedStyles(createStyles);
    const { t, language } = useI18n();
    const label = buildFinancingPlanLabel(plan, t);
    if (!label) {
        return null;
    }
    const locale = language === 'es' ? 'es-MX' : 'en-US';
    const amountLabel = buildFinancingPlanAmountLabel(
        plan,
        (amount) => formatCurrency(amount, currency, locale),
        t,
    );

    return (
        <View style={styles.badge}>
            <Text style={styles.text} numberOfLines={1}>
                {amountLabel ? `${label} · ${amountLabel}` : label}
            </Text>
        </View>
    );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
    badge: {
        alignSelf: 'flex-start',
        marginTop: spacing.xs,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: borderRadius.full,
        backgroundColor: colors.surfaceElevated,
        borderWidth: 1,
        borderColor: colors.border,
    },
    text: {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.semibold,
        color: colors.primaryLight,
    },
});
