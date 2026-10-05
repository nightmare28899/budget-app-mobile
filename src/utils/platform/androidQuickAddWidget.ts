export type QuickAddEntryTab = 'expense' | 'income' | 'subscription';

export type AndroidWidgetLink =
    | { type: 'quick-add'; tab: QuickAddEntryTab }
    | { type: 'refresh' }
    | { type: 'upcoming-payments'; days: number }
    | { type: 'statement'; id: string };

const QUICK_ADD_URLS: Record<string, QuickAddEntryTab> = {
    'budgetapp://add/expense': 'expense',
    'budgetapp://add/income': 'income',
    'budgetapp://add/subscription': 'subscription',
};

const REFRESH_URL = 'budgetapp://refresh';
const STATEMENT_URL = /^budgetapp:\/\/statements\/([A-Za-z0-9_-]+)\/?$/i;
const UPCOMING_PAYMENTS_URL = 'budgetapp://subscriptions/upcoming?days=7';

function normalizeUrl(url: string): string {
    return url.trim().toLowerCase();
}

export function parseAndroidQuickAddUrl(url: string): QuickAddEntryTab | undefined {
    return QUICK_ADD_URLS[normalizeUrl(url)];
}

export function parseAndroidWidgetUrl(url: string): AndroidWidgetLink | undefined {
    // Statement ids are case-sensitive, so match before the URL is lowercased.
    const statementMatch = STATEMENT_URL.exec(url.trim());
    if (statementMatch?.[1]) {
        return { type: 'statement', id: statementMatch[1] };
    }

    const normalizedUrl = normalizeUrl(url);
    const tab = QUICK_ADD_URLS[normalizedUrl];

    if (tab) {
        return { type: 'quick-add', tab };
    }

    if (normalizedUrl === REFRESH_URL) {
        return { type: 'refresh' };
    }

    return normalizedUrl === UPCOMING_PAYMENTS_URL
        ? { type: 'upcoming-payments', days: 7 }
        : undefined;
}
