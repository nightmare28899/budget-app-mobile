import { NativeModules } from 'react-native';
import {
    createMMKV,
    deleteMMKV,
    existsMMKV,
    type MMKV,
} from 'react-native-mmkv';

const LEGACY_STORAGE_ENCRYPTION_KEY = 'BudgetApp::SecureStorage::v1::2026';
const SECURE_SUFFIX = '-secure-v2';
const LEGACY_SECURE_SUFFIX = '-secure';

type SecureKeyStoreModule = {
    getOrCreateMMKVKey?: () => string | null;
};

const secureKeyStore = NativeModules.BudgetAppSecureKeyStore as SecureKeyStoreModule | undefined;

function isTestEnvironment(): boolean {
    const runtime = globalThis as {
        process?: {
            env?: {
                NODE_ENV?: string;
            };
        };
    };
    return runtime.process?.env?.NODE_ENV === 'test';
}

function isDevEnvironment(): boolean {
    return typeof __DEV__ !== 'undefined' && __DEV__ === true;
}

function getMMKVEncryptionKey(): string {
    const nativeKey = secureKeyStore?.getOrCreateMMKVKey?.()?.trim();
    if (nativeKey && nativeKey.length <= 16) {
        return nativeKey;
    }

    if (isTestEnvironment()) {
        return LEGACY_STORAGE_ENCRYPTION_KEY;
    }

    if (isDevEnvironment()) {
        console.warn(
            '[secure-storage] BudgetAppSecureKeyStore native module is unavailable, using legacy fallback key.',
        );
        return LEGACY_STORAGE_ENCRYPTION_KEY;
    }

    throw new Error('BudgetAppSecureKeyStore native module is not available.');
}

function createNamedStorage(id: string, encryptionKey?: string): MMKV {
    return createMMKV(
        encryptionKey
            ? {
                id,
                encryptionKey,
            }
            : { id },
    );
}

function migrateLegacyEncryptedStore(baseId: string, secureStorage: MMKV) {
    if (secureStorage.getAllKeys().length > 0) {
        return;
    }

    const legacySecureId = `${baseId}${LEGACY_SECURE_SUFFIX}`;
    if (!existsMMKV(legacySecureId)) {
        return;
    }

    const legacyStorage = createNamedStorage(
        legacySecureId,
        LEGACY_STORAGE_ENCRYPTION_KEY,
    );
    if (legacyStorage.getAllKeys().length === 0) {
        return;
    }

    secureStorage.importAllFrom(legacyStorage);
    deleteMMKV(legacySecureId);
}

export function createSecureStorage(baseId: string) {
    const secureStorage = createNamedStorage(
        `${baseId}${SECURE_SUFFIX}`,
        getMMKVEncryptionKey(),
    );
    migrateLegacyEncryptedStore(baseId, secureStorage);
    migrateLegacyStringStore(baseId, secureStorage);
    return secureStorage;
}

export function migrateLegacyStringStore(baseId: string, secureStorage: MMKV) {
    if (secureStorage.getAllKeys().length > 0) {
        return;
    }

    if (!existsMMKV(baseId)) {
        return;
    }

    const legacyStorage = createNamedStorage(baseId);
    const legacyKeys = legacyStorage.getAllKeys();

    if (legacyKeys.length === 0) {
        return;
    }

    secureStorage.importAllFrom(legacyStorage);
    deleteMMKV(baseId);
}
