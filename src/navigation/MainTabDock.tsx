import React from 'react';
import {
    Animated,
    Easing,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { NavigationRoute, ParamListBase } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useI18n } from '../hooks/shared/useI18n';
import type { TranslationKey } from '../i18n/index';
import {
    borderRadius,
    spacing,
    typography,
    useResponsive,
    useTheme,
    useThemedStyles,
    SemanticColors,
} from '../theme/index';
import { withAlpha } from '../utils/domain/subscriptions';
import {
    getMainTabBarHeight,
    getMainTabDockBottomOffset,
    getMainTabFabSize,
    MAIN_TAB_DOCK_SIDE_MARGIN,
} from './mainTabLayout';
import { useBottomDockVisibility } from './bottomDockVisibility';

type MainTabDockProps = BottomTabBarProps & {
    hideOffset: number;
    onPressAction: () => void;
};

type TabVisual = {
    activeIcon: string;
    inactiveIcon: string;
    labelKey: TranslationKey;
};

type MainTabDockItemProps = {
    route: NavigationRoute<ParamListBase, string>;
    isFocused: boolean;
    iconSize: number;
    navigation: BottomTabBarProps['navigation'];
};

const TAB_VISUALS: Record<string, TabVisual> = {
    Dashboard: {
        activeIcon: 'home',
        inactiveIcon: 'home-outline',
        labelKey: 'tab.home',
    },
    Analytics: {
        activeIcon: 'stats-chart',
        inactiveIcon: 'stats-chart-outline',
        labelKey: 'tab.analytics',
    },
    Activity: {
        activeIcon: 'swap-vertical',
        inactiveIcon: 'swap-vertical-outline',
        labelKey: 'tab.activity',
    },
    History: {
        activeIcon: 'time',
        inactiveIcon: 'time-outline',
        labelKey: 'tab.history',
    },
};

const FALLBACK_VISUAL: TabVisual = {
    activeIcon: 'ellipse',
    inactiveIcon: 'ellipse-outline',
    labelKey: 'tab.home',
};

function MainTabDockItem({
    route,
    isFocused,
    iconSize,
    navigation,
}: MainTabDockItemProps) {
    const { t } = useI18n();
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);
    const visual = TAB_VISUALS[route.name] ?? FALLBACK_VISUAL;
    const focusProgress = React.useRef(new Animated.Value(isFocused ? 1 : 0)).current;

    React.useEffect(() => {
        Animated.timing(focusProgress, {
            toValue: isFocused ? 1 : 0,
            duration: 190,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }).start();
    }, [focusProgress, isFocused]);

    const pillScale = focusProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [0.72, 1],
    });
    const iconLift = focusProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -1],
    });

    const onPress = () => {
        const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
        });

        if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
        }
    };

    const onLongPress = () => {
        navigation.emit({
            type: 'tabLongPress',
            target: route.key,
        });
    };

    const label = t(visual.labelKey);

    return (
        <Pressable
            style={({ pressed }) => [
                styles.tabItem,
                pressed && Platform.OS === 'ios' ? styles.tabItemPressed : null,
            ]}
            onPress={onPress}
            onLongPress={onLongPress}
            android_ripple={{
                color: withAlpha(colors.primaryAction, 0.16),
                borderless: true,
                radius: 34,
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: isFocused }}
            accessibilityLabel={label}
        >
            <Animated.View style={[styles.tabIconWrap, { transform: [{ translateY: iconLift }] }]}>
                <Animated.View
                    pointerEvents="none"
                    style={[
                        styles.tabIconPill,
                        {
                            opacity: focusProgress,
                            transform: [{ scale: pillScale }],
                        },
                    ]}
                />
                <Icon
                    name={isFocused ? visual.activeIcon : visual.inactiveIcon}
                    size={iconSize}
                    color={isFocused ? colors.primaryAction : colors.textMuted}
                />
            </Animated.View>
            <Text
                style={[
                    styles.tabLabel,
                    isFocused ? styles.tabLabelActive : null,
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.82}
                maxFontSizeMultiplier={1.2}
            >
                {label}
            </Text>
        </Pressable>
    );
}

export function MainTabDock({
    state,
    navigation,
    hideOffset,
    onPressAction,
}: MainTabDockProps) {
    const insets = useSafeAreaInsets();
    const { t } = useI18n();
    const { isSmallPhone, isTablet, scaleSize, tabBarMaxWidth } = useResponsive();
    const styles = useThemedStyles(createStyles);
    const { colors, isDark } = useTheme();
    const { isVisible, progress } = useBottomDockVisibility();

    const dockHeight = getMainTabBarHeight({ isSmallPhone, isTablet });
    const dockBottom = getMainTabDockBottomOffset({ insetsBottom: insets.bottom, isTablet });
    const actionSize = getMainTabFabSize({ isSmallPhone, isTablet, scaleSize });
    const iconSize = isSmallPhone ? 20 : isTablet ? 24 : 22;

    const translateY = React.useMemo(
        () => progress.interpolate({
            inputRange: [0, 1],
            outputRange: [hideOffset, 0],
        }),
        [hideOffset, progress],
    );

    const splitIndex = Math.ceil(state.routes.length / 2);
    const renderItem = (route: NavigationRoute<ParamListBase, string>, index: number) => (
        <MainTabDockItem
            key={route.key}
            route={route}
            isFocused={state.index === index}
            iconSize={iconSize}
            navigation={navigation}
        />
    );

    return (
        <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
            <Animated.View
                pointerEvents={isVisible ? 'box-none' : 'none'}
                style={[
                    styles.dockLayer,
                    {
                        bottom: dockBottom,
                        opacity: progress,
                        transform: [{ translateY }],
                    },
                ]}
            >
                <View
                    style={[
                        styles.dock,
                        isDark ? styles.dockDark : styles.dockLight,
                        {
                            height: dockHeight,
                            maxWidth: tabBarMaxWidth,
                            backgroundColor: isDark ? colors.surfaceElevated : colors.surface,
                        },
                    ]}
                >
                    {state.routes.slice(0, splitIndex).map(renderItem)}

                    <View style={[styles.actionSlot, { width: actionSize + spacing.sm }]}>
                        <Pressable
                            onPress={onPressAction}
                            style={({ pressed }) => [
                                styles.actionButton,
                                {
                                    width: actionSize,
                                    height: actionSize,
                                    borderRadius: actionSize / 2,
                                },
                                pressed ? styles.actionButtonPressed : null,
                            ]}
                            accessibilityRole="button"
                            accessibilityLabel={t('navigation.addEntry')}
                        >
                            <Icon
                                name="add"
                                size={Math.round(actionSize * 0.56)}
                                color={styles.actionIcon.color}
                            />
                        </Pressable>
                    </View>

                    {state.routes
                        .slice(splitIndex)
                        .map((route, index) => renderItem(route, index + splitIndex))}
                </View>
            </Animated.View>
        </View>
    );
}

const createStyles = (colors: SemanticColors) =>
    StyleSheet.create({
        dockLayer: {
            position: 'absolute',
            left: 0,
            right: 0,
            alignItems: 'center',
            paddingHorizontal: MAIN_TAB_DOCK_SIDE_MARGIN,
        },
        dock: {
            width: '100%',
            flexDirection: 'row',
            alignItems: 'center',
            borderRadius: borderRadius.full,
            paddingHorizontal: spacing.xs,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: withAlpha(colors.border, 0.9),
            shadowColor: '#0B1020',
            shadowOffset: { width: 0, height: 10 },
            shadowRadius: 18,
            elevation: 14,
        },
        dockDark: {
            shadowOpacity: 0.34,
        },
        dockLight: {
            shadowOpacity: 0.12,
        },
        tabItem: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: spacing.xs,
            gap: 2,
        },
        tabItemPressed: {
            opacity: 0.6,
        },
        tabIconWrap: {
            width: 44,
            height: 26,
            alignItems: 'center',
            justifyContent: 'center',
        },
        tabIconPill: {
            ...StyleSheet.absoluteFillObject,
            borderRadius: borderRadius.full,
            backgroundColor: withAlpha(colors.primaryAction, 0.18),
        },
        tabLabel: {
            fontSize: typography.fontSize.xs,
            lineHeight: 13,
            letterSpacing: 0.1,
            fontWeight: typography.fontWeight.medium,
            textAlign: 'center',
            color: colors.textMuted,
            maxWidth: '100%',
        },
        tabLabelActive: {
            color: colors.primaryAction,
            fontWeight: typography.fontWeight.semibold,
        },
        actionSlot: {
            alignItems: 'center',
            justifyContent: 'center',
        },
        actionButton: {
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.primaryAction,
            shadowColor: colors.primaryAction,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.45,
            shadowRadius: 12,
            elevation: 10,
        },
        actionButtonPressed: {
            backgroundColor: colors.primaryActionHover,
            transform: [{ scale: 0.94 }],
        },
        actionIcon: {
            color: colors.textOnAction,
        },
    });
