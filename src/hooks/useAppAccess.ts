import { useAuthStore } from '../store/authStore';

export function useAppAccess() {
    const user = useAuthStore((s) => s.user);
    const sessionMode = useAuthStore((s) => s.sessionMode);
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const isGuest = useAuthStore((s) => s.isGuest);
    const hasAccountPremium = user?.isPremium === true;
    const hasPremium = hasAccountPremium;

    return {
        user,
        sessionMode,
        isAuthenticated,
        isGuest,
        hasPremium,
        hasAccountPremium,
    };
}
