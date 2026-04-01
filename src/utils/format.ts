import dayjs from 'dayjs';
import { DEFAULT_CURRENCY, normalizeCurrency } from './currency';

/**
 * Format a number as currency
 */
export function formatCurrency(
    amount: number,
    currency = DEFAULT_CURRENCY,
    locale: 'es-MX' | 'en-US' = 'es-MX',
): string {
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: normalizeCurrency(currency),
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
}

/**
 * Format a date string to a readable format
 */
export function formatDate(date: string | Date, format = 'MMM D, YYYY'): string {
    return dayjs(date).format(format);
}

/**
 * Format a date to relative time (e.g., "2 hours ago")
 */
export function formatTime(date: string | Date): string {
    return dayjs(date).format('h:mm A');
}

/**
 * Get today's date as ISO string (date only)
 */
export function todayISO(): string {
    return dayjs().format('YYYY-MM-DD');
}

/**
 * Calculate budget percentage and status
 */
export function getBudgetStatus(spent: number, budget: number) {
    if (budget <= 0) return { percentage: 0, status: 'safe' as const };

    const percentage = Math.round((spent / budget) * 100);

    let status: 'safe' | 'warning' | 'danger';
    if (percentage < 70) status = 'safe';
    else if (percentage < 90) status = 'warning';
    else status = 'danger';

    return { percentage, status };
}
