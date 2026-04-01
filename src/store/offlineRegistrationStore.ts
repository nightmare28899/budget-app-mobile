import { create } from 'zustand';
import { RegisterAvatarPayload } from '../api/auth';
import { createSecureStorage } from './secureStorage';

const STORAGE_ID = 'offline-registration-storage';
const STORAGE_KEY = 'offlineRegistrationQueue';
const storage = createSecureStorage(STORAGE_ID);

export interface OfflineRegistrationItem {
    localId: string;
    email: string;
    name: string;
    avatar?: RegisterAvatarPayload;
    createdAt: string;
    attempts: number;
    lastError: string | null;
}

interface OfflineRegistrationInput {
    email: string;
    name: string;
    avatar?: RegisterAvatarPayload;
}

interface AddResult {
    item: OfflineRegistrationItem | null;
    reason?: 'duplicate_email';
}

interface OfflineRegistrationState {
    queue: OfflineRegistrationItem[];
    isHydrated: boolean;
    isSyncing: boolean;
    hydrate: () => void;
    addToQueue: (payload: OfflineRegistrationInput) => AddResult;
    removeFromQueue: (localId: string) => void;
    markFailed: (localId: string, error: string) => void;
    setSyncing: (syncing: boolean) => void;
}

function clearPersistedQueue() {
    storage.remove(STORAGE_KEY);
}

export const useOfflineRegistrationStore = create<OfflineRegistrationState>((set) => ({
    queue: [],
    isHydrated: false,
    isSyncing: false,

    hydrate: () => {
        clearPersistedQueue();
        set({
            queue: [],
            isHydrated: true,
            isSyncing: false,
        });
    },

    addToQueue: (_payload) => {
        clearPersistedQueue();
        set({ queue: [], isHydrated: true });
        return { item: null };
    },

    removeFromQueue: (_localId) => {
        clearPersistedQueue();
        set({ queue: [] });
    },

    markFailed: (_localId, _error) => {
        clearPersistedQueue();
        set({ queue: [] });
    },

    setSyncing: (isSyncing) => {
        set({ isSyncing });
    },
}));

export async function syncOfflineRegistrations() {
    clearPersistedQueue();
    useOfflineRegistrationStore.setState({
        queue: [],
        isSyncing: false,
    });
}
