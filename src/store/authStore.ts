import { create } from 'zustand';
import { User } from '../types/index';
import { createSecureStorage, migrateLegacyStringStore } from './secureStorage';
import { resetToMainDashboard } from '../navigation/navigationBridge';
import { normalizeImageUri } from '../utils/platform/media';
import { isLikelyInternalRemoteUri, isRemoteHttpUri } from '../utils/platform/media';
import { DEFAULT_CURRENCY } from '../utils/domain/currency';
import { normalizeUserRecord } from '../utils/domain/user';

const STORAGE_ID = 'auth-storage';
const storage = createSecureStorage(STORAGE_ID);
migrateLegacyStringStore(STORAGE_ID, storage);
const AUTH_USER_KEY = 'authUser';
const GUEST_USER_KEY = 'guestUser';
const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

export type SessionMode = 'guest' | 'authenticated';

function buildDefaultGuestUser(): User {
  return {
    id: 'guest-local',
    email: '',
    name: 'Guest',
    role: 'guest',
    currency: DEFAULT_CURRENCY,
    budgetAmount: 0,
    budgetPeriod: 'monthly',
    budgetPeriodStart: null,
    budgetPeriodEnd: null,
    weeklyReportEnabled: false,
    monthlyReportEnabled: false,
    avatarUrl: null,
    avatarUri: null,
  };
}

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

function getAvatarSuppressionKey(
  user: Pick<User, 'email' | 'id'>,
): string | null {
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
  guestUser: User;
  accessToken: string | null;
  refreshToken: string | null;
  sessionMode: SessionMode;
  isAuthenticated: boolean;
  isGuest: boolean;
  isLoading: boolean;

  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: User) => void;
  setAvatarSuppressed: (suppressed: boolean) => void;
  logout: () => void;
  hydrate: () => void;
}

function persistActiveUser(mode: SessionMode, user: User) {
  storage.set(
    mode === 'authenticated' ? AUTH_USER_KEY : GUEST_USER_KEY,
    JSON.stringify(user),
  );
}

function readStoredUser(key: string): User | null {
  const raw = storage.getString(key);
  if (!raw) {
    return null;
  }

  try {
    return applyStoredAvatar(normalizeUserRecord(JSON.parse(raw)));
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>(set => ({
  user: null,
  guestUser: buildDefaultGuestUser(),
  accessToken: null,
  refreshToken: null,
  sessionMode: 'guest',
  isAuthenticated: false,
  isGuest: true,
  isLoading: true,

  setAuth: (user, accessToken, refreshToken) => {
    const userWithAvatar = applyStoredAvatar(normalizeUserRecord(user));
    persistAvatar(userWithAvatar);

    persistActiveUser('authenticated', userWithAvatar);
    storage.set(ACCESS_TOKEN_KEY, accessToken);
    storage.set(REFRESH_TOKEN_KEY, refreshToken);

    set({
      user: userWithAvatar,
      sessionMode: 'authenticated',
      accessToken,
      refreshToken,
      isAuthenticated: true,
      isGuest: false,
      isLoading: false,
    });
  },

  setTokens: (accessToken, refreshToken) => {
    storage.set(ACCESS_TOKEN_KEY, accessToken);
    storage.set(REFRESH_TOKEN_KEY, refreshToken);
    set({ accessToken, refreshToken });
  },

  setUser: user =>
    set(state => {
      const userWithAvatar = applyStoredAvatar(
        normalizeUserRecord(user, state.user),
      );
      persistAvatar(userWithAvatar);
      persistActiveUser(state.sessionMode, userWithAvatar);

      if (state.sessionMode === 'authenticated') {
        return { user: userWithAvatar };
      }

      return {
        user: userWithAvatar,
        guestUser: userWithAvatar,
      };
    }),

  setAvatarSuppressed: suppressed => {
    set(state => {
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
      persistActiveUser(state.sessionMode, userWithAvatar);

      if (state.sessionMode === 'authenticated') {
        return { user: userWithAvatar };
      }

      return {
        user: userWithAvatar,
        guestUser: userWithAvatar,
      };
    });
  },

  logout: () => {
    storage.remove(AUTH_USER_KEY);
    storage.remove(ACCESS_TOKEN_KEY);
    storage.remove(REFRESH_TOKEN_KEY);

    const guestUser = readStoredUser(GUEST_USER_KEY) ?? buildDefaultGuestUser();
    persistAvatar(guestUser);
    persistActiveUser('guest', guestUser);

    set({
      user: guestUser,
      guestUser,
      accessToken: null,
      refreshToken: null,
      sessionMode: 'guest',
      isAuthenticated: false,
      isGuest: true,
      isLoading: false,
    });

    resetToMainDashboard();
  },

  hydrate: () => {
    try {
      const guestUser =
        readStoredUser(GUEST_USER_KEY) ?? buildDefaultGuestUser();
      const authUser = readStoredUser(AUTH_USER_KEY);
      const accessToken = storage.getString(ACCESS_TOKEN_KEY);
      const refreshToken = storage.getString(REFRESH_TOKEN_KEY);

      persistAvatar(guestUser);
      persistActiveUser('guest', guestUser);

      if (authUser && accessToken && refreshToken) {
        persistAvatar(authUser);
        set({
          user: authUser,
          guestUser,
          accessToken,
          refreshToken,
          sessionMode: 'authenticated',
          isAuthenticated: true,
          isGuest: false,
          isLoading: false,
        });
      } else {
        set({
          user: guestUser,
          guestUser,
          accessToken: null,
          refreshToken: null,
          sessionMode: 'guest',
          isAuthenticated: false,
          isGuest: true,
          isLoading: false,
        });
      }
    } catch {
      const guestUser = buildDefaultGuestUser();
      persistActiveUser('guest', guestUser);
      set({
        user: guestUser,
        guestUser,
        accessToken: null,
        refreshToken: null,
        sessionMode: 'guest',
        isAuthenticated: false,
        isGuest: true,
        isLoading: false,
      });
    }
  },
}));
