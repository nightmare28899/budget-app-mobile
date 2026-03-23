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
import { spacing, typography, useResponsive, useThemedStyles } from '../theme';
import {
    getMainTabBarHeight,
    getMainTabFabBottomOffset,
    getMainTabFabSize,
} from './mainTabLayout';

const Tab = createBottomTabNavigator<MainTabParamList>();

const NAVY_BORDER = 'rgba(0, 230, 118, 0.28)';
const ACCENT_GREEN = '#00E676';
const INACTIVE_TINT = '#87A3CC';

function GlobalActionFab() {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { isSmallPhone, scaleSize } = useResponsive();
    const insets = useSafeAreaInsets();
    const styles = useThemedStyles(createStyles);
    const fabSize = getMainTabFabSize({ isSmallPhone, scaleSize });
    const fabBottomOffset = getMainTabFabBottomOffset({
        isSmallPhone,
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
                    <Icon name="add" size={Math.round(fabSize * 0.52)} color="#041023" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

export function MainTabNavigator() {
    const insets = useSafeAreaInsets();
    const { isSmallPhone } = useResponsive();
    const styles = useThemedStyles(createStyles);
    const { t } = useI18n();
    const centerGap = isSmallPhone ? 24 : 32;
    const tabBarHeight = getMainTabBarHeight({
        isSmallPhone,
    });

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
                        },
                    ],
                    tabBarActiveTintColor: ACCENT_GREEN,
                    tabBarInactiveTintColor: INACTIVE_TINT,
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

const createStyles = (_colors: any) =>
    StyleSheet.create({
        container: {
            flex: 1,
        },
        tabBar: {
            position: 'absolute',
            left: spacing.base,
            right: spacing.base,
            bottom: spacing.xs,
            borderRadius: 30,
            backgroundColor: 'rgba(6, 21, 44, 0.94)',
            borderTopColor: NAVY_BORDER,
            borderTopWidth: 1,
            borderWidth: 1,
            borderColor: 'rgba(125, 163, 204, 0.22)',
            elevation: 0,
            shadowColor: '#000000',
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
            color: '#FFFFFF',
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
            backgroundColor: ACCENT_GREEN,
            borderWidth: 4,
            borderColor: '#081A34',
            shadowColor: ACCENT_GREEN,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.42,
            shadowRadius: 14,
            elevation: 12,
        },
    });
