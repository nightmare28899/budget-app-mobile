import { create } from 'zustand';
import { User } from '../types';
import { createSecureStorage, migrateLegacyStringStore } from './secureStorage';
import { normalizeImageUri } from '../utils/media';
import { isLikelyInternalRemoteUri, isRemoteHttpUri } from '../utils/media';

const STORAGE_ID = 'auth-storage';
const storage = createSecureStorage(STORAGE_ID);
migrateLegacyStringStore(STORAGE_ID, storage);

function normalizeKeyPart(value?: string): string | null {
    if (typeof value !== 'string') {
        return null;
    }

    const normalized = value.trim().toLowerCase();
    return normalized.length ? normalized : null;
}

function getAvatarKey(user: Pick<User, 'email' | 'id'>): string | null {
    const emailKey = normalizeKeyPart(user.email);
    if (emailKey) {
        return `avatar:email:${emailKey}`;
    }

    const idKey = normalizeKeyPart(user.id);
    if (idKey) {
        return `avatar:id:${idKey}`;
    }

    return null;
}

function getAvatarSuppressionKey(user: Pick<User, 'email' | 'id'>): string | null {
    const emailKey = normalizeKeyPart(user.email);
    if (emailKey) {
        return `avatar:suppressed:email:${emailKey}`;
    }

    const idKey = normalizeKeyPart(user.id);
    if (idKey) {
        return `avatar:suppressed:id:${idKey}`;
    }

    return null;
}

function normalizeUri(value?: string | null): string | null {
    return normalizeImageUri(value);
}

function applyStoredAvatar(user: User): User {
    const avatarKey = getAvatarKey(user);
    const storedAvatarRaw = avatarKey ? storage.getString(avatarKey) : null;
    const storedAvatarUri = normalizeUri(storedAvatarRaw);
    const hasStoredLocalAvatar =
        !!storedAvatarUri && !isRemoteHttpUri(storedAvatarUri);
    const avatarSuppressionKey = getAvatarSuppressionKey(user);
    const avatarSuppressed =
        !!avatarSuppressionKey && storage.getString(avatarSuppressionKey) === '1';

    const explicitAvatarUri = normalizeUri(user.avatarUri);
    if (explicitAvatarUri) {
        if (!isRemoteHttpUri(explicitAvatarUri)) {
            return { ...user, avatarUri: explicitAvatarUri };
        }

        if (avatarSuppressed) {
            return { ...user, avatarUri: null };
        }

        if (hasStoredLocalAvatar && isLikelyInternalRemoteUri(explicitAvatarUri)) {
            return { ...user, avatarUri: storedAvatarUri };
        }
        return { ...user, avatarUri: explicitAvatarUri };
    }

    if (avatarSuppressed) {
        return { ...user, avatarUri: null };
    }

    if (user.avatarUri === null) {
        if (hasStoredLocalAvatar) {
            return {
                ...user,
                avatarUri: storedAvatarUri,
                avatarUrl: user.avatarUrl ?? null,
            };
        }
        return { ...user, avatarUri: null, avatarUrl: user.avatarUrl ?? null };
    }

    const avatarFromApi = normalizeUri(user.avatarUrl);
    if (avatarFromApi) {
        if (hasStoredLocalAvatar && isLikelyInternalRemoteUri(avatarFromApi)) {
            return { ...user, avatarUri: storedAvatarUri, avatarUrl: avatarFromApi };
        }
        return { ...user, avatarUri: avatarFromApi };
    }

    return storedAvatarUri
        ? { ...user, avatarUri: storedAvatarUri }
        : { ...user, avatarUri: null };
}

function persistAvatar(user: User) {
    const avatarKey = getAvatarKey(user);
    const avatarSuppressionKey = getAvatarSuppressionKey(user);
    if (!avatarKey) {
        return;
    }

    const avatarUri = normalizeUri(user.avatarUri);

    if (avatarUri) {
        storage.set(avatarKey, avatarUri);
        if (avatarSuppressionKey) {
            storage.remove(avatarSuppressionKey);
        }
        return;
    }

    storage.remove(avatarKey);
}

interface AuthState {
    user: User | null;
    accessToken: string | null;
    refreshToken: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;

    setAuth: (user: User, accessToken: string, refreshToken: string) => void;
    setTokens: (accessToken: string, refreshToken: string) => void;
    setUser: (user: User) => void;
    setAvatarSuppressed: (suppressed: boolean) => void;
    logout: () => void;
    hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
    isLoading: true,

    setAuth: (user, accessToken, refreshToken) => {
        const userWithAvatar = applyStoredAvatar(user);
        persistAvatar(userWithAvatar);

        storage.set('user', JSON.stringify(userWithAvatar));
        storage.set('accessToken', accessToken);
        storage.set('refreshToken', refreshToken);

        set({
            user: userWithAvatar,
            accessToken,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
        });
    },

    setTokens: (accessToken, refreshToken) => {
        storage.set('accessToken', accessToken);
        storage.set('refreshToken', refreshToken);
        set({ accessToken, refreshToken });
    },

    setUser: (user) => {
        const userWithAvatar = applyStoredAvatar(user);
        persistAvatar(userWithAvatar);

        storage.set('user', JSON.stringify(userWithAvatar));
        set({ user: userWithAvatar });
    },

    setAvatarSuppressed: (suppressed) => {
        set((state) => {
            if (!state.user) {
                return {};
            }

            const suppressionKey = getAvatarSuppressionKey(state.user);
            if (suppressionKey) {
                if (suppressed) {
                    storage.set(suppressionKey, '1');
                } else {
                    storage.remove(suppressionKey);
                }
            }

            const userWithAvatar = applyStoredAvatar(state.user);
            persistAvatar(userWithAvatar);
            storage.set('user', JSON.stringify(userWithAvatar));

            return { user: userWithAvatar };
        });
    },

    logout: () => {
        storage.remove('user');
        storage.remove('accessToken');
        storage.remove('refreshToken');

        set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
        });
    },

    hydrate: () => {
        try {
            const userStr = storage.getString('user');
            const accessToken = storage.getString('accessToken');
            const refreshToken = storage.getString('refreshToken');

            if (userStr && accessToken && refreshToken) {
                const user = applyStoredAvatar(JSON.parse(userStr) as User);
                persistAvatar(user);
                set({
                    user,
                    accessToken,
                    refreshToken,
                    isAuthenticated: true,
                    isLoading: false,
                });
            } else {
                set({ isLoading: false });
            }
        } catch {
            set({ isLoading: false });
        }
    },
}));
