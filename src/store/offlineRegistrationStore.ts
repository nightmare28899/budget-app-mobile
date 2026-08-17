import { create } from 'zustand';

interface OfflineRegistrationState {
    queue: never[];
    isHydrated: boolean;
    isSyncing: boolean;
}

// Kept as a compatibility shim until the root component removes its legacy import.
export const useOfflineRegistrationStore = create<OfflineRegistrationState>(() => ({
    queue: [],
    isHydrated: true,
    isSyncing: false,
}));

export async function syncOfflineRegistrations() {
    useOfflineRegistrationStore.setState({ isSyncing: false });
}
