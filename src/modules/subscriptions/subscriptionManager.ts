import { BudgetPeriod, Subscription, SubscriptionBillingCycle } from '../../types/index';
import { dateOnly } from '../../utils/core/filters';
import { toNum } from '../../utils/core/number';

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_ITERATIONS = 500;

export type SubscriptionFrequency = SubscriptionBillingCycle;

export type PeriodRange = {
    start: Date;
    end: Date;
};

export type SubscriptionManagerItem = {
    id: string;
    name: string;
    amount: number;
    dueDate: string;
    frequency: SubscriptionFrequency;
    reminderDays: number;
    isActive: boolean;
    source: Subscription;
};

export type SubscriptionCharge = {
    subscriptionId: string;
    dueDate: string;
    amount: number;
    subscription: SubscriptionManagerItem;
};

export type UpcomingSubscription = {
    subscription: SubscriptionManagerItem;
    dueDate: string;
    daysUntilDue: number;
};

function atNoon(date: Date): Date {
    const value = new Date(date);
    value.setHours(12, 0, 0, 0);
    return value;
}

function parseDueDate(value: unknown): Date | null {
    const normalized = dateOnly(value);
    if (!normalized) {
        return null;
    }

    const parsed = new Date(`${normalized}T12:00:00`);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }

    return parsed;
}

function addFrequency(
    date: Date,
    frequency: SubscriptionFrequency,
    step: number,
): Date {
    const next = new Date(date);

    if (frequency === 'WEEKLY') {
        next.setDate(next.getDate() + (7 * step));
        return next;
    }

    if (frequency === 'YEARLY') {
        next.setFullYear(next.getFullYear() + step);
        return next;
    }

    next.setMonth(next.getMonth() + step);
    return next;
}

function toUtcMidnight(date: Date): number {
    return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
}

function daysBetween(from: Date, to: Date): number {
    return Math.round((toUtcMidnight(to) - toUtcMidnight(from)) / DAY_MS);
}

function firstOccurrenceInRange(
    anchor: Date,
    frequency: SubscriptionFrequency,
    rangeStart: Date,
): Date {
    let current = atNoon(anchor);
    const start = atNoon(rangeStart);
    let guard = 0;

    if (current < start) {
        while (current < start && guard < MAX_ITERATIONS) {
            current = addFrequency(current, frequency, 1);
            guard += 1;
        }
        return current;
    }

    while (guard < MAX_ITERATIONS) {
        const previous = addFrequency(current, frequency, -1);
        if (previous < start) {
            break;
        }
        current = previous;
        guard += 1;
    }

    return current;
}

function nextOccurrenceOnOrAfter(
    anchor: Date,
    frequency: SubscriptionFrequency,
    startDate: Date,
): Date {
    let current = atNoon(anchor);
    const start = atNoon(startDate);
    let guard = 0;

    while (current < start && guard < MAX_ITERATIONS) {
        current = addFrequency(current, frequency, 1);
        guard += 1;
    }

    return current;
}

export function resolvePeriodRange(
    periodType: BudgetPeriod,
    periodStart?: string | null,
    periodEnd?: string | null,
    now = new Date(),
): PeriodRange {
    const apiStart = periodStart
        ? new Date(`${periodStart}T00:00:00`)
        : null;
    const apiEnd = periodEnd
        ? new Date(`${periodEnd}T23:59:59`)
        : null;

    if (
        apiStart &&
        apiEnd &&
        !Number.isNaN(apiStart.getTime()) &&
        !Number.isNaN(apiEnd.getTime())
    ) {
        return { start: apiStart, end: apiEnd };
    }

    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    if (periodType === 'daily') {
        return { start: startOfToday, end: endOfToday };
    }

    if (periodType === 'weekly') {
        const start = new Date(startOfToday);
        start.setDate(start.getDate() - 6);
        return { start, end: endOfToday };
    }

    if (periodType === 'monthly') {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(
            now.getFullYear(),
            now.getMonth() + 1,
            0,
            23,
            59,
            59,
            999,
        );
        return { start, end };
    }

    if (periodType === 'annual') {
        const start = new Date(now.getFullYear(), 0, 1);
        const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        return { start, end };
    }

    return { start: startOfToday, end: endOfToday };
}

export function toSubscriptionManagerItems(
    subscriptions: Subscription[],
): SubscriptionManagerItem[] {
    return subscriptions.map((item) => ({
        id: item.id,
        name: item.name,
        amount: toNum(item.cost),
        dueDate: dateOnly(item.chargeDate || item.nextPaymentDate),
        frequency: item.billingCycle,
        reminderDays: toNum(item.reminderDays),
        isActive: item.isActive !== false,
        source: item,
    }));
}

export function listChargesForPeriod(
    subscriptions: SubscriptionManagerItem[],
    periodRange: PeriodRange,
): SubscriptionCharge[] {
    const periodStart = atNoon(periodRange.start);
    const periodEnd = atNoon(periodRange.end);
    const charges: SubscriptionCharge[] = [];

    for (const subscription of subscriptions) {
        if (!subscription.isActive) {
            continue;
        }

        const anchor = parseDueDate(subscription.dueDate);
        if (!anchor) {
            continue;
        }

        let occurrence = firstOccurrenceInRange(
            anchor,
            subscription.frequency,
            periodStart,
        );
        let guard = 0;

        while (occurrence <= periodEnd && guard < MAX_ITERATIONS) {
            charges.push({
                subscriptionId: subscription.id,
                dueDate: occurrence.toISOString().slice(0, 10),
                amount: subscription.amount,
                subscription,
            });
            occurrence = addFrequency(occurrence, subscription.frequency, 1);
            guard += 1;
        }
    }

    return charges.sort((a, b) => b.dueDate.localeCompare(a.dueDate));
}

export function calculateReservedFundsForPeriod(
    subscriptions: SubscriptionManagerItem[],
    periodRange: PeriodRange,
): number {
    return listChargesForPeriod(subscriptions, periodRange).reduce(
        (sum, charge) => sum + toNum(charge.amount),
        0,
    );
}

export function listUpcomingSubscriptions(
    subscriptions: SubscriptionManagerItem[],
    daysAhead = 3,
    fromDate = new Date(),
): UpcomingSubscription[] {
    const from = atNoon(fromDate);
    const limit = atNoon(
        new Date(from.getTime() + (Math.max(0, daysAhead) * DAY_MS)),
    );
    const upcoming: UpcomingSubscription[] = [];

    for (const subscription of subscriptions) {
        if (!subscription.isActive) {
            continue;
        }

        const anchor = parseDueDate(subscription.dueDate);
        if (!anchor) {
            continue;
        }

        const nextDue = nextOccurrenceOnOrAfter(
            anchor,
            subscription.frequency,
            from,
        );
        if (nextDue > limit) {
            continue;
        }

        upcoming.push({
            subscription,
            dueDate: nextDue.toISOString().slice(0, 10),
            daysUntilDue: daysBetween(from, nextDue),
        });
    }

    return upcoming.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
}
