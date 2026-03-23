import { create } from 'zustand';
import { AppLanguage, detectDeviceLanguage, isAppLanguage } from '../i18n';
import { createSecureStorage, migrateLegacyStringStore } from './secureStorage';
import { ThemeMode } from '../theme/themes';

const STORAGE_ID = 'preferences-storage';
const storage = createSecureStorage(STORAGE_ID);
migrateLegacyStringStore(STORAGE_ID, storage);

interface PreferencesState {
    language: AppLanguage;
    themeMode: ThemeMode;
    isHydrated: boolean;
    setLanguage: (language: AppLanguage) => void;
    setThemeMode: (mode: ThemeMode) => void;
    hydrate: () => void;
}

const LANGUAGE_KEY = 'language';
const THEME_MODE_KEY = 'themeMode';

function isThemeMode(value: string | null | undefined): value is ThemeMode {
    return (
        value === 'system'
        || value === 'light'
        || value === 'dark'
        || value === 'custom-1'
        || value === 'custom-2'
        || value === 'custom-3'
    );
}

export const usePreferencesStore = create<PreferencesState>((set) => ({
    language: detectDeviceLanguage(),
    themeMode: 'system',
    isHydrated: false,

    setLanguage: (language) => {
        storage.set(LANGUAGE_KEY, language);
        set({ language });
    },

    setThemeMode: (themeMode) => {
        storage.set(THEME_MODE_KEY, themeMode);
        set({ themeMode });
    },

    hydrate: () => {
        const storedLanguage = storage.getString(LANGUAGE_KEY);
        const storedThemeMode = storage.getString(THEME_MODE_KEY);
        if (isAppLanguage(storedLanguage)) {
            set({
                language: storedLanguage,
                themeMode: isThemeMode(storedThemeMode) ? storedThemeMode : 'system',
                isHydrated: true,
            });
            return;
        }

        const deviceLanguage = detectDeviceLanguage();
        storage.set(LANGUAGE_KEY, deviceLanguage);
        if (!isThemeMode(storedThemeMode)) {
            storage.set(THEME_MODE_KEY, 'system');
        }
        set({
            language: deviceLanguage,
            themeMode: isThemeMode(storedThemeMode) ? storedThemeMode : 'system',
            isHydrated: true,
        });
    },
}));
