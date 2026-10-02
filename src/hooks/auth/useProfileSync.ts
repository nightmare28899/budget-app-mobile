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
    const user = useAuthStore((state) => state.user);
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const isLoading = useAuthStore((state) => state.isLoading);
    const setUser = useAuthStore((state) => state.setUser);

    const profileQuery = useQuery({
        queryKey: ['users', 'me'],
        queryFn: () => usersApi.getMe(),
        enabled: isAuthenticated && !isLoading,
        staleTime: 1000 * 60,
        retry: 1,
    });

    const profile = profileQuery.data;

    useEffect(() => {
        if (!profile) {
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
            ...profile,
            avatarUrl: resolvedAvatarUrl,
            avatarUri: resolvedAvatarUri,
        });
    }, [profile, setUser]);
}
