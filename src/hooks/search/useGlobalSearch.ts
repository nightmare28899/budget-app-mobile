import { useCallback, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { expensesApi } from '../../api/resources/expenses';
import { incomesApi } from '../../api/resources/incomes';
import { subscriptionsApi } from '../../api/resources/subscriptions';
import {
    SEARCH_DEBOUNCE_MS,
    SEARCH_RESULTS_PER_GROUP,
    SearchOutcome,
    buildSearchOutcome,
    filterSubscriptionsByName,
    limitGroup,
    normalizeSearchQuery,
} from '../../modules/search/globalSearch';

async function runGlobalSearch(query: string, signal?: AbortSignal): Promise<SearchOutcome> {
    const [expenses, incomes, subscriptions] = await Promise.allSettled([
        expensesApi
            .getAll({ q: query, page: 1, limit: SEARCH_RESULTS_PER_GROUP }, { signal })
            .then((response) => limitGroup(response.expenses, response.pagination.totalCount)),
        incomesApi
            .getAll({ q: query }, { signal })
            .then((response) => limitGroup(response.incomes, response.count || response.incomes.length)),
        subscriptionsApi
            .getAll()
            .then((list) => filterSubscriptionsByName(list, query)),
    ]);

    return buildSearchOutcome(expenses, incomes, subscriptions);
}

/** Debounced unified search over expenses, income and subscriptions. */
export function useGlobalSearch() {
    const [input, setInput] = useState('');
    const [applied, setApplied] = useState('');
    const normalized = normalizeSearchQuery(input);

    useEffect(() => {
        if (!normalized) {
            setApplied('');
            return undefined;
        }
        const timer = setTimeout(() => setApplied(normalized), SEARCH_DEBOUNCE_MS);
        return () => clearTimeout(timer);
    }, [normalized]);

    const { data, isFetching, refetch } = useQuery({
        queryKey: ['search', applied],
        queryFn: ({ signal }) => runGlobalSearch(applied, signal),
        enabled: applied.length > 0,
    });

    const isIdle = normalized.length === 0;
    // Typing ahead of the debounce also counts as loading, like the Compose state reset.
    const isLoading = !isIdle && (applied !== normalized || !data || isFetching && !data);

    const retry = useCallback(() => {
        if (applied) {
            refetch();
        }
    }, [applied, refetch]);

    return {
        query: input,
        setQuery: setInput,
        isIdle,
        isLoading,
        outcome: isIdle || applied !== normalized ? null : data ?? null,
        retry,
    };
}
