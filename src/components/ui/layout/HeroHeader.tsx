import React, { useEffect, useRef } from 'react';
import { Text, StyleSheet, Animated, Easing, StyleProp, ViewStyle } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {
    spacing,
    typography,
    useResponsive,
    useTheme,
    useThemedStyles,
    SemanticColors,
} from '../../../theme/index';

interface HeroHeaderProps {
    icon: string;
    title: string;
    subtitle?: string;
    containerStyle?: StyleProp<ViewStyle>;
}

export function HeroHeader({ icon, title, subtitle, containerStyle }: HeroHeaderProps) {
    const { isSmallPhone, scaleFont, scaleSize } = useResponsive();
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);
    const progress = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const animation = Animated.timing(progress, {
            toValue: 1,
            duration: 420,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        });
        animation.start();
        return () => animation.stop();
    }, [progress]);

    const iconSize = isSmallPhone ? scaleSize(48, 0.8) : scaleSize(56, 0.8);
    const titleFontSize = scaleFont(typography.fontSize['3xl']);
    const subtitleFontSize = scaleFont(typography.fontSize.base);

    return (
        <Animated.View
            style={[
                styles.hero,
                containerStyle,
                {
                    opacity: progress,
                    transform: [
                        {
                            translateY: progress.interpolate({
                                inputRange: [0, 1],
                                outputRange: [12, 0],
                            }),
                        },
                    ],
                },
            ]}
        >
            <Icon
                name={icon}
                size={iconSize}
                color={colors.primaryLight}
                style={styles.heroIcon}
            />
            <Text style={[styles.title, { fontSize: titleFontSize }]}>{title}</Text>
            {subtitle && (
                <Text style={[styles.subtitle, { fontSize: subtitleFontSize }]}>{subtitle}</Text>
            )}
        </Animated.View>
    );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
    hero: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    heroIcon: {
        marginBottom: spacing.base,
    },
    title: {
        fontSize: typography.fontSize['3xl'],
        fontWeight: typography.fontWeight.extrabold,
        color: colors.textPrimary,
        marginBottom: spacing.sm,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: typography.fontSize.base,
        color: colors.textSecondary,
        textAlign: 'center',
    },
});
