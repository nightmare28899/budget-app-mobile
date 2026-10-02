import { useCallback, useEffect, useMemo, useState } from 'react';
import { buildPreferenceScopedUserKey } from '../../store/preferencesStore';
import { createSecureStorage, migrateLegacyStringStore } from '../../store/secureStorage';

const STORAGE_ID = 'swipe-hints-storage';
const storage = createSecureStorage(STORAGE_ID);
migrateLegacyStringStore(STORAGE_ID, storage);

const SEEN_HINTS_KEY = 'seenSwipeHintsByUser';

export type SwipeHintFeature = 'activity' | 'expenses' | 'incomes' | 'subscriptions';

type SwipeHintUser = {
    id?: string | null;
    email?: string | null;
} | string | null | undefined;

function readSeenHints(): Record<string, boolean> {
    const raw = storage.getString(SEEN_HINTS_KEY);
    if (!raw) {
        return {};
    }

    try {
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        return Object.entries(parsed).reduce<Record<string, boolean>>((acc, [key, value]) => {
            if (value === true) {
                acc[key] = true;
            }
            return acc;
        }, {});
    } catch {
        return {};
    }
}

function buildSwipeHintStorageKey(feature: SwipeHintFeature, user: SwipeHintUser): string {
    const scopedUserKey = buildPreferenceScopedUserKey(user) ?? 'guest';
    return `${scopedUserKey}:${feature}`;
}

function hasSeenSwipeHint(feature: SwipeHintFeature, user: SwipeHintUser): boolean {
    const seenHints = readSeenHints();
    return seenHints[buildSwipeHintStorageKey(feature, user)] === true;
}

function markSwipeHintSeen(feature: SwipeHintFeature, user: SwipeHintUser) {
    const seenHints = readSeenHints();
    seenHints[buildSwipeHintStorageKey(feature, user)] = true;
    storage.set(SEEN_HINTS_KEY, JSON.stringify(seenHints));
}

export function useSwipeHint(feature: SwipeHintFeature, user: SwipeHintUser) {
    const userIdentity = useMemo(() => {
        if (typeof user === 'string') {
            return user;
        }

        return `${user?.id ?? ''}|${user?.email ?? ''}`;
    }, [user]);
    const [isVisible, setIsVisible] = useState(() => !hasSeenSwipeHint(feature, user));

    useEffect(() => {
        setIsVisible(!hasSeenSwipeHint(feature, user));
    }, [feature, user, userIdentity]);

    const dismiss = useCallback(() => {
        markSwipeHintSeen(feature, user);
        setIsVisible(false);
    }, [feature, user]);

    return {
        isVisible,
        dismiss,
    };
}
