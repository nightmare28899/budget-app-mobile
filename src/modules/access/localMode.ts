import { useAuthStore } from '../../store/authStore';
import { ensureGuestDataHydrated } from '../../store/guestDataStore';

export function isLocalMode() {
    return !useAuthStore.getState().isAuthenticated;
}

export function getLocalModeContext() {
    return {
        user: useAuthStore.getState().user,
        guestUser: useAuthStore.getState().guestUser,
        guestData: ensureGuestDataHydrated(),
    };
}

// Prepared for future guest-to-account merge/sync flows.
export function buildGuestMigrationPayload() {
    const { guestUser, guestData } = getLocalModeContext();

    return {
        profile: guestUser,
        categories: guestData.categories,
        expenses: guestData.expenses,
        subscriptions: guestData.subscriptions,
        creditCards: guestData.creditCards,
        savingsGoals: guestData.savingsGoals,
    };
}
