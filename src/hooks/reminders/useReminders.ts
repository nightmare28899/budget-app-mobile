import { useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { creditCardsApi } from '../../api/resources/creditCards';
import { subscriptionsApi } from '../../api/resources/subscriptions';
import {
    openNotificationDestination,
} from '../../navigation/navigationBridge';
import {
    ReminderSources,
    SyncResult,
    cardInputFromOverview,
    subscriptionInputFromSubscription,
    syncReminders,
} from '../../modules/reminders';
import {
    initialReminderDestination,
    onReminderPress,
} from '../../modules/reminders/notifyKitAdapter';
import { reminderScheduleStore, useReminderSettingsStore } from '../../store/reminderSettingsStore';
import { usePreferencesStore } from '../../store/preferencesStore';
import { useAppLock } from '../appLock/useAppLock';
import { useAppAccess } from '../access/useAppAccess';
import { maxScheduledReminders, reminderCopy, reminderPort } from './reminderRuntime';

let hasConsumedInitialReminder = false;

/**
 * Keeps the on-device reminder schedule fresh (app start, data change, settings/language/app-lock change,
 * returning to the foreground) and opens the right screen when a reminder is tapped.
 * Reuses the subscriptions list and cards overview queries, so it adds no requests of its own.
 */
export function useReminders(ready: boolean): void {
    const enabled = useReminderSettingsStore(s => s.enabled);
    const leadDays = useReminderSettingsStore(s => s.leadDays);
    const language = usePreferencesStore(s => s.language);
    const appLockEnabled = useAppLock().enabled;
    const { hasPremium, isAuthenticated, isGuest } = useAppAccess();
    const [foregroundTick, setForegroundTick] = useState(0);
    const queue = useRef<Promise<SyncResult | void>>(Promise.resolve());

    const active = ready && enabled && (isAuthenticated || isGuest);

    const subscriptions = useQuery({
        queryKey: ['subscriptions', 'list'],
        queryFn: subscriptionsApi.getAll,
        enabled: active,
    });
    // Saved cards are Premium: a free account simply has no card reminders.
    const cards = useQuery({
        queryKey: ['creditCards', 'overview', 'active'],
        queryFn: () => creditCardsApi.getOverview({ includeInactive: false }),
        enabled: active && hasPremium,
    });

    useEffect(() => {
        const subscription = AppState.addEventListener('change', status => {
            if (status === 'active') {
                setForegroundTick(tick => tick + 1);
            }
        });
        return () => subscription.remove();
    }, []);

    useEffect(() => {
        if (!ready) {
            return;
        }
        const unsubscribe = onReminderPress(destination => {
            openNotificationDestination(destination);
        });
        if (!hasConsumedInitialReminder) {
            hasConsumedInitialReminder = true;
            initialReminderDestination()
                .then(destination => {
                    if (destination) {
                        openNotificationDestination(destination);
                    }
                })
                .catch(() => {
                    // A reminder tap must never block normal app startup.
                });
        }
        return unsubscribe;
    }, [ready]);

    const subscriptionData = subscriptions.data;
    const cardData = cards.data;
    const waiting =
        active &&
        ((subscriptions.isPending && !subscriptions.isError) ||
            (hasPremium && cards.isPending && !cards.isError));

    const sources = useMemo<ReminderSources>(
        () => ({
            cards: async () => {
                if (!hasPremium) {
                    return [];
                }
                if (!cardData) {
                    throw new Error('Cards unavailable');
                }
                return cardData.cards.map(cardInputFromOverview);
            },
            subscriptions: async () => {
                if (!subscriptionData) {
                    throw new Error('Subscriptions unavailable');
                }
                return subscriptionData
                    .map(subscriptionInputFromSubscription)
                    .filter(item => item !== null);
            },
        }),
        [cardData, hasPremium, subscriptionData],
    );

    useEffect(() => {
        if (!ready || waiting || (!enabled && !hasPersistedSchedule())) {
            return;
        }
        queue.current = queue.current
            .catch(() => undefined)
            .then(() =>
                syncReminders(
                    {
                        port: reminderPort,
                        store: reminderScheduleStore,
                        copy: reminderCopy,
                        now: () => new Date(),
                        maxScheduled: maxScheduledReminders,
                    },
                    { enabled: active, leadDays, appLockEnabled },
                    sources,
                ),
            );
    }, [
        active,
        appLockEnabled,
        enabled,
        foregroundTick,
        language,
        leadDays,
        ready,
        sources,
        waiting,
    ]);
}

function hasPersistedSchedule(): boolean {
    return Object.keys(reminderScheduleStore.load()).length > 0;
}
