import { parseLocalDate } from './dates';
import type { LocalDate, ReminderEvent } from './types';

export function reminderKey(event: Pick<ReminderEvent, 'kind' | 'targetId' | 'date'>): string {
    return `${event.kind}|${event.targetId}|${event.date}`;
}

export function dateOfReminderKey(key: string): LocalDate | null {
    const part = key.slice(key.lastIndexOf('|') + 1);
    return parseLocalDate(part) ? part : null;
}

/** Keeps only keys whose date is today or later; malformed keys are dropped. */
export function pruneReminderKeys(keys: Set<string>, today: LocalDate): Set<string> {
    const kept = new Set<string>();
    keys.forEach(key => {
        const date = dateOfReminderKey(key);
        if (date !== null && date >= today) {
            kept.add(key);
        }
    });
    return kept;
}

export const DEFAULT_LEAD_DAYS = 1;
export const LEAD_OPTIONS: readonly number[] = [0, 1, 3];

export function normalizeLead(days: number): number {
    return LEAD_OPTIONS.includes(days) ? days : DEFAULT_LEAD_DAYS;
}

/** Reminders are delivered at 09:00 local, which is outside the Compose quiet window (22:00-07:00). */
export const NOTIFY_HOUR = 9;

/** 09:00 local on `date`. */
export function notifyTimeOn(date: LocalDate): Date {
    const [year, month, day] = date.split('-').map(Number);
    return new Date(year, month - 1, day, NOTIFY_HOUR, 0, 0, 0);
}

/** The next 09:00 local wall-clock moment strictly after `now` (DST-safe: built from calendar fields). */
export function nextNotifyTime(now: Date): Date {
    const today = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        NOTIFY_HOUR,
        0,
        0,
        0,
    );
    if (today.getTime() > now.getTime()) {
        return today;
    }
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, NOTIFY_HOUR, 0, 0, 0);
}

export type ReminderBucket = 'TODAY' | 'TOMORROW' | 'IN_DAYS';

export function reminderBucket(daysUntil: number): ReminderBucket {
    if (daysUntil <= 0) {
        return 'TODAY';
    }
    return daysUntil === 1 ? 'TOMORROW' : 'IN_DAYS';
}

/** The subscriptions window the upcoming-payments link opens (Compose `UpcomingPaymentsWidgetProvider.WINDOW_DAYS`). */
export const UPCOMING_WINDOW_DAYS = 7;

export type ReminderDestination = Record<string, string>;

/** Where a tapped reminder lands; consumed by `openNotificationDestination`. */
export function reminderDestination(event: ReminderEvent): ReminderDestination {
    if (event.kind === 'SUBSCRIPTION') {
        return {
            targetScreen: 'UpcomingSubscriptions',
            upcomingDays: String(UPCOMING_WINDOW_DAYS),
        };
    }
    return { targetScreen: 'CreditCards' };
}
