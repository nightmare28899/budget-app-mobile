import React, { useEffect, useRef } from 'react';
import { Text, StyleSheet, Animated } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { spacing, typography, useResponsive, useTheme, useThemedStyles } from '../../theme';

interface EmptyStateProps {
    icon: string;
    title: string;
    description?: string;
    containerStyle?: any;
    iconColor?: string;
}

export function EmptyState({ icon, title, description, containerStyle, iconColor }: EmptyStateProps) {
    const { isSmallPhone, scaleFont, scaleSize } = useResponsive();
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);
    const resolvedIconColor = iconColor || colors.primaryLight;
    const progress = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const animation = Animated.timing(progress, {
            toValue: 1,
            duration: 280,
            useNativeDriver: true,
        });
        animation.start();
        return () => animation.stop();
    }, [progress]);

    const iconSize = isSmallPhone ? scaleSize(42, 0.7) : scaleSize(48, 0.7);

    return (
        <Animated.View
            style={[
                styles.emptyState,
                containerStyle,
                {
                    opacity: progress,
                    transform: [
                        {
                            translateY: progress.interpolate({
                                inputRange: [0, 1],
                                outputRange: [8, 0],
                            }),
                        },
                    ],
                },
            ]}
        >
            <Icon
                name={icon}
                size={iconSize}
                color={resolvedIconColor}
                style={styles.emptyIcon}
            />
            <Text style={[styles.emptyText, { fontSize: scaleFont(typography.fontSize.lg) }]}>
                {title}
            </Text>
            {description && (
                <Text style={[styles.emptySubtext, { fontSize: scaleFont(typography.fontSize.md) }]}>
                    {description}
                </Text>
            )}
        </Animated.View>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    emptyState: {
        alignItems: 'center',
        paddingVertical: spacing['3xl'],
        paddingHorizontal: spacing.xl,
    },
    emptyIcon: {
        marginBottom: spacing.base,
    },
    emptyText: {
        fontSize: typography.fontSize.lg,
        fontWeight: typography.fontWeight.semibold,
        color: colors.textPrimary,
        marginBottom: spacing.xs,
        textAlign: 'center',
    },
    emptySubtext: {
        fontSize: typography.fontSize.md,
        color: colors.textMuted,
        textAlign: 'center',
    },
});
