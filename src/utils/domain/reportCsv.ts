import dayjs from 'dayjs';

export const CSV_BOM = '﻿';

export type ReportCsvLabels = {
    period: string;
    currency: string;
    total: string;
    operations: string;
    card: string;
    last4: string;
    expenses: string;
    category: string;
};

export type ReportCsvBucket = {
    label: string;
    totalsByCurrency: Record<string, number>;
    countsByCurrency: Record<string, number>;
};

export type ReportCsvCard = {
    name: string;
    last4: string;
    expenseCount: number;
    totalsByCurrency: { currency: string; total: number }[];
};

export type ReportCsvCategory = {
    name: string;
    currency: string;
    total: number;
    count: number;
};

export type ReportCsvExpense = {
    cost: unknown;
    currency?: string | null;
    date: unknown;
    category?: { name?: string | null } | null;
};

export function escapeCsvCell(value: string | number): string {
    let text = String(value);
    // Neutralise spreadsheet formula injection from user-controlled text.
    // Negative numbers ("-12.50") are legitimate and stay untouched.
    if (typeof value === 'string' && /^(?:[=+@\t\r]|-(?![\d.]))/.test(text)) {
        text = `'${text}`;
    }
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function row(cells: (string | number)[]) {
    return cells.map(escapeCsvCell).join(',');
}

/** Prisma Decimals arrive as strings; non-numeric values count as 0. */
function toCents(value: unknown): number {
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

/** Date-only string for a backend date. Strings keep their calendar part; Dates use local time. */
function toDateOnly(value: unknown): string {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
        return value.slice(0, 10);
    }

    const parsed = dayjs(value as string | Date);
    return parsed.isValid() ? parsed.format('YYYY-MM-DD') : '';
}

/** Groups expenses by day+currency and category+currency, summing in integer cents. */
export function buildReportCsvData(
    expenses: ReportCsvExpense[],
    uncategorizedLabel: string,
): { buckets: ReportCsvBucket[]; categories: ReportCsvCategory[] } {
    const days = new Map<
        string,
        { totals: Record<string, number>; counts: Record<string, number> }
    >();
    const categoryMap = new Map<string, { name: string; currency: string; cents: number; count: number }>();

    for (const expense of expenses) {
        const currency = (expense.currency || '').trim().toUpperCase() || 'MXN';
        const cents = toCents(expense.cost);
        const label = toDateOnly(expense.date);

        const day = days.get(label) ?? { totals: {}, counts: {} };
        day.totals[currency] = (day.totals[currency] ?? 0) + cents;
        day.counts[currency] = (day.counts[currency] ?? 0) + 1;
        days.set(label, day);

        const name = expense.category?.name?.trim() || uncategorizedLabel;
        const key = `${name}\u0000${currency}`;
        const entry = categoryMap.get(key) ?? { name, currency, cents: 0, count: 0 };
        entry.cents += cents;
        entry.count += 1;
        categoryMap.set(key, entry);
    }

    const buckets = Array.from(days.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([label, day]) => ({
            label,
            totalsByCurrency: Object.fromEntries(
                Object.entries(day.totals).map(([currency, cents]) => [currency, cents / 100]),
            ),
            countsByCurrency: day.counts,
        }));

    const categories = Array.from(categoryMap.values())
        .sort((a, b) => a.name.localeCompare(b.name) || a.currency.localeCompare(b.currency))
        .map((item) => ({
            name: item.name,
            currency: item.currency,
            total: item.cents / 100,
            count: item.count,
        }));

    return { buckets, categories };
}

/** Mirrors the web admin panel reportExport.ts CSV layout. */
export function buildReportCsv({
    labels,
    buckets,
    primaryCurrency,
    cards,
    categories,
}: {
    labels: ReportCsvLabels;
    buckets: ReportCsvBucket[];
    primaryCurrency: string | null;
    cards: ReportCsvCard[];
    categories: ReportCsvCategory[];
}): string {
    const lines: string[] = [
        row([labels.period, labels.currency, labels.total, labels.operations]),
    ];

    for (const bucket of buckets) {
        const currencies = new Set(Object.keys(bucket.countsByCurrency));
        if (primaryCurrency) {
            currencies.add(primaryCurrency);
        }
        for (const currency of Array.from(currencies).sort()) {
            lines.push(
                row([
                    bucket.label,
                    currency,
                    (bucket.totalsByCurrency[currency] ?? 0).toFixed(2),
                    bucket.countsByCurrency[currency] ?? 0,
                ]),
            );
        }
    }

    if (cards.length > 0) {
        lines.push('');
        lines.push(
            row([labels.card, labels.last4, labels.currency, labels.total, labels.expenses]),
        );
        for (const card of cards) {
            for (const item of card.totalsByCurrency) {
                lines.push(
                    row([
                        card.name,
                        card.last4,
                        item.currency,
                        item.total.toFixed(2),
                        card.expenseCount,
                    ]),
                );
            }
        }
    }

    if (categories.length > 0) {
        lines.push('');
        lines.push(row([labels.category, labels.currency, labels.total, labels.operations]));
        for (const item of categories) {
            lines.push(row([item.name, item.currency, item.total.toFixed(2), item.count]));
        }
    }

    return `${CSV_BOM}${lines.join('\r\n')}\r\n`;
}
