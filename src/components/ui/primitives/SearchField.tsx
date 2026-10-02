import React, { useState } from 'react';
import {
    StyleProp,
    StyleSheet,
    TextInput,
    TextInputProps,
    TextStyle,
    TouchableOpacity,
    View,
    ViewStyle,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {
    borderRadius,
    SemanticColors,
    spacing,
    typography,
    useResponsive,
    useTheme,
    useThemedStyles,
} from '../../../theme/index';

type SearchFieldProps = Omit<TextInputProps, 'style'> & {
    containerStyle?: StyleProp<ViewStyle>;
    inputStyle?: StyleProp<TextStyle>;
    clearAccessibilityLabel: string;
};

export function SearchField({
    value,
    onChangeText,
    onFocus,
    onBlur,
    containerStyle,
    inputStyle,
    clearAccessibilityLabel,
    accessibilityLabel,
    placeholder,
    ...props
}: SearchFieldProps) {
    const [isFocused, setIsFocused] = useState(false);
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);
    const { scaleFont, scaleSize } = useResponsive();
    const hasValue = typeof value === 'string' && value.trim().length > 0;

    return (
        <View
            style={[
                styles.container,
                { minHeight: scaleSize(52, 0.2) },
                isFocused ? styles.containerFocused : null,
                containerStyle,
            ]}
        >
            <Icon
                name="search-outline"
                size={scaleSize(20, 0.2)}
                color={isFocused ? colors.primaryLight : colors.textMuted}
                accessible={false}
            />
            <TextInput
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                style={[
                    styles.input,
                    { fontSize: scaleFont(typography.fontSize.base) },
                    inputStyle,
                ]}
                onFocus={(event) => {
                    setIsFocused(true);
                    onFocus?.(event);
                }}
                onBlur={(event) => {
                    setIsFocused(false);
                    onBlur?.(event);
                }}
                accessibilityLabel={accessibilityLabel ?? placeholder}
                {...props}
            />
            {hasValue ? (
                <TouchableOpacity
                    style={styles.clearButton}
                    onPress={() => onChangeText?.('')}
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityLabel={clearAccessibilityLabel}
                >
                    <Icon name="close-circle" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
            ) : null}
        </View>
    );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingLeft: spacing.base,
        paddingRight: spacing.xs,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surfaceElevated,
    },
    containerFocused: {
        borderColor: colors.primaryLight,
        backgroundColor: colors.surfaceCard,
    },
    input: {
        flex: 1,
        alignSelf: 'stretch',
        color: colors.textPrimary,
        paddingVertical: spacing.sm,
    },
    clearButton: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: borderRadius.full,
    },
});
