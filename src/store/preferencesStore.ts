import { create } from 'zustand';
import { AppLanguage, detectDeviceLanguage, isAppLanguage } from '../i18n/index';
import { createSecureStorage, migrateLegacyStringStore } from './secureStorage';
import { ThemeMode } from '../theme/themes';

const STORAGE_ID = 'preferences-storage';
const storage = createSecureStorage(STORAGE_ID);
migrateLegacyStringStore(STORAGE_ID, storage);

type PreferenceScopedUser = {
    id?: string | null;
    email?: string | null;
};

type LanguagePreferenceSource = 'device' | 'manual';

interface PreferencesState {
    language: AppLanguage;
    languageSource: LanguagePreferenceSource;
    themeMode: ThemeMode;
    hasCompletedOnboarding: boolean;
    manualPremiumByUser: Record<string, boolean>;
    isHydrated: boolean;
    setLanguage: (language: AppLanguage) => void;
    setThemeMode: (mode: ThemeMode) => void;
    markOnboardingCompleted: (user?: PreferenceScopedUser | string) => void;
    resetOnboarding: (user?: PreferenceScopedUser | string) => void;
    setManualPremium: (user: PreferenceScopedUser | string, enabled: boolean) => void;
    hydrate: () => void;
}

const LANGUAGE_KEY = 'language';
const LANGUAGE_SOURCE_KEY = 'languageSource';
const THEME_MODE_KEY = 'themeMode';
const ONBOARDING_COMPLETED_KEY = 'completedOnboardingByUser';
const MANUAL_PREMIUM_KEY = 'manualPremiumByUser';

function normalizeKeyPart(value?: string | null): string | null {
    if (!value) {
        return null;
    }

    const normalized = value.trim().toLowerCase();
    return normalized.length > 0 ? normalized : null;
}

export function buildPreferenceScopedUserKey(
    user: PreferenceScopedUser | string | null | undefined,
): string | null {
    if (!user) {
        return null;
    }

    if (typeof user === 'string') {
        return normalizeKeyPart(user);
    }

    const idKey = normalizeKeyPart(user.id);
    if (idKey) {
        return `id:${idKey}`;
    }

    const emailKey = normalizeKeyPart(user.email);
    return emailKey ? `email:${emailKey}` : null;
}

function readBooleanMap(value: string | undefined): Record<string, boolean> {
    if (!value) {
        return {};
    }

    try {
        const parsed = JSON.parse(value) as Record<string, unknown>;
        return Object.entries(parsed).reduce<Record<string, boolean>>((acc, [key, entry]) => {
            if (typeof entry === 'boolean') {
                acc[key] = entry;
            }

            return acc;
        }, {});
    } catch {
        return {};
    }
}

function readOnboardingCompleted(value: string | undefined): boolean {
    if (!value) {
        return false;
    }

    try {
        const parsed = JSON.parse(value) as unknown;
        if (typeof parsed === 'boolean') {
            return parsed;
        }

        if (parsed && typeof parsed === 'object') {
            return Object.values(parsed as Record<string, unknown>).some(
                (entry) => entry === true,
            );
        }
    } catch {
        return value === 'true' || value === '1';
    }

    return false;
}

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

function isLanguagePreferenceSource(
    value: string | null | undefined,
): value is LanguagePreferenceSource {
    return value === 'device' || value === 'manual';
}

type ResolvedPreferences = Pick<
    PreferencesState,
    | 'language'
    | 'languageSource'
    | 'themeMode'
    | 'hasCompletedOnboarding'
    | 'manualPremiumByUser'
>;

function resolveStoredPreferences(): ResolvedPreferences {
    const storedLanguage = storage.getString(LANGUAGE_KEY);
    const storedLanguageSource = storage.getString(LANGUAGE_SOURCE_KEY);
    const storedThemeMode = storage.getString(THEME_MODE_KEY);
    const hasCompletedOnboarding = readOnboardingCompleted(
        storage.getString(ONBOARDING_COMPLETED_KEY),
    );
    const manualPremiumByUser = readBooleanMap(
        storage.getString(MANUAL_PREMIUM_KEY),
    );
    const deviceLanguage = detectDeviceLanguage();
    const languageSource = isLanguagePreferenceSource(storedLanguageSource)
        ? storedLanguageSource
        : 'device';

    if (languageSource === 'manual' && isAppLanguage(storedLanguage)) {
        return {
            language: storedLanguage,
            languageSource,
            themeMode: isThemeMode(storedThemeMode) ? storedThemeMode : 'system',
            hasCompletedOnboarding,
            manualPremiumByUser,
        };
    }

    return {
        language: deviceLanguage,
        languageSource: 'device',
        themeMode: isThemeMode(storedThemeMode) ? storedThemeMode : 'system',
        hasCompletedOnboarding,
        manualPremiumByUser,
    };
}

const initialPreferences = resolveStoredPreferences();

export const usePreferencesStore = create<PreferencesState>((set) => ({
    ...initialPreferences,
    isHydrated: false,

    setLanguage: (language) => {
        storage.set(LANGUAGE_KEY, language);
        storage.set(LANGUAGE_SOURCE_KEY, 'manual');
        set({ language, languageSource: 'manual' });
    },

    setThemeMode: (themeMode) => {
        storage.set(THEME_MODE_KEY, themeMode);
        set({ themeMode });
    },

    markOnboardingCompleted: () => {
        storage.set(ONBOARDING_COMPLETED_KEY, JSON.stringify(true));
        set({ hasCompletedOnboarding: true });
    },

    resetOnboarding: () => {
        storage.set(ONBOARDING_COMPLETED_KEY, JSON.stringify(false));
        set({ hasCompletedOnboarding: false });
    },

    setManualPremium: (user, enabled) => {
        const scopedKey = buildPreferenceScopedUserKey(user);
        if (!scopedKey) {
            return;
        }

        set((state) => {
            const manualPremiumByUser = {
                ...state.manualPremiumByUser,
                [scopedKey]: enabled,
            };
            storage.set(
                MANUAL_PREMIUM_KEY,
                JSON.stringify(manualPremiumByUser),
            );
            return { manualPremiumByUser };
        });
    },

    hydrate: () => {
        const preferences = resolveStoredPreferences();

        storage.set(LANGUAGE_KEY, preferences.language);
        storage.set(LANGUAGE_SOURCE_KEY, preferences.languageSource);
        if (!isThemeMode(storage.getString(THEME_MODE_KEY))) {
            storage.set(THEME_MODE_KEY, 'system');
        }
        set({
            ...preferences,
            isHydrated: true,
        });
    },
}));
