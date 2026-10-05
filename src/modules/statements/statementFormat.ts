import { parseDateOnly } from '../creditCards/cardPaymentSchedule';

type Locale = 'es-MX' | 'en-US';

export function formatStatementDate(
    value: string | null | undefined,
    locale: Locale,
    withYear = true,
): string | null {
    const parsed = value ? parseDateOnly(value) : null;
    if (!parsed) {
        return null;
    }

    return new Intl.DateTimeFormat(locale, {
        day: 'numeric',
        month: 'short',
        ...(withYear ? { year: 'numeric' } : {}),
    }).format(parsed);
}

/** "15 Aug - 14 Sep 2026", falling back to whichever side is known. */
export function formatStatementPeriod(
    start: string | null | undefined,
    end: string | null | undefined,
    locale: Locale,
): string | null {
    const from = formatStatementDate(start, locale, false);
    const to = formatStatementDate(end, locale, true);
    if (from && to) {
        return `${from} - ${to}`;
    }
    return to ?? formatStatementDate(start, locale, true);
}

export function formatFileSize(bytes: number | null | undefined): string | null {
    if (bytes == null || bytes <= 0) {
        return null;
    }
    if (bytes < 1024 * 1024) {
        return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
