import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usersApi } from '../../api/resources/users';
import { useAuthStore } from '../../store/authStore';
import { applyEntitlements, sameAccountSession, type AccountSession } from '../../modules/access/entitlements';

export function currentAccountSession(): AccountSession {
    const state = useAuthStore.getState();
    return { userId: state.user?.id, sessionRevision: state.sessionRevision, isAuthenticated: state.isAuthenticated };
}

export function useEntitlements() {
    const cachedPremium = useAuthStore(state => state.user?.isPremium);
    const userId = useAuthStore(state => state.user?.id);
    const sessionRevision = useAuthStore(state => state.sessionRevision);
    const isAuthenticated = useAuthStore(state => state.isAuthenticated);
    const isLoading = useAuthStore(state => state.isLoading);
    const query = useQuery({
        queryKey: ['users', 'entitlements', userId, sessionRevision],
        queryFn: () => usersApi.getEntitlements(),
        enabled: isAuthenticated && !isLoading && Boolean(userId),
        staleTime: 60_000,
        retry: 1,
    });
    useEffect(() => {
        const request = { userId, sessionRevision, isAuthenticated };
        const current = useAuthStore.getState();
        if (!query.data || !current.user || !sameAccountSession(request, currentAccountSession())) { return; }
        const next = applyEntitlements(current.user, query.data);
        if (next.isPremium !== current.user.isPremium) { current.setUser(next); }
    }, [query.data, userId, sessionRevision, isAuthenticated, cachedPremium]);
    return query;
}
