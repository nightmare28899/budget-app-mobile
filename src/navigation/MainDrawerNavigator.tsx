import React from 'react';
import {
    DrawerContentComponentProps,
    DrawerContentScrollView,
    DrawerItemList,
    createDrawerNavigator,
} from '@react-navigation/drawer';
import Icon from 'react-native-vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MainDrawerParamList } from './types';
import { MainTabNavigator } from './MainTabNavigator';
import { ExpensesScreen } from '../screens/expenses/ExpensesScreen';
import { SubscriptionsScreen } from '../screens/subscriptions/SubscriptionsScreen';
import { SavingsScreen } from '../screens/savings/SavingsScreen';
import { CreditCardsScreen } from '../screens/creditCards/CreditCardsScreen';
import { spacing, typography, useTheme } from '../theme';
import { useI18n } from '../hooks/useI18n';

const Drawer = createDrawerNavigator<MainDrawerParamList>();

type AppDrawerContentProps = DrawerContentComponentProps & {
    versionLabel: string;
    colors: Record<string, string>;
};

function AppDrawerContent({
    versionLabel,
    colors,
    ...props
}: AppDrawerContentProps) {
    const insets = useSafeAreaInsets();
    const styles = createStyles(colors);

    return (
        <View style={styles.drawerRoot}>
            <DrawerContentScrollView
                {...props}
                contentContainerStyle={[
                    styles.drawerScrollContent,
                    { paddingTop: insets.top + spacing.xs },
                ]}
            >
                <DrawerItemList {...props} />
            </DrawerContentScrollView>
            <View
                style={[
                    styles.drawerFooter,
                    { paddingBottom: Math.max(insets.bottom, spacing.base) },
                ]}
            >
                <Text style={styles.drawerFooterText}>{versionLabel}</Text>
            </View>
        </View>
    );
}

export function MainDrawerNavigator() {
    const { t } = useI18n();
    const { colors } = useTheme();

    return (
        <Drawer.Navigator
            initialRouteName="Tabs"
            drawerContent={(props) => (
                <AppDrawerContent
                    {...props}
                    versionLabel={t('settings.version')}
                    colors={colors as Record<string, string>}
                />
            )}
            screenOptions={({ route }) => ({
                headerShown: false,
                drawerType: 'front',
                swipeEnabled: true,
                swipeEdgeWidth: 64,
                drawerStyle: {
                    backgroundColor: colors.surface,
                    width: 286,
                    borderRightWidth: 1,
                    borderRightColor: colors.border,
                },
                drawerActiveTintColor: colors.primary,
                drawerInactiveTintColor: colors.textSecondary,
                drawerActiveBackgroundColor: colors.surfaceCard,
                drawerItemStyle: {
                    borderRadius: 12,
                    marginHorizontal: spacing.base,
                    marginVertical: 2,
                },
                drawerLabelStyle: {
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.semibold,
                },
                drawerIcon: ({ color, size }) => {
                    const iconName =
                        route.name === 'Tabs'
                            ? 'home-outline'
                            : route.name === 'Expenses'
                                ? 'wallet-outline'
                                : route.name === 'Subscriptions'
                                    ? 'albums-outline'
                                    : route.name === 'CreditCards'
                                        ? 'card-outline'
                                    : route.name === 'Savings'
                                        ? 'cash-outline'
                                    : 'settings-outline';

                    return <Icon name={iconName} size={size} color={color} />;
                },
            })}
        >
            <Drawer.Screen
                name="Tabs"
                component={MainTabNavigator}
                options={{ drawerLabel: t('tab.home') }}
                listeners={({ navigation }) => ({
                    drawerItemPress: (event) => {
                        event.preventDefault();
                        navigation.navigate('Tabs', { screen: 'Dashboard' });
                        navigation.closeDrawer();
                    },
                })}
            />
            <Drawer.Screen
                name="CreditCards"
                component={CreditCardsScreen}
                options={{ drawerLabel: t('creditCards.title') }}
            />
            <Drawer.Screen
                name="Expenses"
                component={ExpensesScreen}
                options={{ drawerLabel: t('expenses.title') }}
            />
            <Drawer.Screen
                name="Subscriptions"
                component={SubscriptionsScreen}
                options={{ drawerLabel: t('subscriptions.title') }}
            />
            <Drawer.Screen
                name="Savings"
                component={SavingsScreen}
                options={{ drawerLabel: t('savings.title') }}
            />
            <Drawer.Screen
                name="UpcomingSubscriptions"
                component={SubscriptionsScreen}
                options={{
                    drawerLabel: t('dashboard.upcomingTitle'),
                    drawerItemStyle: { display: 'none' },
                    swipeEnabled: false,
                }}
            />
        </Drawer.Navigator>
    );
}

const createStyles = (colors: Record<string, string>) =>
    StyleSheet.create({
        drawerRoot: {
            flex: 1,
            backgroundColor: colors.surface,
        },
        drawerScrollContent: {
            paddingTop: spacing.xs,
        },
        drawerFooter: {
            borderTopWidth: 1,
            borderTopColor: colors.border,
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.base,
        },
        drawerFooterText: {
            textAlign: 'center',
            color: colors.textMuted,
            fontSize: typography.fontSize.xs,
            fontWeight: typography.fontWeight.medium,
        },
    });
