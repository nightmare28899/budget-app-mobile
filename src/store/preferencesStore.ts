import { create } from 'zustand';
import { AppLanguage, detectDeviceLanguage, isAppLanguage } from '../i18n';
import { createSecureStorage, migrateLegacyStringStore } from './secureStorage';
import { ThemeMode } from '../theme/themes';

const STORAGE_ID = 'preferences-storage';
const storage = createSecureStorage(STORAGE_ID);
migrateLegacyStringStore(STORAGE_ID, storage);

type PreferenceScopedUser = {
    id?: string | null;
    email?: string | null;
};

interface PreferencesState {
    language: AppLanguage;
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

export const usePreferencesStore = create<PreferencesState>((set) => ({
    language: detectDeviceLanguage(),
    themeMode: 'system',
    hasCompletedOnboarding: false,
    manualPremiumByUser: {},
    isHydrated: false,

    setLanguage: (language) => {
        storage.set(LANGUAGE_KEY, language);
        set({ language });
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
        const storedLanguage = storage.getString(LANGUAGE_KEY);
        const storedThemeMode = storage.getString(THEME_MODE_KEY);
        const hasCompletedOnboarding = readOnboardingCompleted(
            storage.getString(ONBOARDING_COMPLETED_KEY),
        );
        const manualPremiumByUser = readBooleanMap(
            storage.getString(MANUAL_PREMIUM_KEY),
        );
        if (isAppLanguage(storedLanguage)) {
            set({
                language: storedLanguage,
                themeMode: isThemeMode(storedThemeMode) ? storedThemeMode : 'system',
                hasCompletedOnboarding,
                manualPremiumByUser,
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
            hasCompletedOnboarding,
            manualPremiumByUser,
            isHydrated: true,
        });
    },
}));
