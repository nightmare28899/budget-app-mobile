import { useQuery } from '@tanstack/react-query';
import { statementImportsApi } from '../../api/resources/statementImports';

export function useStatementDetail(id: string, enabled = true) {
    const query = useQuery({
        queryKey: ['statementImports', 'detail', id],
        queryFn: () => statementImportsApi.getOne(id),
        enabled: enabled && Boolean(id),
    });

    return {
        statement: query.data ?? null,
        isLoading: query.isLoading,
        isError: query.isError,
        isRefreshing: query.isRefetching,
        refetch: query.refetch,
    };
}
