import { createMMKV } from 'react-native-mmkv';

const STORAGE_ENCRYPTION_KEY = 'BudgetApp::SecureStorage::v1::2026';
const SECURE_SUFFIX = '-secure';

export function createSecureStorage(baseId: string) {
    return createMMKV({
        id: `${baseId}${SECURE_SUFFIX}`,
        encryptionKey: STORAGE_ENCRYPTION_KEY,
    });
}

export function migrateLegacyStringStore(baseId: string, secureStorage: ReturnType<typeof createMMKV>) {
    if (secureStorage.getAllKeys().length > 0) {
        return;
    }

    const legacyStorage = createMMKV({ id: baseId });
    const legacyKeys = legacyStorage.getAllKeys();

    if (legacyKeys.length === 0) {
        return;
    }

    for (const key of legacyKeys) {
        const value = legacyStorage.getString(key);
        if (value !== undefined) {
            secureStorage.set(key, value);
        }
    }

    for (const key of legacyKeys) {
        legacyStorage.remove(key);
    }
}
