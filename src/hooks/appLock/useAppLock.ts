import { useSyncExternalStore } from 'react';
import { appLockController } from './appLockController';

export function useAppLock() {
    const state = useSyncExternalStore(
        appLockController.subscribe,
        appLockController.getState,
    );
    return { ...state, controller: appLockController };
}
