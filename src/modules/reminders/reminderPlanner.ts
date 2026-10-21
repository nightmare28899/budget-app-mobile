import { occurrencesBetween } from './billingSchedule';
import { addDays, monthIndex, monthOf, resolveDay } from './dates';
import {
    normalizeLead,
    reminderKey,
} from './reminderSupport';
import {
    CardReminderInput,
    LocalDate,
    REMINDER_KIND_ORDER,
    ReminderEvent,
    SubscriptionReminderInput,
} from './types';

export const HORIZON_DAYS = 45;

function compareText(left: string, right: string): number {
    return left < right ? -1 : left > right ? 1 : 0;
}

/** Date, then kind, then title (case-insensitive), then target id. */
export function compareEvents(left: ReminderEvent, right: ReminderEvent): number {
    return (
        compareText(left.date, right.date) ||
        REMINDER_KIND_ORDER.indexOf(left.kind) - REMINDER_KIND_ORDER.indexOf(right.kind) ||
        compareText(left.title.toLowerCase(), right.title.toLowerCase()) ||
        compareText(left.targetId, right.targetId)
    );
}

function isValidDay(day: number | null): day is number {
    return day !== null && Number.isInteger(day) && day >= 1 && day <= 31;
}

/** The `day` of every month between today and `end`, clamped to short months, within [today, end]. */
function monthlyOccurrences(day: number | null, today: LocalDate, end: LocalDate): LocalDate[] {
    if (!isValidDay(day)) {
        return [];
    }
    const dates: LocalDate[] = [];
    const last = monthIndex(end);
    let { year, month } = monthOf(today);
    while (year * 12 + (month - 1) <= last) {
        const date = resolveDay(year, month, day);
        if (date >= today && date <= end) {
            dates.push(date);
        }
        month += 1;
        if (month > 12) {
            month = 1;
            year += 1;
        }
    }
    return dates;
}

function cardEvents(card: CardReminderInput, today: LocalDate, end: LocalDate): ReminderEvent[] {
    const due = monthlyOccurrences(card.paymentDueDay, today, end)
        .filter(date => card.paidThrough === null || date > card.paidThrough)
        .map<ReminderEvent>(date => {
            const payment = card.nextPayment?.date === date ? card.nextPayment : null;
            return {
                kind: 'CARD_DUE',
                targetId: card.id,
                title: card.name,
                date,
                amount: payment?.amount ?? null,
                currency: payment?.currency ?? null,
            };
        });
    const closing = monthlyOccurrences(card.closingDay, today, end).map<ReminderEvent>(date => ({
        kind: 'CARD_CLOSING',
        targetId: card.id,
        title: card.name,
        date,
        amount: null,
        currency: null,
    }));
    return [...due, ...closing];
}

function subscriptionEvents(
    subscriptions: SubscriptionReminderInput[],
    today: LocalDate,
    end: LocalDate,
): ReminderEvent[] {
    return subscriptions
        .filter(subscription => subscription.isActive)
        .flatMap(subscription => {
            // Occurrences before the next payment date already exist as expenses.
            const from = subscription.nextPaymentDate > today ? subscription.nextPaymentDate : today;
            return occurrencesBetween(
                subscription.nextPaymentDate,
                subscription.billingCycle,
                from,
                end,
            ).map<ReminderEvent>(date => ({
                kind: 'SUBSCRIPTION',
                targetId: subscription.id,
                title: subscription.name,
                date,
                amount: subscription.cost,
                currency: subscription.currency,
            }));
        });
}

/** Everything worth reminding about from `today` through `horizonDays` ahead, in delivery order. */
export function planReminders(
    cards: CardReminderInput[],
    subscriptions: SubscriptionReminderInput[],
    today: LocalDate,
    horizonDays: number = HORIZON_DAYS,
): ReminderEvent[] {
    const end = addDays(today, Math.max(horizonDays, 0));
    const fromCards = cards
        .filter(card => card.isActive)
        .flatMap(card => cardEvents(card, today, end));
    return [...fromCards, ...subscriptionEvents(subscriptions, today, end)].sort(compareEvents);
}

/** Events inside the lead window that were not already notified. */
export function remindersDue(
    events: ReminderEvent[],
    today: LocalDate,
    leadDays: number,
    notified: Set<string>,
): ReminderEvent[] {
    const windowEnd = addDays(today, normalizeLead(leadDays));
    return events
        .filter(event => event.date >= today && event.date <= windowEnd && !notified.has(reminderKey(event)))
        .sort(compareEvents);
}
