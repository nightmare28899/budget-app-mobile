import React from 'react';
import {
    FocusEvent,
    Platform,
    StyleProp,
    StyleSheet,
    Text,
    TextInput,
    View,
    ViewStyle,
} from 'react-native';
import {
    borderRadius,
    SemanticColors,
    spacing,
    typography,
    useResponsive,
    useTheme,
    useThemedStyles,
} from '../../../theme/index';
import { FieldError } from '../primitives/FieldError';

type AmountEntryCardProps = {
    value: string;
    onChangeText: (value: string) => void;
    currencySymbol: string;
    currency: string;
    previewLabel: string;
    accessibilityLabel: string;
    placeholder?: string;
    accentColor?: string;
    error?: string;
    onFocus?: (event: FocusEvent) => void;
    containerStyle?: StyleProp<ViewStyle>;
};

function withHexAlpha(color: string, alpha: string) {
    return /^#[0-9a-f]{6}$/i.test(color) ? `${color}${alpha}` : color;
}

export function AmountEntryCard({
    value,
    onChangeText,
    currencySymbol,
    currency,
    previewLabel,
    accessibilityLabel,
    placeholder = '0.00',
    accentColor,
    error,
    onFocus,
    containerStyle,
}: AmountEntryCardProps) {
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);
    const { scaleFont } = useResponsive();
    const resolvedAccentColor = accentColor ?? colors.primaryAction;

    return (
        <View
            style={[
                styles.card,
                {
                    borderColor: withHexAlpha(resolvedAccentColor, '55'),
                    backgroundColor: withHexAlpha(colors.surfaceElevated, 'E8'),
                },
                containerStyle,
            ]}
        >
            <View style={styles.amountRow}>
                <Text
                    style={[
                        styles.currencySymbol,
                        { fontSize: scaleFont(typography.fontSize['3xl']) },
                    ]}
                >
                    {currencySymbol}
                </Text>
                <View style={styles.inputWrap}>
                    <TextInput
                        style={[
                            styles.input,
                            {
                                fontSize: scaleFont(typography.fontSize['5xl']),
                                lineHeight: scaleFont(typography.fontSize['5xl'] * 1.08),
                                height: scaleFont(typography.fontSize['5xl'] + 18),
                            },
                        ]}
                        value={value}
                        onChangeText={onChangeText}
                        onFocus={onFocus}
                        placeholder=""
                        keyboardType="decimal-pad"
                        accessibilityLabel={accessibilityLabel}
                        accessibilityHint={error ?? placeholder}
                    />
                    {!value ? (
                        <View
                            style={styles.placeholderOverlay}
                            pointerEvents="none"
                            accessible={false}
                        >
                            <Text
                                style={[
                                    styles.placeholderText,
                                    { fontSize: scaleFont(typography.fontSize['5xl']) },
                                ]}
                            >
                                {placeholder}
                            </Text>
                        </View>
                    ) : null}
                </View>
                <View
                    style={[
                        styles.currencyBadge,
                        { backgroundColor: withHexAlpha(resolvedAccentColor, '20') },
                    ]}
                >
                    <Text
                        style={[
                            styles.currencyBadgeText,
                            {
                                color: resolvedAccentColor,
                                fontSize: scaleFont(typography.fontSize.sm),
                            },
                        ]}
                    >
                        {currency}
                    </Text>
                </View>
            </View>
            <Text
                style={[
                    styles.preview,
                    { fontSize: scaleFont(typography.fontSize.sm) },
                ]}
            >
                {previewLabel}
            </Text>
            <FieldError message={error} />
        </View>
    );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
    card: {
        borderRadius: borderRadius.xl,
        borderWidth: 1,
        padding: spacing.xl,
        gap: spacing.sm,
    },
    amountRow: {
        width: '100%',
        maxWidth: 360,
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
    },
    currencySymbol: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.semibold,
        marginBottom: spacing.sm,
    },
    inputWrap: {
        flexGrow: 1,
        flexShrink: 1,
        minWidth: Platform.OS === 'android' ? 150 : 130,
        maxWidth: Platform.OS === 'android' ? 240 : 250,
        position: 'relative',
    },
    input: {
        width: '100%',
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.bold,
        textAlign: 'center',
        textAlignVertical: 'center',
        includeFontPadding: Platform.OS === 'android',
        paddingVertical: Platform.OS === 'android' ? spacing.xs : 0,
        paddingHorizontal: spacing.xs,
    },
    placeholderOverlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
    },
    placeholderText: {
        color: colors.textMuted,
        fontWeight: typography.fontWeight.bold,
        textAlign: 'center',
    },
    currencyBadge: {
        alignSelf: 'center',
        borderRadius: borderRadius.full,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        marginBottom: spacing.sm,
    },
    currencyBadgeText: {
        fontWeight: typography.fontWeight.semibold,
    },
    preview: {
        color: colors.textMuted,
        textAlign: 'center',
        lineHeight: 20,
    },
});
