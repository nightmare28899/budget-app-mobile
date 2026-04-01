import { AppLanguage } from '../i18n';
import { toNum } from './number';

export const DEFAULT_CURRENCY = 'MXN';
export const SUPPORTED_CURRENCIES = ['MXN', 'USD', 'EUR'] as const;

export type SupportedCurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

export type CurrencyTotal = {
    currency: string;
    total: number;
};

export const CURRENCY_OPTIONS: Array<{
    code: SupportedCurrencyCode;
    symbol: string;
}> = [
    { code: 'MXN', symbol: '$' },
    { code: 'USD', symbol: '$' },
    { code: 'EUR', symbol: '€' },
];

export function normalizeCurrency(
    value?: string | null,
    fallback = DEFAULT_CURRENCY,
): string {
    if (typeof value !== 'string') {
        return fallback;
    }

    const normalized = value.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(normalized)) {
        return fallback;
    }

    return normalized;
}

export function getCurrencyLocale(language?: AppLanguage | null): 'es-MX' | 'en-US' {
    return language === 'en' ? 'en-US' : 'es-MX';
}

export function getCurrencySymbol(
    currency?: string | null,
    locale: 'es-MX' | 'en-US' = 'es-MX',
): string {
    try {
        const parts = new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: normalizeCurrency(currency),
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).formatToParts(0);

        return parts.find((part) => part.type === 'currency')?.value ?? '$';
    } catch {
        return '$';
    }
}

export function aggregateCurrencyTotals<T>(
    items: T[],
    readAmount: (item: T) => number,
    readCurrency: (item: T) => string | null | undefined,
    fallbackCurrency = DEFAULT_CURRENCY,
): CurrencyTotal[] {
    const totals = new Map<string, number>();

    for (const item of items) {
        const currency = normalizeCurrency(readCurrency(item), fallbackCurrency);
        totals.set(currency, (totals.get(currency) ?? 0) + toNum(readAmount(item)));
    }

    return Array.from(totals.entries())
        .map(([currency, total]) => ({
            currency,
            total: Math.round(total * 100) / 100,
        }))
        .sort((a, b) => a.currency.localeCompare(b.currency));
}

export function formatCurrencyBreakdown(
    items: CurrencyTotal[],
    options?: {
        locale?: 'es-MX' | 'en-US';
        emptyCurrency?: string;
    },
): string {
    const locale = options?.locale ?? 'es-MX';
    const emptyCurrency = options?.emptyCurrency ?? DEFAULT_CURRENCY;

    if (!items.length) {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: normalizeCurrency(emptyCurrency),
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(0);
    }

    return items
        .map((item) =>
            new Intl.NumberFormat(locale, {
                style: 'currency',
                currency: normalizeCurrency(item.currency),
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }).format(item.total),
        )
        .join(' • ');
}

export function normalizeCurrencyTotals(
    items: unknown,
    valueKey: 'total' | 'monthlyCost' = 'total',
): CurrencyTotal[] {
    if (!Array.isArray(items)) {
        return [];
    }

    return items
        .map((item) => {
            if (!item || typeof item !== 'object') {
                return null;
            }

            const raw = item as Record<string, unknown>;
            return {
                currency: normalizeCurrency(
                    typeof raw.currency === 'string' ? raw.currency : undefined,
                ),
                total: toNum(raw[valueKey]),
            } satisfies CurrencyTotal;
        })
        .filter((item): item is CurrencyTotal => item !== null);
}
