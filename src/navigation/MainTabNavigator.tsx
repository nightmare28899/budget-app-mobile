import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MainTabParamList, RootStackParamList } from './types';
import { DashboardScreen } from '../screens/dashboard/DashboardScreen';
import { AnalyticsScreen } from '../screens/analytics/AnalyticsScreen';
import { ActivityNavigator } from './ActivityNavigator';
import { CardsScreen } from '../screens/cards/CardsScreen';
import { useI18n } from '../hooks/useI18n';
import { spacing, typography, useResponsive, useTheme, useThemedStyles } from '../theme';
import { withAlpha } from '../utils/subscriptions';
import {
    getMainTabBarHeight,
    getMainTabFabBottomOffset,
    getMainTabFabSize,
} from './mainTabLayout';

const Tab = createBottomTabNavigator<MainTabParamList>();

function GlobalActionFab() {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { isSmallPhone, isTablet, scaleSize } = useResponsive();
    const styles = useThemedStyles(createStyles);
    const fabSize = getMainTabFabSize({ isSmallPhone, isTablet, scaleSize });
    const fabBottomOffset = getMainTabFabBottomOffset({
        isSmallPhone,
        isTablet,
    });

    const onOpenAddEntry = () => {
        navigation.navigate('AddEntry', { initialTab: 'expense' });
    };

    return (
        <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
            <View
                pointerEvents="box-none"
                style={[
                    styles.fabLayer,
                    { bottom: fabBottomOffset },
                ]}
            >
                <TouchableOpacity
                    activeOpacity={0.9}
                    style={[
                        styles.fabMain,
                        {
                            width: fabSize,
                            height: fabSize,
                            borderRadius: fabSize / 2,
                        },
                    ]}
                    onPress={onOpenAddEntry}
                >
                    <Icon name="add" size={Math.round(fabSize * 0.52)} color="#FFFFFF" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

export function MainTabNavigator() {
    const insets = useSafeAreaInsets();
    const {
        width,
        isSmallPhone,
        isTablet,
        tabBarMaxWidth,
    } = useResponsive();
    const styles = useThemedStyles(createStyles);
    const { colors } = useTheme();
    const { t } = useI18n();
    const centerGap = isTablet ? 36 : isSmallPhone ? 24 : 32;
    const tabBarHeight = getMainTabBarHeight({
        isSmallPhone,
        isTablet,
    });
    const tabBarSideOffset = isTablet && tabBarMaxWidth
        ? Math.max(Math.round((width - tabBarMaxWidth) / 2), spacing.base)
        : spacing.base;
    const tabBarFrameStyle = isTablet && tabBarMaxWidth
        ? {
            width: tabBarMaxWidth,
            left: tabBarSideOffset,
        }
        : {
            left: spacing.base,
            right: spacing.base,
        };

    return (
        <View style={styles.container}>
            <Tab.Navigator
                screenOptions={{
                    headerShown: false,
                    animation: 'none',
                    tabBarStyle: [
                        styles.tabBar,
                        {
                            height: tabBarHeight,
                            paddingBottom: Math.max(insets.bottom, spacing.sm),
                            paddingTop: isSmallPhone ? spacing.xs : spacing.sm,
                            paddingHorizontal: spacing.lg,
                        },
                        tabBarFrameStyle,
                    ],
                    tabBarActiveTintColor: colors.primaryAction,
                    tabBarInactiveTintColor: colors.textMuted,
                    tabBarShowLabel: true,
                    tabBarLabelStyle: styles.tabBarLabel,
                    tabBarItemStyle: styles.tabBarItem,
                    tabBarHideOnKeyboard: true,
                }}
            >
                <Tab.Screen
                    name="Dashboard"
                    component={DashboardScreen}
                    options={{
                        tabBarLabel: t('tab.home'),
                        tabBarIcon: ({ color, size, focused }) => (
                            <Icon
                                name={focused ? 'home' : 'home-outline'}
                                size={size}
                                color={color}
                            />
                        ),
                    }}
                />
                <Tab.Screen
                    name="Analytics"
                    component={AnalyticsScreen}
                    options={{
                        tabBarLabel: t('tab.analytics'),
                        tabBarItemStyle: [styles.tabBarItem, { marginRight: centerGap }],
                        tabBarIcon: ({ color, size, focused }) => (
                            <Icon
                                name={focused ? 'stats-chart' : 'stats-chart-outline'}
                                size={size}
                                color={color}
                            />
                        ),
                    }}
                />
                <Tab.Screen
                    name="SubscriptionsTab"
                    component={CardsScreen}
                    options={{
                        tabBarLabel: t('tab.activity'),
                        tabBarItemStyle: [styles.tabBarItem, { marginLeft: centerGap }],
                        tabBarIcon: ({ color, size, focused }) => (
                            <Icon
                                name={focused ? 'list' : 'list-outline'}
                                size={size}
                                color={color}
                            />
                        ),
                    }}
                />
                <Tab.Screen
                    name="History"
                    component={ActivityNavigator}
                    options={{
                        tabBarLabel: t('tab.history'),
                        tabBarIcon: ({ color, size, focused }) => (
                            <Icon
                                name={focused ? 'time' : 'time-outline'}
                                size={size}
                                color={color}
                            />
                        ),
                    }}
                />
            </Tab.Navigator>
            <GlobalActionFab />
        </View>
    );
}

const createStyles = (colors: any) =>
    StyleSheet.create({
        container: {
            flex: 1,
        },
        tabBar: {
            position: 'absolute',
            bottom: spacing.xs,
            borderRadius: 30,
            backgroundColor: withAlpha(colors.surfaceCard, 0.96),
            borderTopColor: withAlpha(colors.border, 0.75),
            borderTopWidth: 1,
            borderWidth: 1,
            borderColor: withAlpha(colors.border, 0.9),
            elevation: 0,
            shadowColor: colors.textPrimary,
            shadowOffset: { width: 0, height: 14 },
            shadowOpacity: 0.35,
            shadowRadius: 22,
            paddingHorizontal: spacing.lg,
        },
        tabBarItem: {
            paddingTop: 4,
            paddingBottom: 2,
        },
        tabBarLabel: {
            fontSize: 11,
            fontWeight: typography.fontWeight.semibold,
        },
        fabLayer: {
            position: 'absolute',
            left: 0,
            right: 0,
            alignItems: 'center',
        },
        fabMain: {
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.primaryAction,
            borderWidth: 4,
            borderColor: colors.background,
            shadowColor: colors.primaryAction,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.42,
            shadowRadius: 14,
            elevation: 12,
        },
    });
