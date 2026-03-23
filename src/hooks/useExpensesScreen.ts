import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    InfiniteData,
    useInfiniteQuery,
    useMutation,
    useQueryClient,
} from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { expensesApi } from '../api/expenses';
import {
    Expense,
    ExpensesFilters,
    ExpensesListResponse,
} from '../types';
import { useAppAlert } from '../components/alerts/AlertProvider';
import { useI18n } from './useI18n';

type NavigationLike = {
    setParams: (params: any) => void;
};

type UseExpensesScreenParams = {
    navigation: NavigationLike;
    successMessage?: string;
};

const DEFAULT_LIMIT = 20;

function normalizeFilters(filters: ExpensesFilters): ExpensesFilters {
    const normalized: ExpensesFilters = {};

    if (typeof filters.from === 'string' && filters.from.trim()) {
        normalized.from = filters.from.trim();
    }
    if (typeof filters.to === 'string' && filters.to.trim()) {
        normalized.to = filters.to.trim();
    }
    if (typeof filters.q === 'string' && filters.q.trim()) {
        normalized.q = filters.q.trim();
    }
    if (typeof filters.categoryId === 'string' && filters.categoryId.trim()) {
        normalized.categoryId = filters.categoryId.trim();
    }

    return normalized;
}

function mergeUniqueExpenses(pages: ExpensesListResponse[] | undefined): Expense[] {
    const seen = new Set<string>();
    const items: Expense[] = [];

    for (const page of pages ?? []) {
        for (const expense of page.expenses) {
            if (seen.has(expense.id)) {
                continue;
            }

            seen.add(expense.id);
            items.push(expense);
        }
    }

    return items;
}

function removeExpenseFromInfiniteData(
    data: InfiniteData<ExpensesListResponse, number> | undefined,
    expenseId: string,
): InfiniteData<ExpensesListResponse, number> | undefined {
    if (!data) {
        return data;
    }

    let removedExpense: Expense | undefined;
    const pageExpenses = data.pages.map((page) =>
        page.expenses.filter((expense) => {
            if (expense.id !== expenseId) {
                return true;
            }

            removedExpense = expense;
            return false;
        }),
    );

    if (!removedExpense) {
        return data;
    }

    const removedCost = Number(removedExpense.cost || 0);
    const pages = data.pages.map((page, index) => ({
        ...page,
        expenses: pageExpenses[index],
        total: Math.max(0, page.total - removedCost),
        pagination: {
            ...page.pagination,
            totalCount: Math.max(page.pagination.totalCount - 1, 0),
        },
    }));

    return {
        ...data,
        pages,
    };
}

function keepFirstExpensesPage(
    data: InfiniteData<ExpensesListResponse, number> | undefined,
): InfiniteData<ExpensesListResponse, number> | undefined {
    if (!data) {
        return data;
    }

    return {
        ...data,
        pages: data.pages.slice(0, 1),
        pageParams: data.pageParams.slice(0, 1),
    };
}

export function useExpensesScreen({
    navigation,
    successMessage,
}: UseExpensesScreenParams) {
    const queryClient = useQueryClient();
    const { alert } = useAppAlert();
    const { t } = useI18n();
    const [limit] = useState(DEFAULT_LIMIT);
    const [filters, setFiltersState] = useState<ExpensesFilters>({});
    const activeSwipeableRef = useRef<any>(null);
    const activeSwipeableIdRef = useRef<string | null>(null);

    const normalizedFilters = useMemo(
        () => normalizeFilters(filters),
        [filters],
    );
    const queryKey = useMemo(
        () => ['expenses', 'list', normalizedFilters, limit] as const,
        [limit, normalizedFilters],
    );

    const {
        data,
        error,
        fetchNextPage,
        hasNextPage,
        isFetching,
        isFetchingNextPage,
        isLoading,
        isRefetching,
        isFetchNextPageError,
        isRefetchError,
        refetch,
    } = useInfiniteQuery({
        queryKey,
        initialPageParam: 1,
        queryFn: ({ pageParam, signal }) =>
            expensesApi.getAll(
                {
                    ...normalizedFilters,
                    page: pageParam,
                    limit,
                },
                { signal },
            ),
        getNextPageParam: (lastPage) =>
            lastPage.pagination.hasNext
                ? lastPage.pagination.page + 1
                : undefined,
        staleTime: 30_000,
        gcTime: 5 * 60_000,
    });

    const resetCachedPagesToFirst = useCallback(() => {
        queryClient.setQueryData(queryKey, keepFirstExpensesPage);
    }, [queryClient, queryKey]);

    useEffect(() => {
        if (!successMessage) {
            return;
        }

        alert(t('common.success'), successMessage);
        navigation.setParams({ successMessage: undefined });
        resetCachedPagesToFirst();
        refetch();
    }, [alert, navigation, refetch, resetCachedPagesToFirst, successMessage, t]);

    useFocusEffect(
        useCallback(() => {
            activeSwipeableRef.current?.close?.();
            activeSwipeableRef.current = null;
            activeSwipeableIdRef.current = null;

            return () => {
                activeSwipeableRef.current?.close?.();
                activeSwipeableRef.current = null;
                activeSwipeableIdRef.current = null;
            };
        }, []),
    );

    const items = useMemo(
        () => mergeUniqueExpenses(data?.pages),
        [data?.pages],
    );
    const firstPage = data?.pages[0];
    const lastPage = data?.pages[data.pages.length - 1];
    const page = lastPage?.pagination.page ?? 1;
    const total = firstPage?.total ?? 0;
    const totalCount = firstPage?.pagination.totalCount ?? items.length;
    const hasNext = hasNextPage ?? false;
    const isInitialLoading = isLoading && items.length === 0;
    const isRefreshing = isRefetching && !isFetchingNextPage;
    const isLoadingMore = isFetchingNextPage;
    const canLoadMore =
        hasNext
        && !isLoading
        && !isFetching
        && !isRefetching
        && !isFetchingNextPage;
    const initialLoadError = items.length === 0 ? error : null;
    const loadMoreError = items.length > 0 && isFetchNextPageError ? error : null;
    const refreshError = items.length > 0 && isRefetchError ? error : null;

    const loadMore = useCallback(() => {
        if (!canLoadMore) {
            return;
        }

        fetchNextPage();
    }, [canLoadMore, fetchNextPage]);

    const refresh = useCallback(() => {
        if (isLoadingMore) {
            return;
        }

        resetCachedPagesToFirst();
        refetch();
    }, [isLoadingMore, refetch, resetCachedPagesToFirst]);

    const retry = useCallback(() => {
        refetch();
    }, [refetch]);

    const setFilters = useCallback((nextFilters: ExpensesFilters) => {
        setFiltersState(nextFilters);
    }, []);

    const updateFilters = useCallback((nextFilters: Partial<ExpensesFilters>) => {
        setFiltersState((current) => ({
            ...current,
            ...nextFilters,
        }));
    }, []);

    const resetFilters = useCallback(() => {
        setFiltersState({});
    }, []);

    const deleteMutation = useMutation({
        mutationFn: (id: string) => expensesApi.delete(id),
        onSuccess: async (_result, deletedId) => {
            queryClient.setQueriesData(
                { queryKey: ['expenses', 'list'] },
                (oldData: InfiniteData<ExpensesListResponse, number> | undefined) =>
                    removeExpenseFromInfiniteData(oldData, deletedId),
            );
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['expenses'] }),
                queryClient.invalidateQueries({ queryKey: ['analytics'] }),
                queryClient.invalidateQueries({ queryKey: ['history'] }),
            ]);
        },
    });

    const onDeleteExpense = useCallback((id: string) => {
        alert(t('expense.deleteTitle'), t('expense.deleteMessage'), [
            { text: t('common.cancel'), style: 'cancel' },
            {
                text: t('common.delete'),
                style: 'destructive',
                onPress: () => deleteMutation.mutate(id),
            },
        ]);
    }, [alert, deleteMutation, t]);

    return {
        items,
        page,
        limit,
        total,
        totalCount,
        hasNext,
        isLoading: isInitialLoading,
        isRefreshing,
        isLoadingMore,
        error: initialLoadError,
        refreshError,
        loadMoreError,
        filters: normalizedFilters,
        setFilters,
        updateFilters,
        resetFilters,
        refresh,
        loadMore,
        retry,
        onDeleteExpense,
        activeSwipeableRef,
        activeSwipeableIdRef,
    };
}
