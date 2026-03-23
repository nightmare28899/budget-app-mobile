import React, { useEffect, useRef } from 'react';
import {
    Animated,
    Easing,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {
    borderRadius,
    spacing,
    typography,
    useTheme,
    useThemedStyles,
} from '../../theme';
import { withAlpha } from '../../utils/subscriptions';
import { useI18n } from '../../hooks/useI18n';

const DOT_COUNT = 3;

export function AppSplashScreen() {
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);
    const { t } = useI18n();
    const glow = useRef(new Animated.Value(0.55)).current;
    const float = useRef(new Animated.Value(0)).current;
    const dots = useRef(
        Array.from({ length: DOT_COUNT }, () => new Animated.Value(0.35)),
    ).current;

    useEffect(() => {
        const glowLoop = Animated.loop(
            Animated.sequence([
                Animated.timing(glow, {
                    toValue: 0.95,
                    duration: 900,
                    easing: Easing.inOut(Easing.quad),
                    useNativeDriver: true,
                }),
                Animated.timing(glow, {
                    toValue: 0.55,
                    duration: 900,
                    easing: Easing.inOut(Easing.quad),
                    useNativeDriver: true,
                }),
            ]),
        );

        const floatLoop = Animated.loop(
            Animated.sequence([
                Animated.timing(float, {
                    toValue: -8,
                    duration: 1200,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: true,
                }),
                Animated.timing(float, {
                    toValue: 0,
                    duration: 1200,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: true,
                }),
            ]),
        );

        const dotLoops = dots.map((dot, index) =>
            Animated.loop(
                Animated.sequence([
                    Animated.delay(index * 120),
                    Animated.timing(dot, {
                        toValue: 1,
                        duration: 360,
                        easing: Easing.out(Easing.quad),
                        useNativeDriver: true,
                    }),
                    Animated.timing(dot, {
                        toValue: 0.35,
                        duration: 360,
                        easing: Easing.in(Easing.quad),
                        useNativeDriver: true,
                    }),
                ]),
            ),
        );

        glowLoop.start();
        floatLoop.start();
        dotLoops.forEach((loop) => loop.start());

        return () => {
            glowLoop.stop();
            floatLoop.stop();
            dotLoops.forEach((loop) => loop.stop());
        };
    }, [dots, float, glow]);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.backgroundLayer}>
                <Animated.View style={[styles.orb, styles.orbTop, { opacity: glow }]} />
                <Animated.View
                    style={[
                        styles.orb,
                        styles.orbBottom,
                        {
                            opacity: glow.interpolate({
                                inputRange: [0.55, 0.95],
                                outputRange: [0.35, 0.7],
                            }),
                        },
                    ]}
                />
            </View>

            <View style={styles.content}>
                <Animated.View
                    style={[
                        styles.logoShell,
                        { transform: [{ translateY: float }] },
                    ]}
                >
                    <Icon name="wallet-outline" size={44} color={colors.textPrimary} />
                </Animated.View>
                <Text style={styles.title}>{t('app.name')}</Text>
                <Text style={styles.subtitle}>{t('app.tagline')}</Text>
            </View>

            <View style={styles.loaderRow}>
                {dots.map((dot, index) => (
                    <Animated.View
                        key={`splash-dot-${index}`}
                        style={[
                            styles.dot,
                            {
                                opacity: dot,
                                transform: [
                                    {
                                        scale: dot.interpolate({
                                            inputRange: [0.35, 1],
                                            outputRange: [0.84, 1],
                                        }),
                                    },
                                ],
                            },
                        ]}
                    />
                ))}
            </View>
        </SafeAreaView>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        alignItems: 'center',
        justifyContent: 'center',
    },
    backgroundLayer: {
        ...StyleSheet.absoluteFillObject,
    },
    orb: {
        position: 'absolute',
        width: 260,
        height: 260,
        borderRadius: 130,
    },
    orbTop: {
        top: -90,
        right: -70,
        backgroundColor: withAlpha(colors.primary, 0.2),
    },
    orbBottom: {
        bottom: -110,
        left: -90,
        backgroundColor: withAlpha(colors.secondary, 0.15),
    },
    content: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
    },
    logoShell: {
        width: 96,
        height: 96,
        borderRadius: borderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surfaceCard,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 18,
        elevation: 10,
    },
    title: {
        marginTop: spacing.xl,
        color: colors.textPrimary,
        fontSize: typography.fontSize['4xl'],
        fontWeight: typography.fontWeight.extrabold,
        letterSpacing: 0.5,
    },
    subtitle: {
        marginTop: spacing.sm,
        color: colors.textSecondary,
        fontSize: typography.fontSize.base,
        letterSpacing: 1.1,
        textTransform: 'uppercase',
    },
    loaderRow: {
        position: 'absolute',
        bottom: spacing['4xl'],
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.primaryLight,
    },
});
