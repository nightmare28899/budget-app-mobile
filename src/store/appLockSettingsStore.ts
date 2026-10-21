import { createSecureStorage } from './secureStorage';
import type { AppLockSettings } from '../modules/appLock';

const STORAGE_ID = 'app-lock-storage';
const ENABLED_KEY = 'enabled';

const storage = createSecureStorage(STORAGE_ID);

/** Synchronous MMKV-backed flag, so the lock is known before the first frame (cold start). */
export const appLockSettings: AppLockSettings = {
    isEnabled: () => storage.getBoolean(ENABLED_KEY) === true,
    setEnabled: (enabled) => {
        storage.set(ENABLED_KEY, enabled);
    },
};
