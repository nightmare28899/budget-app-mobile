import { CreditCardOverviewCard } from '../../types/index';
import { calendarDaysBetween, parseDateOnly } from './cardPaymentSchedule';

export type CardUrgency = 'NONE' | 'DUE_SOON' | 'OVERDUE';

export type CardBadge = 'NONE' | 'PAID' | 'PARTIAL' | 'PENDING' | 'DUE_SOON' | 'OVERDUE';

export type DueLabel =
    | { kind: 'overdue'; days: number }
    | { kind: 'today' }
    | { kind: 'tomorrow' }
    | { kind: 'inDays'; days: number };

export type CardStatus = { paid: boolean; badge: CardBadge; overdueDays: number | null };

export const DUE_SOON_DAYS = 5;

/** Overdue when negative; due soon within DUE_SOON_DAYS unless the statement is already paid. */
export function cardUrgencyOf(days: number | null | undefined, statementPaid = false): CardUrgency {
    if (days == null) {
        return 'NONE';
    }
    if (days < 0) {
        return 'OVERDUE';
    }
    if (statementPaid) {
        return 'NONE';
    }
    return days <= DUE_SOON_DAYS ? 'DUE_SOON' : 'NONE';
}

export function dueLabelOf(days: number | null | undefined): DueLabel | null {
    if (days == null) {
        return null;
    }
    if (days < 0) {
        return { kind: 'overdue', days: -days };
    }
    if (days === 0) {
        return { kind: 'today' };
    }
    if (days === 1) {
        return { kind: 'tomorrow' };
    }
    return { kind: 'inDays', days };
}

type BadgeInput = {
    paid: boolean;
    partial: boolean;
    hasStatement: boolean;
    daysUntilDue: number | null | undefined;
    statementDaysUntilDue?: number | null;
};

export function cardBadgeOf({
    paid,
    partial,
    hasStatement,
    daysUntilDue,
    statementDaysUntilDue = null,
}: BadgeInput): CardBadge {
    const statementPaid = hasStatement && paid;
    if (statementPaid) {
        return 'PAID';
    }
    if (hasStatement && statementDaysUntilDue != null && statementDaysUntilDue < 0) {
        return 'OVERDUE';
    }
    switch (cardUrgencyOf(daysUntilDue, statementPaid)) {
        case 'OVERDUE':
            return 'OVERDUE';
        case 'DUE_SOON':
            return 'DUE_SOON';
        default:
            if (!hasStatement) {
                return 'NONE';
            }
            return partial ? 'PARTIAL' : 'PENDING';
    }
}

/** A paid statement only covers the card while it is not later than the next due date. */
export function paidCovers(
    paid: boolean,
    statementDueDate: string | null | undefined,
    nextDueDate: string | null | undefined,
): boolean {
    if (!paid) {
        return false;
    }
    const statement = statementDueDate ? parseDateOnly(statementDueDate) : null;
    const next = nextDueDate ? parseDateOnly(nextDueDate) : null;
    if (!statement || !next) {
        return true;
    }
    return calendarDaysBetween(next, statement) <= 0;
}

type StatusInput = {
    statementPaid: boolean;
    partial: boolean;
    hasStatement: boolean;
    statementDueDate: string | null | undefined;
    nextDueDate: string | null | undefined;
    daysUntilNextDue: number | null | undefined;
    today: Date;
};

export function resolveCardStatus({
    statementPaid,
    partial,
    hasStatement,
    statementDueDate,
    nextDueDate,
    daysUntilNextDue,
    today,
}: StatusInput): CardStatus {
    const paid = hasStatement && paidCovers(statementPaid, statementDueDate, nextDueDate);
    const statementDue = statementDueDate ? parseDateOnly(statementDueDate) : null;
    const statementDays = statementDue ? calendarDaysBetween(today, statementDue) : null;
    const badge = cardBadgeOf({
        paid,
        partial,
        hasStatement,
        daysUntilDue: daysUntilNextDue,
        statementDaysUntilDue: statementDays,
    });
    const overdueDays =
        !paid && hasStatement && statementDays != null && statementDays < 0 ? -statementDays : null;
    return { paid, badge, overdueDays };
}

/** One source of truth per card: a paid statement only counts when it is the one the next due date belongs to. */
export function overviewCardStatus(card: CreditCardOverviewCard, today: Date = new Date()): CardStatus {
    const summary = card.statementSummary?.statementImportId ? card.statementSummary : null;
    return resolveCardStatus({
        statementPaid: summary?.paymentStatus === 'PAID',
        partial: summary?.paymentStatus === 'PARTIAL',
        hasStatement: summary != null,
        statementDueDate: summary?.dueDate,
        nextDueDate: card.schedule.nextPaymentDueDate,
        daysUntilNextDue: card.schedule.daysUntilPaymentDue,
        today,
    });
}
