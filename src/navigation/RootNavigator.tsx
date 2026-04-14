import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
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
import { PremiumPaywallScreen } from '../screens/premium/PremiumPaywallScreen';
import { TermsAndConditionsScreen } from '../screens/legal/TermsAndConditionsScreen';
import { useAuthStore } from '../store/authStore';
import { usersApi } from '../api/resources/users';
import { useTheme } from '../theme/index';
import {
    extractAvatarUri,
    isLikelyInternalRemoteUri,
    isRemoteHttpUri,
    normalizeImageUri,
} from '../utils/platform/media';
import { useI18n } from '../hooks/useI18n';
import { AppSplashScreen } from '../components/ui/layout/AppSplashScreen';
import { ScreenBackButton } from '../components/ui/primitives/ScreenBackButton';
import {
    usePreferencesStore,
} from '../store/preferencesStore';
import { useGuestDataStore } from '../store/guestDataStore';
import {
    flushPendingNotificationDestination,
    rootNavigationRef,
} from './navigationBridge';

const Stack = createNativeStackNavigator<RootStackParamList>();
const MIN_SPLASH_MS = 1200;

export function RootNavigator() {
    const { isAuthenticated, isLoading, hydrate, setUser } = useAuthStore();
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

    const { data: profile } = useQuery({
        queryKey: ['users', 'me'],
        queryFn: usersApi.getMe,
        enabled: isAuthenticated && !isLoading,
        staleTime: 1000 * 60,
        retry: 1,
    });

    useEffect(() => {
        if (!profile) {
            return;
        }

        const currentUser = useAuthStore.getState().user;
        const avatarFromApi = extractAvatarUri(profile);
        const currentAvatarUri = normalizeImageUri(currentUser?.avatarUri ?? null);
        const currentAvatarUrl = normalizeImageUri(currentUser?.avatarUrl ?? null);

        let resolvedAvatarUrl = currentAvatarUrl;
        let resolvedAvatarUri = currentAvatarUri ?? currentAvatarUrl;

        if (avatarFromApi !== undefined) {
            const hasLocalOptimisticAvatar =
                !!currentAvatarUri &&
                !isRemoteHttpUri(currentAvatarUri) &&
                (
                    avatarFromApi === null ||
                    (
                        typeof avatarFromApi === 'string' &&
                        isLikelyInternalRemoteUri(avatarFromApi)
                    )
                );

            if (!hasLocalOptimisticAvatar) {
                resolvedAvatarUrl = avatarFromApi;
                resolvedAvatarUri = avatarFromApi;
            }
        }

        setUser({
            ...profile,
            avatarUrl: resolvedAvatarUrl,
            avatarUri: resolvedAvatarUri,
        });
    }, [profile, setUser]);

    const shouldShowSplash =
        isLoading
        || !isPreferencesHydrated
        || !isGuestDataHydrated
        || !splashReady;

    if (shouldShowSplash) {
        return <AppSplashScreen />;
    }

    return (
        <NavigationContainer
            ref={rootNavigationRef}
            onReady={flushPendingNotificationDestination}
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
                            }}
                        />
                        <Stack.Screen
                            name="PlanOverview"
                            component={PlanOverviewScreen}
                            options={{
                                headerShown: false,
                                animation: 'slide_from_right',
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
                                headerBackVisible: false,
                                headerLeft: () => (
                                    <ScreenBackButton onPress={() => navigation.goBack()} />
                                ),
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
                                headerLeft: () => (
                                    <ScreenBackButton onPress={() => navigation.goBack()} />
                                ),
                                animation: 'slide_from_bottom',
                            })}
                        />
                        <Stack.Screen
                            name="AddEntry"
                            component={AddEntryScreen}
                            options={{
                                headerShown: false,
                                animation: 'slide_from_bottom',
                            }}
                        />
                        <Stack.Screen
                            name="AddExpense"
                            component={AddExpenseScreen}
                            options={{
                                headerShown: false,
                                animation: 'slide_from_bottom',
                            }}
                        />
                        <Stack.Screen
                            name="AddIncome"
                            component={AddIncomeScreen}
                            options={{
                                headerShown: false,
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
                            name="SavingsGoalDetail"
                            component={SavingsGoalDetailScreen}
                            options={({ navigation, route }) => ({
                                headerShown: true,
                                headerTitle:
                                    route.params.title || t('savings.detailScreenTitle'),
                                headerTitleAlign: 'center',
                                headerStyle: { backgroundColor: colors.surface },
                                headerTintColor: colors.textPrimary,
                                headerBackVisible: false,
                                headerLeft: () => (
                                    <ScreenBackButton onPress={() => navigation.goBack()} />
                                ),
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
                        headerLeft: () => (
                            <ScreenBackButton onPress={() => navigation.goBack()} />
                        ),
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
