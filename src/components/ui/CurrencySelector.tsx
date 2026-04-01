import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
    borderRadius,
    spacing,
    typography,
    useResponsive,
    useThemedStyles,
} from '../../theme';
import { CURRENCY_OPTIONS, DEFAULT_CURRENCY } from '../../utils/currency';

type CurrencySelectorProps = {
    label?: string;
    value?: string | null;
    onChange: (currency: string) => void;
    helperText?: string;
    containerStyle?: any;
};

export function CurrencySelector({
    label,
    value,
    onChange,
    helperText,
    containerStyle,
}: CurrencySelectorProps) {
    const styles = useThemedStyles(createStyles);
    const { scaleFont } = useResponsive();
    const selectedCurrency = value || DEFAULT_CURRENCY;

    return (
        <View style={[styles.container, containerStyle]}>
            {label ? (
                <Text
                    style={[
                        styles.label,
                        { fontSize: scaleFont(typography.fontSize.sm) },
                    ]}
                >
                    {label}
                </Text>
            ) : null}

            <View style={styles.optionsWrap}>
                {CURRENCY_OPTIONS.map((option) => {
                    const isActive = selectedCurrency === option.code;
                    return (
                        <TouchableOpacity
                            key={option.code}
                            style={[
                                styles.option,
                                isActive ? styles.optionActive : null,
                            ]}
                            activeOpacity={0.84}
                            onPress={() => onChange(option.code)}
                        >
                            <Text
                                style={[
                                    styles.optionCode,
                                    isActive ? styles.optionCodeActive : null,
                                    { fontSize: scaleFont(typography.fontSize.sm) },
                                ]}
                            >
                                {option.code}
                            </Text>
                            <Text
                                style={[
                                    styles.optionSymbol,
                                    isActive ? styles.optionSymbolActive : null,
                                    { fontSize: scaleFont(typography.fontSize.xs) },
                                ]}
                            >
                                {option.symbol}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {helperText ? (
                <Text
                    style={[
                        styles.helperText,
                        { fontSize: scaleFont(typography.fontSize.xs) },
                    ]}
                >
                    {helperText}
                </Text>
            ) : null}
        </View>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        gap: spacing.sm,
    },
    label: {
        color: colors.textSecondary,
        fontWeight: typography.fontWeight.medium,
        marginLeft: spacing.xs,
    },
    optionsWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    option: {
        minWidth: 78,
        paddingHorizontal: spacing.base,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.full,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surfaceElevated,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
    },
    optionActive: {
        borderColor: colors.primaryLight,
        backgroundColor: colors.accentLight,
    },
    optionCode: {
        color: colors.textSecondary,
        fontWeight: typography.fontWeight.semibold,
    },
    optionCodeActive: {
        color: colors.primaryAction,
    },
    optionSymbol: {
        color: colors.textMuted,
        fontWeight: typography.fontWeight.medium,
    },
    optionSymbolActive: {
        color: colors.primaryAction,
    },
    helperText: {
        color: colors.textMuted,
        marginLeft: spacing.xs,
        lineHeight: 18,
    },
});
