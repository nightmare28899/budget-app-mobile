import { NativeModules } from 'react-native';
import { API_URL } from '@env';

const PROD_API_BASE_URL = API_URL;

function extractDevHostFromMetro(): string | null {
    if (!__DEV__) {
        return null;
    }

    const scriptURL: unknown = NativeModules?.SourceCode?.scriptURL;
    if (typeof scriptURL !== 'string') {
        return null;
    }

    const match = scriptURL.match(/^https?:\/\/([^/:]+)(?::\d+)?\//i);
    if (!match?.[1]) {
        return null;
    }

    return match[1];
}

const FALLBACK_LOCAL_HOST = 'localhost';
const LOCAL_DEV_HOST = extractDevHostFromMetro() ?? FALLBACK_LOCAL_HOST;
const USE_LOCAL_API_IN_DEBUG = true;
const LOCAL_API_BASE_URL = `http://${LOCAL_DEV_HOST}:3001/api`;
const DEBUG_API_BASE_URL = USE_LOCAL_API_IN_DEBUG
    ? LOCAL_API_BASE_URL
    : PROD_API_BASE_URL;

export const API_BASE_URL = __DEV__ ? DEBUG_API_BASE_URL : PROD_API_BASE_URL;

export const BUDGET_THRESHOLDS = {
    WARNING: 0.8,
    DANGER: 1.0,
} as const;

export const CATEGORY_DEFAULTS = [
    { name: 'Food', icon: 'fast-food-outline', color: '#FF6B6B' },
    { name: 'Transport', icon: 'car-sport-outline', color: '#4ECDC4' },
    { name: 'Shopping', icon: 'bag-handle-outline', color: '#45B7D1' },
    { name: 'Entertainment', icon: 'film-outline', color: '#96CEB4' },
    { name: 'Health', icon: 'medkit-outline', color: '#FFEAA7' },
    { name: 'Bills', icon: 'document-text-outline', color: '#DDA0DD' },
    { name: 'Other', icon: 'cube-outline', color: '#95A5A6' },
] as const;
