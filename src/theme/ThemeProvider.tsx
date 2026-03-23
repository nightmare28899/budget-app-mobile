import React, {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import { usePreferencesStore } from '../store/preferencesStore';
import {
    resolveThemeId,
    themeDefinitions,
    themeOptions,
    ThemeId,
    ThemeMode,
} from './themes';

export type ThemeContextValue = {
    themeMode: ThemeMode;
    resolvedThemeId: ThemeId;
    isDark: boolean;
    colors: (typeof themeDefinitions)[ThemeId]['colors'];
    setThemeMode: (mode: ThemeMode) => void;
    themeOptions: typeof themeOptions;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isDarkScheme(scheme: ColorSchemeName | null | undefined): boolean {
    return scheme === 'dark';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const themeMode = usePreferencesStore((s) => s.themeMode);
    const setThemeMode = usePreferencesStore((s) => s.setThemeMode);

    const [systemIsDark, setSystemIsDark] = useState(() =>
        isDarkScheme(Appearance.getColorScheme()),
    );

    useEffect(() => {
        const subscription = Appearance.addChangeListener(({ colorScheme }) => {
            setSystemIsDark(isDarkScheme(colorScheme));
        });

        return () => {
            subscription.remove();
        };
    }, []);

    const resolvedThemeId = useMemo(
        () => resolveThemeId(themeMode, systemIsDark),
        [systemIsDark, themeMode],
    );

    const value = useMemo<ThemeContextValue>(() => {
        const activeTheme = themeDefinitions[resolvedThemeId];
        return {
            themeMode,
            resolvedThemeId,
            isDark: resolvedThemeId !== 'light',
            colors: activeTheme.colors,
            setThemeMode,
            themeOptions,
        };
    }, [resolvedThemeId, setThemeMode, themeMode]);

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within ThemeProvider');
    }
    return context;
}
