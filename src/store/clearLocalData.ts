import type { QueryClient } from '@tanstack/react-query';
import { useAuthStore } from './authStore';
import { useBudgetStore } from './budgetStore';
import { useGuestDataStore } from './guestDataStore';
import { useOfflineStore } from './offlineStore';
import { usePreferencesStore } from './preferencesStore';
import { useSavingsStore } from './savingsStore';

export function clearLocalData(queryClient: QueryClient): void {
    queryClient.clear();
    useGuestDataStore.getState().reset();
    useOfflineStore.getState().clearQueue();
    useBudgetStore.getState().reset();
    useSavingsStore.getState().reset();
    usePreferencesStore.getState().clearAccountData();
    useAuthStore.getState().clearAll();
}
