import { create } from 'zustand';
import { CreateExpensePayload } from '../types';
import { createSecureStorage, migrateLegacyStringStore } from './secureStorage';

const STORAGE_ID = 'offline-storage';
const storage = createSecureStorage(STORAGE_ID);
migrateLegacyStringStore(STORAGE_ID, storage);

interface OfflineExpense extends CreateExpensePayload {
    localId: string;
    createdAt: string;
}

interface OfflineState {
    queue: OfflineExpense[];
    addToQueue: (expense: CreateExpensePayload) => void;
    removeFromQueue: (localId: string) => void;
    clearQueue: () => void;
    hydrate: () => void;
}

export const useOfflineStore = create<OfflineState>((set, get) => ({
    queue: [],

    addToQueue: (expense) => {
        const localId = `offline_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        const offlineExpense: OfflineExpense = {
            ...expense,
            localId,
            createdAt: new Date().toISOString(),
        };

        const newQueue = [...get().queue, offlineExpense];
        storage.set('offlineQueue', JSON.stringify(newQueue));
        set({ queue: newQueue });
    },

    removeFromQueue: (localId) => {
        const newQueue = get().queue.filter((e) => e.localId !== localId);
        storage.set('offlineQueue', JSON.stringify(newQueue));
        set({ queue: newQueue });
    },

    clearQueue: () => {
        storage.remove('offlineQueue');
        set({ queue: [] });
    },

    hydrate: () => {
        try {
            const queueStr = storage.getString('offlineQueue');
            if (queueStr) {
                const queue = JSON.parse(queueStr) as OfflineExpense[];
                set({ queue });
            }
        } catch (error) {
            console.error('Failed to hydrate offline queue', error);
        }
    },
}));
