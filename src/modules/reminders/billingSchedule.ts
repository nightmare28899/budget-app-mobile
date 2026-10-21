import { addDays, addMonths, monthIndex } from './dates';
import type { BillingCycle, LocalDate } from './types';

export const BILLING_LIMIT = 500;

/**
 * Occurrence `k` is always derived from the stable anchor (`anchor + k cycles`), never chained from the
 * previous date, so day 31 survives short months (Jan 31 -> Feb 28 -> Mar 31).
 */
export function occurrence(anchor: LocalDate, cycle: BillingCycle, k: number): LocalDate {
    switch (cycle) {
        case 'WEEKLY':
            return addDays(anchor, 7 * k);
        case 'YEARLY':
            return addMonths(anchor, 12 * k);
        default:
            return addMonths(anchor, k);
    }
}

/** Index of the first occurrence on or after `from`; 0 when `from` is not after the anchor. */
export function firstIndexOnOrAfter(anchor: LocalDate, cycle: BillingCycle, from: LocalDate): number {
    if (from <= anchor) {
        return 0;
    }
    const estimate = (() => {
        switch (cycle) {
            case 'WEEKLY':
                return Math.floor(
                    (Date.parse(`${from}T00:00:00Z`) - Date.parse(`${anchor}T00:00:00Z`)) /
                        (7 * 86_400_000),
                );
            case 'YEARLY':
                return Math.floor((monthIndex(from) - monthIndex(anchor)) / 12);
            default:
                return monthIndex(from) - monthIndex(anchor);
        }
    })();
    let k = Math.max(0, estimate);
    while (k > 0 && occurrence(anchor, cycle, k - 1) >= from) {
        k--;
    }
    while (occurrence(anchor, cycle, k) < from) {
        k++;
    }
    return k;
}

/** Occurrences `d` with `from <= d <= to`, at most `limit` of them. */
export function occurrencesBetween(
    anchor: LocalDate,
    cycle: BillingCycle,
    from: LocalDate,
    to: LocalDate,
    limit = BILLING_LIMIT,
): LocalDate[] {
    const result: LocalDate[] = [];
    let k = firstIndexOnOrAfter(anchor, cycle, from);
    while (result.length < limit) {
        const date = occurrence(anchor, cycle, k);
        if (date > to) {
            break;
        }
        result.push(date);
        k++;
    }
    return result;
}
