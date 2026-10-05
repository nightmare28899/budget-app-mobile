const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})/;

function pad(value: number, length = 2): string {
    return String(value).padStart(length, '0');
}

/**
 * "YYYY-MM-DD" for the LOCAL calendar day of `date`.
 * Never use `toISOString().slice(0, 10)` for this: it yields the UTC day, which
 * is the wrong day for users west of UTC in the evening (e.g. Mexico after 18:00).
 */
export function toLocalDateString(date: Date): string {
    return `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Parses "YYYY-MM-DD" (or an ISO string starting with it) as a local calendar
 * day at noon (DST-safe). Returns null when it is not a real calendar date.
 * Never use `new Date('YYYY-MM-DD')`: that is UTC midnight, i.e. the previous
 * day for users west of UTC.
 */
export function parseDateOnly(value: string): Date | null {
    const match = DATE_ONLY_PATTERN.exec(value);
    if (!match) {
        return null;
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const parsed = new Date(year, month - 1, day, 12, 0, 0, 0);
    if (
        parsed.getFullYear() !== year ||
        parsed.getMonth() !== month - 1 ||
        parsed.getDate() !== day
    ) {
        return null;
    }

    return parsed;
}

/** Backend wire format for a calendar day: noon UTC, so every timezone reads the same day. */
export function toDateOnlyNoonUtcIso(date: Date): string {
    return `${toLocalDateString(date)}T12:00:00.000Z`;
}
