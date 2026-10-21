import type { TranslationKey, TranslationValues } from '../../i18n/index';
import { reminderBucket } from './reminderSupport';
import type { ReminderEvent, ReminderKind } from './types';

type Translate = (key: TranslationKey, values?: TranslationValues) => string;

const LINE_KEYS: Record<ReminderKind, [TranslationKey, TranslationKey, TranslationKey]> = {
    CARD_DUE: [
        'reminders.cardDueToday',
        'reminders.cardDueTomorrow',
        'reminders.cardDueInDays',
    ],
    CARD_CLOSING: [
        'reminders.cardClosingToday',
        'reminders.cardClosingTomorrow',
        'reminders.cardClosingInDays',
    ],
    SUBSCRIPTION: [
        'reminders.subscriptionToday',
        'reminders.subscriptionTomorrow',
        'reminders.subscriptionInDays',
    ],
};

const BUCKET_INDEX = { TODAY: 0, TOMORROW: 1, IN_DAYS: 2 } as const;

export type ReminderCopy = (
    event: ReminderEvent,
    daysUntil: number,
    hideAmounts: boolean,
) => { title: string; body: string };

/** Notification text: the event title plus "<line> · <amount>" (amount omitted when hidden or unknown). */
export function createReminderCopy(deps: {
    t: Translate;
    formatAmount: (amount: number, currency: string | null) => string;
}): ReminderCopy {
    return (event, daysUntil, hideAmounts) => {
        const bucket = reminderBucket(daysUntil);
        const key = LINE_KEYS[event.kind][BUCKET_INDEX[bucket]];
        const line = deps.t(key, bucket === 'IN_DAYS' ? { count: daysUntil } : undefined);
        const amount =
            hideAmounts || event.amount === null
                ? null
                : deps.formatAmount(event.amount, event.currency);
        return { title: event.title, body: amount ? `${line} · ${amount}` : line };
    };
}
