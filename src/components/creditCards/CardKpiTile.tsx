import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
    borderRadius,
    SemanticColors,
    spacing,
    typography,
    useResponsive,
    useThemedStyles,
} from '../../theme/index';

type CardKpiTileProps = {
    label: string;
    value: string;
    hint?: string | null;
    valueColor?: string;
};

export function CardKpiTile({ label, value, hint, valueColor }: CardKpiTileProps) {
    const styles = useThemedStyles(createStyles);
    const { scaleFont } = useResponsive();

    return (
        <View style={styles.tile}>
            <Text style={[styles.label, { fontSize: scaleFont(typography.fontSize.xs) }]}>
                {label}
            </Text>
            <Text
                style={[
                    styles.value,
                    { fontSize: scaleFont(typography.fontSize.base) },
                    valueColor ? { color: valueColor } : null,
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
            >
                {value}
            </Text>
            {hint ? (
                <Text style={[styles.hint, { fontSize: scaleFont(typography.fontSize.xs) }]}>
                    {hint}
                </Text>
            ) : null}
        </View>
    );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
    tile: {
        flexBasis: '48%',
        flexGrow: 1,
        backgroundColor: colors.surfaceElevated,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.sm,
        gap: 4,
    },
    label: {
        color: colors.textMuted,
        fontWeight: typography.fontWeight.medium,
    },
    value: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.semibold,
    },
    hint: {
        color: colors.textSecondary,
        lineHeight: 16,
    },
});
