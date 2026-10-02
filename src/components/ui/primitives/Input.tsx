import React, { useState } from 'react';
import {
    StyleProp,
    View,
    ViewStyle,
    Text,
    TextInput,
    TextInputProps,
    StyleSheet,
    TextStyle,
    TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { FieldError } from './FieldError';
import {
    spacing,
    typography,
    borderRadius,
    useResponsive,
    useTheme,
    useThemedStyles,
    SemanticColors,
} from '../../../theme/index';

interface InputProps extends TextInputProps {
    label?: string;
    error?: string;
    isPassword?: boolean;
    containerStyle?: StyleProp<ViewStyle>;
    inputStyle?: StyleProp<TextStyle>;
    leftContent?: React.ReactNode;
}

export function Input({
    label,
    error,
    isPassword,
    multiline,
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

    return (
        <View style={[styles.container, containerStyle]}>
            {label && <Text style={[styles.label, { fontSize: labelFontSize }]}>{label}</Text>}
            <View
                style={[
                    styles.inputContainer,
                    isFocused && styles.inputContainerFocused,
                    error && styles.inputContainerError,
                    multiline && styles.multilineContainer,
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
                        multiline && styles.multilineInput,
                        inputStyle,
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
                    accessibilityLabel={props.accessibilityLabel ?? label}
                    accessibilityHint={error ?? props.accessibilityHint}
                    accessibilityState={{
                        ...props.accessibilityState,
                        disabled: props.editable === false || props.accessibilityState?.disabled,
                    }}
                    accessibilityLiveRegion={error ? 'polite' : 'none'}
                />
                {isPassword && (
                    <TouchableOpacity
                        style={styles.eyeIcon}
                        onPress={() => setShowPassword(!showPassword)}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel={label ? `${label} visibility` : 'Password visibility'}
                        accessibilityState={{ checked: showPassword }}
                    >
                        <Icon
                            name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                            size={22}
                            color={colors.textMuted}
                        />
                    </TouchableOpacity>
                )}
            </View>
            <FieldError message={error} />
        </View>
    );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
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
    multilineContainer: {
        alignItems: 'stretch',
    },
    input: {
        flex: 1,
        color: colors.textPrimary,
    },
    multilineInput: {
        alignSelf: 'stretch',
        textAlignVertical: 'top',
    },
    passwordInput: {
        paddingRight: spacing.base,
    },
    eyeIcon: {
        paddingHorizontal: spacing.base,
        justifyContent: 'center',
        alignItems: 'center',
    },
    leftContent: {
        paddingLeft: spacing.base,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
