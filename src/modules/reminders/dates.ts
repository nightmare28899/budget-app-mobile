import type { LocalDate } from './types';

const DAY_MS = 86_400_000;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

type Ymd = { year: number; month: number; day: number };

function pad(value: number, length = 2): string {
    return String(value).padStart(length, '0');
}

export function lengthOfMonth(year: number, month: number): number {
    return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function formatLocalDate({ year, month, day }: Ymd): LocalDate {
    return `${pad(year, 4)}-${pad(month)}-${pad(day)}`;
}

/** Strict parse: null unless `value` is a real calendar day. */
export function parseLocalDate(value: string): Ymd | null {
    const match = ISO_DATE.exec(value);
    if (!match) {
        return null;
    }
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (month < 1 || month > 12 || day < 1 || day > lengthOfMonth(year, month)) {
        return null;
    }
    return { year, month, day };
}

function toEpochDay({ year, month, day }: Ymd): number {
    return Math.round(Date.UTC(year, month - 1, day) / DAY_MS);
}

function fromEpochDay(epochDay: number): LocalDate {
    const date = new Date(epochDay * DAY_MS);
    return formatLocalDate({
        year: date.getUTCFullYear(),
        month: date.getUTCMonth() + 1,
        day: date.getUTCDate(),
    });
}

function mustParse(value: LocalDate): Ymd {
    const parsed = parseLocalDate(value);
    if (!parsed) {
        throw new Error(`Invalid local date: ${value}`);
    }
    return parsed;
}

export function addDays(date: LocalDate, days: number): LocalDate {
    return fromEpochDay(toEpochDay(mustParse(date)) + days);
}

/** Like `LocalDate.plusMonths`: the day is clamped to the target month's length. */
export function addMonths(date: LocalDate, months: number): LocalDate {
    const { year, month, day } = mustParse(date);
    const index = year * 12 + (month - 1) + months;
    const targetYear = Math.floor(index / 12);
    const targetMonth = (index % 12 + 12) % 12 + 1;
    return formatLocalDate({
        year: targetYear,
        month: targetMonth,
        day: Math.min(day, lengthOfMonth(targetYear, targetMonth)),
    });
}

export function daysBetween(from: LocalDate, to: LocalDate): number {
    return toEpochDay(mustParse(to)) - toEpochDay(mustParse(from));
}

/** Whole months from `from`'s month to `to`'s month (ignores the day). */
export function monthIndex(date: LocalDate): number {
    const { year, month } = mustParse(date);
    return year * 12 + (month - 1);
}

/** `day` clamped into 1..length of the month. */
export function resolveDay(year: number, month: number, day: number): LocalDate {
    return formatLocalDate({
        year,
        month,
        day: Math.min(Math.max(day, 1), lengthOfMonth(year, month)),
    });
}

export function monthOf(date: LocalDate): { year: number; month: number } {
    const { year, month } = mustParse(date);
    return { year, month };
}

export function localDateOf(date: Date): LocalDate {
    return formatLocalDate({
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        day: date.getDate(),
    });
}
