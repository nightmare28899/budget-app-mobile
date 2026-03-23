import { create } from 'zustand';
import { authApi, RegisterAvatarPayload } from '../api/auth';
import { extractApiMessage } from '../utils/api';
import { createSecureStorage, migrateLegacyStringStore } from './secureStorage';

const STORAGE_ID = 'offline-registration-storage';
const storage = createSecureStorage(STORAGE_ID);
migrateLegacyStringStore(STORAGE_ID, storage);
const STORAGE_KEY = 'offlineRegistrationQueue';
const MAX_QUEUE_ITEMS = 20;
const MAX_ITEM_AGE_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export interface OfflineRegistrationItem {
    localId: string;
    email: string;
    name: string;
    password: string;
    avatar?: RegisterAvatarPayload;
    createdAt: string;
    attempts: number;
    lastError: string | null;
}

interface OfflineRegistrationInput {
    email: string;
    name: string;
    password: string;
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

function persistQueue(queue: OfflineRegistrationItem[]) {
    const sanitizedQueue = pruneQueue(queue);

    if (!sanitizedQueue.length) {
        storage.remove(STORAGE_KEY);
        return;
    }

    storage.set(STORAGE_KEY, JSON.stringify(sanitizedQueue));
}

function normalizeEmail(email: string) {
    return email.trim().toLowerCase();
}

function pruneQueue(queue: OfflineRegistrationItem[]) {
    const now = Date.now();

    const fresh = queue.filter((item) => {
        const createdAt = Date.parse(item.createdAt);
        return Number.isFinite(createdAt) && now - createdAt <= MAX_ITEM_AGE_MS;
    });

    if (fresh.length <= MAX_QUEUE_ITEMS) {
        return fresh;
    }

    return fresh.slice(fresh.length - MAX_QUEUE_ITEMS);
}

function readPersistedQueue(): OfflineRegistrationItem[] {
    try {
        const queueStr = storage.getString(STORAGE_KEY);
        if (!queueStr) {
            return [];
        }

        const queue = JSON.parse(queueStr) as OfflineRegistrationItem[];
        if (!Array.isArray(queue)) {
            return [];
        }

        return pruneQueue(queue);
    } catch {
        return [];
    }
}

export const useOfflineRegistrationStore = create<OfflineRegistrationState>(
    (set, get) => ({
        queue: [],
        isHydrated: false,
        isSyncing: false,

        hydrate: () => {
            set({ queue: readPersistedQueue(), isHydrated: true });
        },

        addToQueue: (payload) => {
            const state = get();
            const baseQueue = state.isHydrated ? state.queue : readPersistedQueue();
            const email = normalizeEmail(payload.email);
            const duplicate = baseQueue.some(
                (entry) => normalizeEmail(entry.email) === email,
            );

            if (duplicate) {
                set({ queue: baseQueue, isHydrated: true });
                return { item: null, reason: 'duplicate_email' };
            }

            const item: OfflineRegistrationItem = {
                localId: `offline_reg_${Date.now()}_${Math.random().toString(36).slice(2)}`,
                email,
                name: payload.name.trim(),
                password: payload.password,
                avatar: payload.avatar,
                createdAt: new Date().toISOString(),
                attempts: 0,
                lastError: null,
            };

            const queue = pruneQueue([...baseQueue, item]);
            persistQueue(queue);
            set({ queue, isHydrated: true });
            return { item };
        },

        removeFromQueue: (localId) => {
            const queue = pruneQueue(
                get().queue.filter((item) => item.localId !== localId),
            );
            persistQueue(queue);
            set({ queue });
        },

        markFailed: (localId, error) => {
            const queue = pruneQueue(
                get().queue.map((item) =>
                    item.localId === localId
                        ? {
                            ...item,
                            attempts: item.attempts + 1,
                            lastError: error,
                        }
                        : item,
                ),
            );
            persistQueue(queue);
            set({ queue });
        },

        setSyncing: (isSyncing) => {
            set({ isSyncing });
        },
    }),
);

let syncInFlight = false;

export async function syncOfflineRegistrations() {
    if (syncInFlight) {
        return;
    }

    const state = useOfflineRegistrationStore.getState();
    const snapshot = [...state.queue];
    if (!snapshot.length) {
        return;
    }

    syncInFlight = true;
    state.setSyncing(true);

    try {
        for (const item of snapshot) {
            try {
                await authApi.register(
                    item.email,
                    item.name,
                    item.password,
                    item.avatar,
                );
                useOfflineRegistrationStore.getState().removeFromQueue(item.localId);
            } catch (err: any) {
                const message =
                    extractApiMessage(err?.response?.data) ||
                    err?.message ||
                    'Failed to sync registration';
                const status = err?.response?.status;

                if (!err?.response) {
                    useOfflineRegistrationStore.getState().markFailed(item.localId, message);
                    break;
                }

                if (status === 409) {
                    useOfflineRegistrationStore.getState().removeFromQueue(item.localId);
                    continue;
                }

                if (status >= 400 && status < 500) {
                    useOfflineRegistrationStore.getState().removeFromQueue(item.localId);
                    continue;
                }

                useOfflineRegistrationStore.getState().markFailed(item.localId, message);
                break;
            }
        }
    } finally {
        syncInFlight = false;
        useOfflineRegistrationStore.getState().setSyncing(false);
    }
}
