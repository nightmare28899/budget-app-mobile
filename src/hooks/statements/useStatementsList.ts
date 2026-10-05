import { useInfiniteQuery } from '@tanstack/react-query';
import { statementImportsApi } from '../../api/resources/statementImports';
import type { StatementImportStatus } from '../../types/statementImports';

const PAGE_SIZE = 20;

type UseStatementsListOptions = {
    creditCardId?: string;
    status?: StatementImportStatus;
    enabled?: boolean;
};

export function useStatementsList(options: UseStatementsListOptions = {}) {
    const { creditCardId, status, enabled = true } = options;

    const query = useInfiniteQuery({
        queryKey: ['statementImports', 'list', creditCardId ?? 'all', status ?? 'all'],
        queryFn: ({ pageParam }) =>
            statementImportsApi.list({
                creditCardId,
                status,
                page: pageParam,
                limit: PAGE_SIZE,
            }),
        initialPageParam: 1,
        getNextPageParam: lastPage =>
            lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
        enabled,
    });

    const items = query.data?.pages.flatMap(page => page.items) ?? [];

    return {
        items,
        total: query.data?.pages[0]?.total ?? 0,
        isLoading: query.isLoading,
        isError: query.isError,
        isRefreshing: query.isRefetching && !query.isFetchingNextPage,
        isFetchingNextPage: query.isFetchingNextPage,
        hasNextPage: query.hasNextPage === true,
        fetchNextPage: query.fetchNextPage,
        refetch: query.refetch,
    };
}
