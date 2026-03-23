import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TextInputProps,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {
    spacing,
    typography,
    borderRadius,
    useResponsive,
    useTheme,
    useThemedStyles,
} from '../../theme';

interface InputProps extends TextInputProps {
    label?: string;
    error?: string;
    isPassword?: boolean;
    containerStyle?: any;
    inputStyle?: any;
    leftContent?: React.ReactNode;
}

export function Input({
    label,
    error,
    isPassword,
    containerStyle,
    inputStyle,
    leftContent,
    onFocus,
    onBlur,
    ...props
}: InputProps) {
    const [showPassword, setShowPassword] = useState(!isPassword);
    const [isFocused, setIsFocused] = useState(false);
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);
    const { isSmallPhone, scaleFont, scaleSize } = useResponsive();

    const inputVerticalPadding = isSmallPhone
        ? scaleSize(spacing.sm, 0.4)
        : scaleSize(spacing.base, 0.35);
    const inputHorizontalPadding = scaleSize(spacing.base, 0.35);
    const inputFontSize = scaleFont(typography.fontSize.base);
    const labelFontSize = scaleFont(typography.fontSize.sm);
    const errorFontSize = scaleFont(typography.fontSize.xs);

    return (
        <View style={[styles.container, containerStyle]}>
            {label && <Text style={[styles.label, { fontSize: labelFontSize }]}>{label}</Text>}
            <View
                style={[
                    styles.inputContainer,
                    isFocused && styles.inputContainerFocused,
                    error && styles.inputContainerError,
                    inputStyle,
                ]}
            >
                {leftContent && <View style={styles.leftContent}>{leftContent}</View>}
                <TextInput
                    style={[
                        styles.input,
                        {
                            fontSize: inputFontSize,
                            paddingVertical: inputVerticalPadding,
                            paddingHorizontal: inputHorizontalPadding,
                        },
                        isPassword && styles.passwordInput,
                    ]}
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry={isPassword && !showPassword}
                    onFocus={(event) => {
                        setIsFocused(true);
                        onFocus?.(event);
                    }}
                    onBlur={(event) => {
                        setIsFocused(false);
                        onBlur?.(event);
                    }}
                    {...props}
                />
                {isPassword && (
                    <TouchableOpacity
                        style={styles.eyeIcon}
                        onPress={() => setShowPassword(!showPassword)}
                        activeOpacity={0.7}
                    >
                        <Icon
                            name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                            size={22}
                            color={colors.textMuted}
                        />
                    </TouchableOpacity>
                )}
            </View>
            {error && <Text style={[styles.errorText, { fontSize: errorFontSize }]}>{error}</Text>}
        </View>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        gap: spacing.xs,
        marginBottom: spacing.xs,
    },
    label: {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.medium,
        color: colors.textSecondary,
        marginLeft: spacing.xs,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surfaceElevated,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    inputContainerFocused: {
        borderColor: colors.primaryLight,
    },
    inputContainerError: {
        borderColor: colors.error,
    },
    input: {
        flex: 1,
        color: colors.textPrimary,
    },
    passwordInput: {
        paddingRight: spacing.base,
    },
    eyeIcon: {
        paddingHorizontal: spacing.base,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        fontSize: typography.fontSize.xs,
        color: colors.error,
        marginLeft: spacing.xs,
        marginTop: 2,
    },
    leftContent: {
        paddingLeft: spacing.base,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
