import React, { useMemo, useRef } from 'react';
import {
    TouchableOpacity,
    Text,
    ActivityIndicator,
    StyleSheet,
    TouchableOpacityProps,
    Animated,
} from 'react-native';
import { spacing, typography, borderRadius, useResponsive, useTheme } from '../../theme';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

interface ButtonProps extends TouchableOpacityProps {
    title: string;
    loading?: boolean;
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    containerStyle?: any;
    textStyle?: any;
}

export function Button({
    title,
    loading,
    variant = 'primary',
    disabled,
    containerStyle,
    textStyle,
    onPressIn,
    onPressOut,
    ...props
}: ButtonProps) {
    const { colors } = useTheme();
    const isGhost = variant === 'ghost';
    const scale = useRef(new Animated.Value(1)).current;
    const { isSmallPhone, scaleFont, scaleSize } = useResponsive();
    const variantStyles = useMemo(() => ({
        primary: {
            backgroundColor: colors.primaryAction,
            shadowColor: colors.primaryAction,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 6,
        },
        secondary: {
            backgroundColor: colors.surfaceElevated,
            borderWidth: 1,
            borderColor: colors.border,
        },
        danger: {
            backgroundColor: colors.error,
        },
        ghost: {
            backgroundColor: 'transparent',
            minHeight: 0,
            padding: 0,
        },
        primaryText: {
            color: '#FFFFFF',
        },
        secondaryText: {
            color: colors.textPrimary,
        },
        dangerText: {
            color: '#FFFFFF',
        },
        ghostText: {
            color: colors.textSecondary,
            fontSize: typography.fontSize.md,
            fontWeight: typography.fontWeight.medium,
        },
    }), [colors]);

    const animateScale = (toValue: number) => {
        Animated.spring(scale, {
            toValue,
            useNativeDriver: true,
            speed: 26,
            bounciness: 3,
        }).start();
    };

    const buttonMinHeight = isGhost ? 0 : scaleSize(48, 0.35);
    const buttonPadding = isGhost
        ? 0
        : isSmallPhone
            ? scaleSize(spacing.md, 0.4)
            : scaleSize(spacing.base, 0.4);
    const buttonFontSize = scaleFont(typography.fontSize.lg);

    return (
        <AnimatedTouchableOpacity
            style={[
                styles.button,
                {
                    transform: [{ scale }],
                    minHeight: buttonMinHeight,
                    padding: buttonPadding,
                },
                variantStyles[variant],
                (disabled || loading) && !isGhost && styles.buttonDisabled,
                (disabled || loading) && isGhost && styles.ghostDisabled,
                containerStyle,
            ]}
            disabled={disabled || loading}
            activeOpacity={0.8}
            onPressIn={(event) => {
                animateScale(0.98);
                onPressIn?.(event);
            }}
            onPressOut={(event) => {
                animateScale(1);
                onPressOut?.(event);
            }}
            {...props}
        >
            {loading ? (
                <ActivityIndicator
                    color={
                        variant === 'primary' || variant === 'danger'
                            ? '#FFFFFF'
                            : colors.primaryAction
                    }
                />
                ) : (
                <Text
                    style={[
                        styles.buttonText,
                        { fontSize: buttonFontSize },
                        variant === 'primary' && variantStyles.primaryText,
                        variant === 'secondary' && variantStyles.secondaryText,
                        variant === 'danger' && variantStyles.dangerText,
                        variant === 'ghost' && variantStyles.ghostText,
                        textStyle,
                    ]}
                >
                    {title}
                </Text>
            )}
        </AnimatedTouchableOpacity>
    );
}

const styles = StyleSheet.create({
    button: {
        borderRadius: borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    ghostDisabled: {
        opacity: 0.5,
    },
    buttonText: {
        fontSize: typography.fontSize.lg,
        fontWeight: typography.fontWeight.bold,
    },
});
