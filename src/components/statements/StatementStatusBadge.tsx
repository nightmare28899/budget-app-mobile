import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useI18n } from '../../hooks/shared/useI18n';
import { statementStatusTone, StatementTone } from '../../modules/statements/statementStatus';
import type { StatementImportStatus } from '../../types/statementImports';
import { borderRadius, SemanticColors, spacing, typography, useResponsive, useTheme } from '../../theme/index';
import { withAlpha } from '../../utils/domain/subscriptions';

export function statementToneColor(tone: StatementTone, colors: SemanticColors): string {
    switch (tone) {
        case 'success':
            return colors.success;
        case 'warning':
            return colors.warning;
        case 'danger':
            return colors.error;
        case 'info':
            return colors.info;
        default:
            return colors.textMuted;
    }
}

type StatementStatusBadgeProps = {
    status: StatementImportStatus;
};

export function StatementStatusBadge({ status }: StatementStatusBadgeProps) {
    const { colors } = useTheme();
    const { t } = useI18n();
    const { scaleFont } = useResponsive();
    const color = statementToneColor(statementStatusTone(status), colors);

    return (
        <View
            style={[
                styles.badge,
                { backgroundColor: withAlpha(color, 0.14), borderColor: withAlpha(color, 0.32) },
            ]}
        >
            <View style={[styles.dot, { backgroundColor: color }]} />
            <Text style={[styles.text, { color, fontSize: scaleFont(typography.fontSize.xs) }]}>
                {t(`statements.status.${status}`)}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: borderRadius.full,
        borderWidth: 1,
        alignSelf: 'flex-start',
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    text: {
        fontWeight: typography.fontWeight.semibold,
    },
});
