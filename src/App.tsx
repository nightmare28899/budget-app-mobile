import React, { useEffect } from 'react';
import { AppState, Platform, StatusBar, StyleSheet, View } from 'react-native';
import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './navigation/RootNavigator';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AlertProvider } from './components/alerts/AlertProvider';
import { OfflineRegistrationSync } from './components/OfflineRegistrationSync';
import { usePreferencesStore } from './store/preferencesStore';
import { useGuestDataStore } from './store/guestDataStore';
import { ThemeProvider, useTheme } from './theme/index';
import { usePushNotifications } from './hooks/notifications/usePushNotifications';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 2,
            retry: 2,
        },
    },
});

const appStyles = StyleSheet.create({
    flex: {
        flex: 1,
    },
});

export default function App() {
    const hydratePreferences = usePreferencesStore((s) => s.hydrate);
    const hydrateGuestData = useGuestDataStore((s) => s.hydrate);

    useEffect(() => {
        hydratePreferences();
        hydrateGuestData();
    }, [hydrateGuestData, hydratePreferences]);

    // React Native has no window focus: map app foreground to React Query focus
    // so data written by other clients (e.g. the watch) refetches on resume.
    useEffect(() => {
        const subscription = AppState.addEventListener('change', (status) => {
            focusManager.setFocused(status === 'active');
        });

        return () => subscription.remove();
    }, []);

    return (
        <ErrorBoundary>
            <GestureHandlerRootView style={appStyles.flex}>
                <SafeAreaProvider>
                    <QueryClientProvider client={queryClient}>
                        <ThemeProvider>
                            <AlertProvider>
                                <OfflineRegistrationSync />
                                <ThemedRoot />
                            </AlertProvider>
                        </ThemeProvider>
                    </QueryClientProvider>
                </SafeAreaProvider>
            </GestureHandlerRootView>
        </ErrorBoundary>
    );
}

function ThemedRoot() {
    const { colors, isDark } = useTheme();
    usePushNotifications();

    return (
        <>
            <StatusBar
                animated={true}
                backgroundColor={colors.background}
                barStyle={isDark ? 'light-content' : 'dark-content'}
                translucent={false}
            />
            {Platform.OS === 'ios' && (
                <View
                    style={{
                        height: StatusBar.currentHeight ?? 0,
                        backgroundColor: colors.background,
                    }}
                />
            )}
            <RootNavigator />
        </>
    );
}
