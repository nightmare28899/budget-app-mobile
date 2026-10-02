import React from 'react';
import { StyleSheet, View } from 'react-native';
import {
    BottomTabBarProps,
    createBottomTabNavigator,
} from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MainTabParamList, RootStackParamList } from './types';
import { DashboardScreen } from '../screens/dashboard/DashboardScreen';
import { AnalyticsScreen } from '../screens/analytics/AnalyticsScreen';
import { HistoryNavigator } from './HistoryNavigator';
import { ActivityScreen } from '../screens/activity/ActivityScreen';
import { spacing, useResponsive } from '../theme/index';
import { getMainTabDockTotalHeight } from './mainTabLayout';
import { MainTabDock } from './MainTabDock';
import { BottomDockVisibilityProvider } from './bottomDockVisibility';

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabNavigator() {
    return (
        <BottomDockVisibilityProvider>
            <MainTabNavigatorContent />
        </BottomDockVisibilityProvider>
    );
}

function MainTabNavigatorContent() {
    const { isSmallPhone, isTablet } = useResponsive();
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

    const dockHideOffset = getMainTabDockTotalHeight({
        insetsBottom: insets.bottom,
        isSmallPhone,
        isTablet,
    }) + spacing.xl;

    const onOpenAddEntry = React.useCallback(() => {
        navigation.navigate('AddEntry', { initialTab: 'expense' });
    }, [navigation]);

    const renderTabBar = React.useCallback((props: BottomTabBarProps) => (
        <MainTabDock
            {...props}
            hideOffset={dockHideOffset}
            onPressAction={onOpenAddEntry}
        />
    ), [dockHideOffset, onOpenAddEntry]);

    return (
        <View style={styles.container}>
            <Tab.Navigator
                tabBar={renderTabBar}
                screenOptions={{
                    headerShown: false,
                    animation: 'none',
                    tabBarStyle: styles.hiddenNativeTabBar,
                    tabBarHideOnKeyboard: true,
                }}
            >
                <Tab.Screen name="Dashboard" component={DashboardScreen} />
                <Tab.Screen name="Analytics" component={AnalyticsScreen} />
                <Tab.Screen name="Activity" component={ActivityScreen} />
                <Tab.Screen name="History" component={HistoryNavigator} />
            </Tab.Navigator>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    hiddenNativeTabBar: {
        position: 'absolute',
        height: 0,
        borderTopWidth: 0,
        backgroundColor: 'transparent',
    },
});
