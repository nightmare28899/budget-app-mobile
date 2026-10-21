import { calendarDaysBetween } from './cardPaymentSchedule';

/** Statement cycle laid out on a 0..1 axis: previous closing -> next closing (or due date). */
export type CycleTimeline = {
    start: Date;
    end: Date;
    closing: Date;
    due: Date | null;
    today: Date;
    todayFraction: number;
    closingFraction: number;
    dueFraction: number | null;
};

function atNoon(year: number, month: number, day: number): Date {
    return new Date(year, month, day, 12, 0, 0, 0);
}

function addDays(date: Date, days: number): Date {
    return atNoon(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

export function previousClosing(nextClosing: Date, closingDay: number | null | undefined): Date {
    const year = nextClosing.getFullYear();
    const month = nextClosing.getMonth() - 1;
    const monthLength = new Date(year, month + 1, 0).getDate();
    const validDay = closingDay != null && closingDay >= 1 && closingDay <= 31
        ? closingDay
        : nextClosing.getDate();
    return atNoon(year, month, Math.min(validDay, monthLength));
}

export function cycleFraction(start: Date, end: Date, at: Date): number {
    const length = calendarDaysBetween(start, end);
    if (length <= 0) {
        return 0;
    }
    return Math.min(Math.max(calendarDaysBetween(start, at) / length, 0), 1);
}

export function inferToday(
    closing: Date | null,
    daysUntilClosing: number | null | undefined,
    due: Date | null,
    daysUntilDue: number | null | undefined,
    fallback: Date,
): Date {
    if (closing && daysUntilClosing != null) {
        return addDays(closing, -daysUntilClosing);
    }
    if (due && daysUntilDue != null) {
        return addDays(due, -daysUntilDue);
    }
    return fallback;
}

export function buildCycleTimeline(
    today: Date,
    nextClosing: Date | null,
    nextDue: Date | null,
    closingDay: number | null | undefined,
): CycleTimeline | null {
    if (!nextClosing) {
        return null;
    }
    const start = previousClosing(nextClosing, closingDay);
    const end = nextDue && calendarDaysBetween(nextClosing, nextDue) > 0 ? nextDue : nextClosing;
    return {
        start,
        end,
        closing: nextClosing,
        due: nextDue,
        today,
        todayFraction: cycleFraction(start, end, today),
        closingFraction: cycleFraction(start, end, nextClosing),
        dueFraction: nextDue ? cycleFraction(start, end, nextDue) : null,
    };
}
