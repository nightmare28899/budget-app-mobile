import { Expense, Income, Subscription } from '../../types/index';

export const SEARCH_RESULTS_PER_GROUP = 20;
export const SEARCH_DEBOUNCE_MS = 300;

export type SearchGroup<T> = {
    items: T[];
    /** Real number of matches, which can exceed the shown items. */
    total: number;
};

export type SearchOutcome = {
    expenses: SearchGroup<Expense>;
    incomes: SearchGroup<Income>;
    subscriptions: SearchGroup<Subscription>;
    /** Set only when every source failed. */
    error: unknown | null;
    /** Some sources failed while others returned. */
    isPartial: boolean;
    isEmpty: boolean;
};

export function normalizeSearchQuery(value: string): string {
    return value.trim();
}

export function limitGroup<T>(items: T[], total: number = items.length): SearchGroup<T> {
    return { items: items.slice(0, SEARCH_RESULTS_PER_GROUP), total };
}

export function filterSubscriptionsByName(
    subscriptions: Subscription[],
    query: string,
): SearchGroup<Subscription> {
    const needle = normalizeSearchQuery(query).toLowerCase();
    const hits = subscriptions.filter((subscription) =>
        String(subscription.name ?? '').toLowerCase().includes(needle),
    );

    return limitGroup(hits);
}

function emptyGroup<T>(): SearchGroup<T> {
    return { items: [], total: 0 };
}

function unwrap<T>(result: PromiseSettledResult<SearchGroup<T>>): SearchGroup<T> {
    return result.status === 'fulfilled' ? result.value : emptyGroup<T>();
}

export function buildSearchOutcome(
    expenses: PromiseSettledResult<SearchGroup<Expense>>,
    incomes: PromiseSettledResult<SearchGroup<Income>>,
    subscriptions: PromiseSettledResult<SearchGroup<Subscription>>,
): SearchOutcome {
    const failures = [expenses, incomes, subscriptions].filter(
        (result): result is PromiseRejectedResult => result.status === 'rejected',
    );
    const allFailed = failures.length === 3;
    const groups = {
        expenses: unwrap(expenses),
        incomes: unwrap(incomes),
        subscriptions: unwrap(subscriptions),
    };

    return {
        ...groups,
        error: allFailed ? failures[0].reason : null,
        isPartial: failures.length > 0 && !allFailed,
        isEmpty:
            groups.expenses.items.length === 0
            && groups.incomes.items.length === 0
            && groups.subscriptions.items.length === 0,
    };
}
