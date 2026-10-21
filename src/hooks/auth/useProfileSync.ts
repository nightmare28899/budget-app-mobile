import { useEntitlements, currentAccountSession } from '../access/useEntitlements';
import { applyEntitlements, sameAccountSession } from '../../modules/access/entitlements';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { usersApi } from '../../api/resources/users';
import {
    extractAvatarUri,
    isLikelyInternalRemoteUri,
    isRemoteHttpUri,
    normalizeImageUri,
} from '../../utils/platform/media';

export function useProfileSync() {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const isLoading = useAuthStore((state) => state.isLoading);
    const userId = useAuthStore(state => state.user?.id);
    const sessionRevision = useAuthStore(state => state.sessionRevision);
    const entitlements = useEntitlements();
    const setUser = useAuthStore((state) => state.setUser);

    const profileQuery = useQuery({
        queryKey: ['users', 'me', userId, sessionRevision],
        queryFn: () => usersApi.getMe(),
        enabled: isAuthenticated && !isLoading,
        staleTime: 1000 * 60,
        retry: 1,
    });

    const profile = profileQuery.data;

    useEffect(() => {
        if (!profile || profile.id !== userId || !sameAccountSession(
            { userId, sessionRevision, isAuthenticated }, currentAccountSession(),
        )) {
            return;
        }

        const currentUser = useAuthStore.getState().user;
        const avatarFromApi = extractAvatarUri(profile);
        const currentAvatarUri = normalizeImageUri(currentUser?.avatarUri ?? null);
        const currentAvatarUrl = normalizeImageUri(currentUser?.avatarUrl ?? null);

        let resolvedAvatarUrl = currentAvatarUrl;
        let resolvedAvatarUri = currentAvatarUri ?? currentAvatarUrl;

        if (avatarFromApi !== undefined) {
            const hasLocalOptimisticAvatar =
                !!currentAvatarUri &&
                !isRemoteHttpUri(currentAvatarUri) &&
                (
                    avatarFromApi === null ||
                    (
                        typeof avatarFromApi === 'string' &&
                        isLikelyInternalRemoteUri(avatarFromApi)
                    )
                );

            if (!hasLocalOptimisticAvatar) {
                resolvedAvatarUrl = avatarFromApi;
                resolvedAvatarUri = avatarFromApi;
            }
        }

        setUser({
            ...applyEntitlements(profile, entitlements.data),
            avatarUrl: resolvedAvatarUrl,
            avatarUri: resolvedAvatarUri,
        });
    }, [profile, setUser, entitlements.data, userId, sessionRevision, isAuthenticated]);
}
