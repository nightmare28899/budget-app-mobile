import { useEffect } from 'react';
import { AppState } from 'react-native';
import {
    syncOfflineRegistrations,
    useOfflineRegistrationStore,
} from '../store/offlineRegistrationStore';

const SYNC_INTERVAL_MS = 15000;

export function OfflineRegistrationSync() {
    const hydrate = useOfflineRegistrationStore((s) => s.hydrate);
    const isHydrated = useOfflineRegistrationStore((s) => s.isHydrated);
    const queueLength = useOfflineRegistrationStore((s) => s.queue.length);

    useEffect(() => {
        hydrate();
    }, [hydrate]);

    useEffect(() => {
        if (!isHydrated || queueLength === 0) {
            return;
        }

        void syncOfflineRegistrations();
    }, [isHydrated, queueLength]);

    useEffect(() => {
        if (!isHydrated) {
            return;
        }

        const interval = setInterval(() => {
            if (useOfflineRegistrationStore.getState().queue.length === 0) {
                return;
            }

            void syncOfflineRegistrations();
        }, SYNC_INTERVAL_MS);

        return () => {
            clearInterval(interval);
        };
    }, [isHydrated]);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextState) => {
            if (nextState === 'active') {
                void syncOfflineRegistrations();
            }
        });

        return () => {
            subscription.remove();
        };
    }, []);

    return null;
}
