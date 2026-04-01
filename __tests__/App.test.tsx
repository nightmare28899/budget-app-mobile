/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

const mockHydratePreferences = jest.fn();
const mockHydrateGuestData = jest.fn();

jest.mock('react-native-gesture-handler', () => {
    const React = require('react');
    const { View } = require('react-native');

    return {
        GestureHandlerRootView: ({ children }: { children: React.ReactNode }) => (
            <View>{children}</View>
        ),
    };
});

jest.mock('react-native-safe-area-context', () => {
    const React = require('react');
    const { View } = require('react-native');

    return {
        SafeAreaProvider: ({ children }: { children: React.ReactNode }) => (
            <View>{children}</View>
        ),
    };
});

jest.mock('../src/navigation/RootNavigator', () => {
    const React = require('react');
    const { Text } = require('react-native');

    return {
        RootNavigator: () => <Text>Root navigator</Text>,
    };
});

jest.mock('../src/components/alerts/AlertProvider', () => ({
    AlertProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('../src/components/OfflineRegistrationSync', () => ({
    OfflineRegistrationSync: () => null,
}));

jest.mock('../src/theme', () => ({
    ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
    useTheme: () => ({
        colors: {
            background: '#ffffff',
        },
        isDark: false,
    }),
}));

jest.mock('../src/store/preferencesStore', () => ({
    usePreferencesStore: (
        selector: (state: { hydrate: typeof mockHydratePreferences }) => unknown,
    ) => selector({ hydrate: mockHydratePreferences }),
}));

jest.mock('../src/store/guestDataStore', () => ({
    useGuestDataStore: (
        selector: (state: { hydrate: typeof mockHydrateGuestData }) => unknown,
    ) => selector({ hydrate: mockHydrateGuestData }),
}));

import App from '../App';

test('renders correctly', async () => {
    await ReactTestRenderer.act(() => {
        ReactTestRenderer.create(<App />);
    });

    expect(mockHydratePreferences).toHaveBeenCalledTimes(1);
    expect(mockHydrateGuestData).toHaveBeenCalledTimes(1);
});
