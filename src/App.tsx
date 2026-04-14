import React, { useEffect } from 'react';
import { Platform, StatusBar, View } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './navigation/RootNavigator';
import { AlertProvider } from './components/alerts/AlertProvider';
import { OfflineRegistrationSync } from './components/OfflineRegistrationSync';
import { usePreferencesStore } from './store/preferencesStore';
import { useGuestDataStore } from './store/guestDataStore';
import { ThemeProvider, useTheme } from './theme/index';
import { usePushNotifications } from './hooks/usePushNotifications';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 2,
            retry: 2,
        },
    },
});

export default function App() {
    const hydratePreferences = usePreferencesStore((s) => s.hydrate);
    const hydrateGuestData = useGuestDataStore((s) => s.hydrate);

    useEffect(() => {
        hydratePreferences();
        hydrateGuestData();
    }, [hydrateGuestData, hydratePreferences]);

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
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
