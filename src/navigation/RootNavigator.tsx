import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { AuthNavigator } from './AuthNavigator';
import { MainDrawerNavigator } from './MainDrawerNavigator';
import { ExpenseDetailScreen } from '../screens/history/ExpenseDetailScreen';
import { EditExpenseScreen } from '../screens/editExpense/EditExpenseScreen';
import { AddEntryScreen } from '../screens/addExpense/AddEntryScreen';
import { AddExpenseScreen } from '../screens/addExpense/AddExpenseScreen';
import { AddIncomeScreen } from '../screens/addExpense/AddIncomeScreen';
import { AddSubscriptionScreen } from '../screens/addExpense/AddSubscriptionScreen';
import { PlanOverviewScreen } from '../screens/profile/PlanOverviewScreen';
import { SettingsScreen } from '../screens/settings/SettingsScreen';
import { SavingsGoalDetailScreen } from '../screens/savings/SavingsGoalDetailScreen';
import { OnboardingScreen } from '../screens/onboarding/OnboardingScreen';
import { CreditCardFormScreen } from '../screens/creditCards/CreditCardFormScreen';
import { StatementUploadScreen } from '../screens/statements/StatementUploadScreen';
import { StatementDetailScreen } from '../screens/statements/StatementDetailScreen';
import { PremiumPaywallScreen } from '../screens/premium/PremiumPaywallScreen';
import { TermsAndConditionsScreen } from '../screens/legal/TermsAndConditionsScreen';
import { PrivacyPolicyScreen } from '../screens/legal/PrivacyPolicyScreen';
import { useAuthStore } from '../store/authStore';
import { typography, useTheme } from '../theme/index';
import { useI18n } from '../hooks/shared/useI18n';
import { AppSplashScreen } from '../components/ui/layout/AppSplashScreen';
import { ScreenBackButton } from '../components/ui/primitives/ScreenBackButton';
import { useProfileSync } from '../hooks/auth/useProfileSync';

const createHeaderLeft = (navigation: { goBack: () => void }) => () => (
    <ScreenBackButton onPress={() => navigation.goBack()} />
);
import {
    usePreferencesStore,
} from '../store/preferencesStore';
import { useGuestDataStore } from '../store/guestDataStore';
import {
    flushPendingDashboardRefresh,
    flushPendingNotificationDestination,
    flushPendingQuickAddDestination,
    rootNavigationRef,
} from './navigationBridge';
import { useAndroidWidgetLinks } from '../hooks/shared/useAndroidWidgetLinks';

const Stack = createNativeStackNavigator<RootStackParamList>();
const MIN_SPLASH_MS = 1200;

export function RootNavigator() {
    const { isLoading, hydrate } = useAuthStore();
    const isPreferencesHydrated = usePreferencesStore((s) => s.isHydrated);
    const hasCompletedOnboarding = usePreferencesStore((s) => s.hasCompletedOnboarding);
    const isGuestDataHydrated = useGuestDataStore((s) => s.isHydrated);
    const { t } = useI18n();
    const { colors, isDark } = useTheme();
    const [splashReady, setSplashReady] = useState(false);

    useEffect(() => {
        hydrate();
    }, [hydrate]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setSplashReady(true);
        }, MIN_SPLASH_MS);

        return () => clearTimeout(timer);
    }, []);

    useProfileSync();

    const shouldShowSplash =
        isLoading
        || !isPreferencesHydrated
        || !isGuestDataHydrated
        || !splashReady;

    useAndroidWidgetLinks(hasCompletedOnboarding && !shouldShowSplash);

    if (shouldShowSplash) {
        return <AppSplashScreen />;
    }

    return (
        <NavigationContainer
            ref={rootNavigationRef}
            onReady={() => {
                flushPendingNotificationDestination();
                flushPendingQuickAddDestination();
                flushPendingDashboardRefresh();
            }}
            theme={{
                dark: isDark,
                colors: {
                    primary: colors.primaryAction,
                    background: colors.background,
                    card: colors.surface,
                    text: colors.textPrimary,
                    border: colors.border,
                    notification: colors.accent,
                },
                fonts: {
                    regular: { fontFamily: 'System', fontWeight: '400' },
                    medium: { fontFamily: 'System', fontWeight: '500' },
                    bold: { fontFamily: 'System', fontWeight: '700' },
                    heavy: { fontFamily: 'System', fontWeight: '800' },
                },
            }}
        >
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                {hasCompletedOnboarding ? (
                    <>
                        <Stack.Screen name="Main" component={MainDrawerNavigator} />
                        <Stack.Screen
                            name="Settings"
                            component={SettingsScreen}
                            options={{
                                headerShown: false,
                                animation: 'slide_from_right',
                                gestureEnabled: false,
                            }}
                        />
                        <Stack.Screen
                            name="PlanOverview"
                            component={PlanOverviewScreen}
                            options={{
                                headerShown: false,
                                animation: 'slide_from_right',
                                gestureEnabled: false,
                            }}
                        />
                        <Stack.Screen
                            name="ExpenseDetail"
                            component={ExpenseDetailScreen}
                            options={({ navigation }) => ({
                                headerShown: true,
                                headerTitle: t('expenseDetail.screenTitle'),
                                headerTitleAlign: 'center',
                                headerStyle: { backgroundColor: colors.surface },
                                headerTintColor: colors.textPrimary,
                                headerShadowVisible: false,
                                headerTitleStyle: {
                                    fontSize: typography.fontSize.xl,
                                    fontWeight: typography.fontWeight.bold,
                                },
                                headerBackVisible: false,
                                 headerLeft: createHeaderLeft(navigation),
                                animation: 'slide_from_right',
                            })}
                        />
                        <Stack.Screen
                            name="EditExpense"
                            component={EditExpenseScreen}
                            options={({ navigation }) => ({
                                headerShown: true,
                                headerTitle: t('editExpense.screenTitle'),
                                headerTitleAlign: 'center',
                                headerStyle: { backgroundColor: colors.surface },
                                headerTintColor: colors.textPrimary,
                                headerBackVisible: false,
                                 headerLeft: createHeaderLeft(navigation),
                                animation: 'slide_from_bottom',
                            })}
                        />
                        <Stack.Screen
                            name="AddEntry"
                            component={AddEntryScreen}
                            options={{
                                headerShown: false,
                                presentation: Platform.OS === 'ios' ? 'modal' : 'transparentModal',
                                gestureEnabled: true,
                                animation: 'slide_from_bottom',
                                contentStyle: Platform.OS === 'android' ? { backgroundColor: 'transparent' } : undefined,
                            }}
                        />
                        <Stack.Screen
                            name="AddExpense"
                            component={AddExpenseScreen}
                            options={{
                                headerShown: false,
                                presentation: Platform.OS === 'ios' ? 'modal' : 'card',
                                gestureEnabled: true,
                                animation: 'slide_from_bottom',
                            }}
                        />
                        <Stack.Screen
                            name="AddIncome"
                            component={AddIncomeScreen}
                            options={{
                                headerShown: false,
                                presentation: Platform.OS === 'ios' ? 'modal' : 'card',
                                gestureEnabled: true,
                                animation: 'slide_from_bottom',
                            }}
                        />
                        <Stack.Screen
                            name="AddSubscription"
                            component={AddSubscriptionScreen}
                            options={{
                                headerShown: false,
                                animation: 'slide_from_right',
                            }}
                        />
                        <Stack.Screen
                            name="CreditCardForm"
                            component={CreditCardFormScreen}
                            options={{
                                headerShown: false,
                                animation: 'slide_from_right',
                            }}
                        />
                        <Stack.Screen
                            name="StatementUpload"
                            component={StatementUploadScreen}
                            options={{
                                headerShown: false,
                                animation: 'slide_from_right',
                            }}
                        />
                        <Stack.Screen
                            name="StatementDetail"
                            component={StatementDetailScreen}
                            options={{
                                headerShown: false,
                                animation: 'slide_from_right',
                            }}
                        />
                        <Stack.Screen
                            name="SavingsGoalDetail"
                            component={SavingsGoalDetailScreen}
                            options={({ navigation, route }) => ({
                                headerShown: true,
                                headerTitle:
                                    route.params.title || t('savings.detailScreenTitle'),
                                headerTitleAlign: 'center',
                                headerStyle: { backgroundColor: colors.surface },
                                headerTintColor: colors.textPrimary,
                                headerShadowVisible: false,
                                headerTitleStyle: {
                                    fontSize: typography.fontSize.xl,
                                    fontWeight: typography.fontWeight.bold,
                                },
                                headerBackVisible: false,
                                 headerLeft: createHeaderLeft(navigation),
                                animation: 'slide_from_right',
                            })}
                        />
                    </>
                ) : (
                    <Stack.Screen name="Onboarding" component={OnboardingScreen} />
                )}
                <Stack.Screen
                    name="Auth"
                    component={AuthNavigator}
                    options={{
                        headerShown: false,
                        animation: 'slide_from_right',
                    }}
                />
                <Stack.Screen
                    name="TermsAndConditions"
                    component={TermsAndConditionsScreen}
                    options={({ navigation }) => ({
                        headerShown: true,
                        headerTitle: t('legal.termsTitle'),
                        headerTitleAlign: 'center',
                        headerStyle: { backgroundColor: colors.surface },
                        headerTintColor: colors.textPrimary,
                        headerBackVisible: false,
                         headerLeft: createHeaderLeft(navigation),
                        animation: 'slide_from_right',
                    })}
                />
                <Stack.Screen
                    name="PrivacyPolicy"
                    component={PrivacyPolicyScreen}
                    options={({ navigation }) => ({
                        headerShown: true,
                        headerTitle: t('legal.privacyTitle'),
                        headerTitleAlign: 'center',
                        headerStyle: { backgroundColor: colors.surface },
                        headerTintColor: colors.textPrimary,
                        headerBackVisible: false,
                        headerLeft: createHeaderLeft(navigation),
                        animation: 'slide_from_right',
                    })}
                />
                <Stack.Screen
                    name="PremiumPaywall"
                    component={PremiumPaywallScreen}
                    options={{
                        headerShown: false,
                        presentation: 'modal',
                        animation: 'slide_from_bottom',
                    }}
                />
            </Stack.Navigator>
        </NavigationContainer>
    );
}
