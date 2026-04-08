import { CreditCard, Expense, Income, Subscription } from '../../types';
import { CurrencyTotal, aggregateCurrencyTotals } from '../../utils/currency';
import { formatCreditCardLabel } from '../../utils/creditCards';
import { dateOnly } from '../../utils/filters';
import { toNum } from '../../utils/number';
import {
    listChargesForPeriod,
    toSubscriptionManagerItems,
} from '../subscriptions/subscriptionManager';

export type PlannerEventKind =
    | 'income'
    | 'expense'
    | 'subscription'
    | 'cardClosing'
    | 'cardPayment';

export type PlannerEvent = {
    id: string;
    sourceId?: string;
    kind: PlannerEventKind;
    date: string;
    title: string;
    detail?: string | null;
    amount?: number;
    currency?: string | null;
    accentColor?: string | null;
    billingCycle?: Subscription['billingCycle'];
};

export type PlannerDayGroup = {
    date: string;
    events: PlannerEvent[];
};

export type PlannerMonthSummary = {
    incomeBreakdown: CurrencyTotal[];
    expenseBreakdown: CurrencyTotal[];
    subscriptionBreakdown: CurrencyTotal[];
    reminderCount: number;
    eventCount: number;
    busyDays: number;
    nextEvent: PlannerEvent | null;
};

export type PlannerMonthData = {
    range: {
        start: Date;
        end: Date;
        startKey: string;
        endKey: string;
    };
    events: PlannerEvent[];
    groups: PlannerDayGroup[];
    summary: PlannerMonthSummary;
};

const EVENT_PRIORITY: Record<PlannerEventKind, number> = {
    cardPayment: 0,
    subscription: 1,
    expense: 2,
    income: 3,
    cardClosing: 4,
};

function atNoon(value: Date) {
    const next = new Date(value);
    next.setHours(12, 0, 0, 0);
    return next;
}

function toIsoDate(value: Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function clampDay(day: number, maxDay: number) {
    return Math.max(1, Math.min(maxDay, Math.round(day)));
}

function toMonthDate(value = new Date()) {
    const next = new Date(value);
    next.setDate(1);
    next.setHours(12, 0, 0, 0);
    return next;
}

function isDateWithinMonthRange(dateValue: string | Date | null | undefined, startKey: string, endKey: string) {
    const normalized = dateOnly(dateValue);
    return !!normalized && normalized >= startKey && normalized <= endKey;
}

function buildCardEvents(cards: CreditCard[], anchorDate: Date): PlannerEvent[] {
    const year = anchorDate.getFullYear();
    const monthIndex = anchorDate.getMonth();
    const maxDay = new Date(year, monthIndex + 1, 0).getDate();

    return cards
        .filter((card) => card.isActive)
        .flatMap((card) => {
            const label = formatCreditCardLabel(card) || card.name || card.bank || 'Card';
            const detail = card.bank?.trim() || null;
            const events: PlannerEvent[] = [];

            if (card.closingDay != null) {
                const closingDate = new Date(
                    year,
                    monthIndex,
                    clampDay(toNum(card.closingDay), maxDay),
                    12,
                    0,
                    0,
                    0,
                );
                events.push({
                    id: `card-closing-${card.id}-${toIsoDate(closingDate)}`,
                    sourceId: card.id,
                    kind: 'cardClosing',
                    date: toIsoDate(closingDate),
                    title: label,
                    detail,
                    accentColor: card.color ?? null,
                });
            }

            if (card.paymentDueDay != null) {
                const paymentDate = new Date(
                    year,
                    monthIndex,
                    clampDay(toNum(card.paymentDueDay), maxDay),
                    12,
                    0,
                    0,
                    0,
                );
                events.push({
                    id: `card-payment-${card.id}-${toIsoDate(paymentDate)}`,
                    sourceId: card.id,
                    kind: 'cardPayment',
                    date: toIsoDate(paymentDate),
                    title: label,
                    detail,
                    accentColor: card.color ?? null,
                });
            }

            return events;
        });
}

export function getPlannerMonthRange(anchorDate: Date) {
    const monthDate = toMonthDate(anchorDate);
    const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59, 999);

    return {
        start,
        end,
        startKey: toIsoDate(start),
        endKey: toIsoDate(end),
    };
}

export function shiftPlannerMonth(anchorDate: Date, months: number) {
    const next = toMonthDate(anchorDate);
    next.setMonth(next.getMonth() + months);
    return next;
}

export function isSamePlannerMonth(left: Date, right: Date) {
    return (
        left.getFullYear() === right.getFullYear()
        && left.getMonth() === right.getMonth()
    );
}

export function buildPlannerMonthData(params: {
    anchorDate: Date;
    incomes: Income[];
    expenses: Expense[];
    subscriptions: Subscription[];
    creditCards: CreditCard[];
}): PlannerMonthData {
    const range = getPlannerMonthRange(params.anchorDate);
    const activeSubscriptions = params.subscriptions.filter((item) => item.isActive !== false);
    const subscriptionCharges = listChargesForPeriod(
        toSubscriptionManagerItems(activeSubscriptions),
        {
            start: range.start,
            end: range.end,
        },
    );
    const incomes = params.incomes.filter((item) =>
        isDateWithinMonthRange(item.date, range.startKey, range.endKey),
    );
    const expenses = params.expenses.filter((item) =>
        isDateWithinMonthRange(item.date, range.startKey, range.endKey),
    );
    const cardEvents = buildCardEvents(params.creditCards, params.anchorDate);

    const events: PlannerEvent[] = [
        ...incomes.map((income) => ({
            id: `income-${income.id}`,
            sourceId: income.id,
            kind: 'income' as const,
            date: dateOnly(income.date),
            title: income.title,
            detail: income.note ?? null,
            amount: toNum(income.amount),
            currency: income.currency,
        })),
        ...expenses.map((expense) => ({
            id: `expense-${expense.id}`,
            sourceId: expense.id,
            kind: 'expense' as const,
            date: dateOnly(expense.date),
            title: expense.title,
            detail: expense.category?.name || expense.note || null,
            amount: toNum(expense.cost),
            currency: expense.currency,
            accentColor: expense.category?.color ?? null,
        })),
        ...subscriptionCharges.map((charge) => ({
            id: `subscription-${charge.subscriptionId}-${charge.dueDate}`,
            sourceId: charge.subscriptionId,
            kind: 'subscription' as const,
            date: charge.dueDate,
            title: charge.subscription.name,
            detail: null,
            amount: toNum(charge.amount),
            currency: charge.subscription.source.currency,
            accentColor:
                charge.subscription.source.hexColor
                || charge.subscription.source.color
                || null,
            billingCycle: charge.subscription.source.billingCycle,
        })),
        ...cardEvents,
    ].sort((left, right) => {
        const byDate = left.date.localeCompare(right.date);
        if (byDate !== 0) {
            return byDate;
        }

        const byPriority = EVENT_PRIORITY[left.kind] - EVENT_PRIORITY[right.kind];
        if (byPriority !== 0) {
            return byPriority;
        }

        return (right.amount ?? 0) - (left.amount ?? 0);
    });

    const groups = events.reduce<PlannerDayGroup[]>((allGroups, event) => {
        const existing = allGroups[allGroups.length - 1];
        if (existing && existing.date === event.date) {
            existing.events.push(event);
            return allGroups;
        }

        allGroups.push({
            date: event.date,
            events: [event],
        });
        return allGroups;
    }, []);

    const todayKey = toIsoDate(atNoon(new Date()));
    const nextEvent = events.find((event) => event.date >= todayKey) || events[0] || null;

    return {
        range,
        events,
        groups,
        summary: {
            incomeBreakdown: aggregateCurrencyTotals(
                incomes,
                (item) => item.amount,
                (item) => item.currency,
            ),
            expenseBreakdown: aggregateCurrencyTotals(
                expenses,
                (item) => item.cost,
                (item) => item.currency,
            ),
            subscriptionBreakdown: aggregateCurrencyTotals(
                subscriptionCharges,
                (item) => item.amount,
                (item) => item.subscription.source.currency,
            ),
            reminderCount: cardEvents.length,
            eventCount: events.length,
            busyDays: groups.length,
            nextEvent,
        },
    };
}
