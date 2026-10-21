import { addDays, daysBetween, localDateOf } from './dates';
import { HORIZON_DAYS, compareEvents, planReminders } from './reminderPlanner';
import type { ReminderCopy } from './reminderCopy';
import {
    ReminderDestination,
    nextNotifyTime,
    normalizeLead,
    notifyTimeOn,
    reminderDestination,
    reminderKey,
} from './reminderSupport';
import type {
    CardReminderInput,
    ReminderEvent,
    ReminderSettings,
    SubscriptionReminderInput,
} from './types';

/** iOS keeps at most 64 pending local notifications; the nearest ones win and the rest wait for a later sync. */
export const IOS_MAX_SCHEDULED = 64;
/** Android caps an app at 500 pending alarms (API 31+); stay under it. */
export const ANDROID_MAX_SCHEDULED = 450;

export type ScheduledReminder = {
    /** The dedupe key (`KIND|targetId|date`). */
    id: string;
    /** Epoch millis when the notification fires. */
    fireAt: number;
    title: string;
    body: string;
    destination: ReminderDestination;
};

/** Platform notification API; the only thing the scheduler knows about the OS. */
export interface ReminderNotificationPort {
    canNotify(): Promise<boolean>;
    /** Asks the OS for notification permission; resolves to whether reminders may be shown. */
    requestPermission(): Promise<boolean>;
    /**
     * Schedules `items`, then cancels reminders no longer in the set (idempotent). Must throw, without
     * cancelling anything, if scheduling fails so the previous schedule stays in place.
     */
    replaceAll(items: ScheduledReminder[]): Promise<void>;
    cancelAll(): Promise<void>;
}

/** Key -> fire time (epoch millis) of reminders already scheduled; entries in the past are the "notified" set. */
export interface ReminderStore {
    load(): Record<string, number>;
    save(records: Record<string, number>): void;
}

export interface ReminderSources {
    cards(): Promise<CardReminderInput[]>;
    subscriptions(): Promise<SubscriptionReminderInput[]>;
}

export type SyncDeps = {
    port: ReminderNotificationPort;
    store: ReminderStore;
    copy: ReminderCopy;
    now: () => Date;
    maxScheduled: number;
};

export type SyncResult = {
    status: 'DISABLED' | 'FAILED' | 'NOTIFICATIONS_BLOCKED' | 'UPDATED';
    scheduled: number;
    /** Events that fit the window but not the platform's pending-notification cap. */
    dropped: number;
};

const result = (status: SyncResult['status'], scheduled = 0, dropped = 0): SyncResult => ({
    status,
    scheduled,
    dropped,
});

/**
 * Rebuilds the on-device reminder schedule. Compose runs a daily 09:00 worker that posts events inside the lead
 * window; RN has no such worker, so each event gets a one-shot local notification at 09:00 on `date - lead`.
 * An event first seen already inside its window fires at the next 09:00, as the worker would have.
 * A failing source or platform call leaves the previous schedule in place.
 */
export async function syncReminders(
    deps: SyncDeps,
    settings: ReminderSettings,
    sources: ReminderSources,
): Promise<SyncResult> {
    const { port, store, copy } = deps;
    if (!settings.enabled) {
        try {
            await port.cancelAll();
            store.save({});
        } catch {
            return result('FAILED');
        }
        return result('DISABLED');
    }

    const now = deps.now();
    const nowMs = now.getTime();
    const today = localDateOf(now);
    const lead = normalizeLead(settings.leadDays);

    let events: ReminderEvent[];
    try {
        const [cards, subscriptions] = await Promise.all([
            sources.cards(),
            sources.subscriptions(),
        ]);
        events = planReminders(cards, subscriptions, today, HORIZON_DAYS);
        if (!(await port.canNotify())) {
            return result('NOTIFICATIONS_BLOCKED');
        }
    } catch {
        return result('FAILED');
    }

    // Only planned (today-or-later) events are looked up, so records of past events fall away on save.
    const previous = store.load();
    const fired: Record<string, number> = {};
    const candidates: { fireAt: number; event: ReminderEvent }[] = [];

    for (const event of [...events].sort(compareEvents)) {
        const key = reminderKey(event);
        const natural = notifyTimeOn(addDays(event.date, -lead)).getTime();
        let fireAt: number;
        if (natural > nowMs) {
            fireAt = natural;
        } else if (previous[key] !== undefined) {
            if (previous[key] <= nowMs) {
                fired[key] = previous[key];
                continue;
            }
            fireAt = previous[key];
        } else {
            fireAt = nextNotifyTime(now).getTime();
            if (localDateOf(new Date(fireAt)) > event.date) {
                continue;
            }
        }
        candidates.push({ fireAt, event });
    }

    // Nearest first (stable, so the plan order breaks ties), then cap to what the platform can hold.
    candidates.sort((left, right) => left.fireAt - right.fireAt);
    const kept = candidates.slice(0, Math.max(deps.maxScheduled, 0));
    const items: ScheduledReminder[] = kept.map(({ fireAt, event }) => {
        const daysUntil = daysBetween(localDateOf(new Date(fireAt)), event.date);
        const { title, body } = copy(event, daysUntil, settings.appLockEnabled);
        return {
            id: reminderKey(event),
            fireAt,
            title,
            body,
            destination: reminderDestination(event),
        };
    });

    try {
        await port.replaceAll(items);
    } catch {
        return result('FAILED');
    }

    const records = { ...fired };
    items.forEach(item => {
        records[item.id] = item.fireAt;
    });
    store.save(records);
    return result('UPDATED', items.length, candidates.length - kept.length);
}
