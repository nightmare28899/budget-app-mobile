import { useQuery } from '@tanstack/react-query';
import { creditCardsApi } from '../api/resources/creditCards';

type UseCreditCardsOverviewOptions = {
    includeInactive?: boolean;
    enabled?: boolean;
};

function toOverviewQueryKey(includeInactive?: boolean) {
    return ['creditCards', 'overview', includeInactive ? 'all' : 'active'];
}

export function useCreditCardsOverview(options?: UseCreditCardsOverviewOptions) {
    const includeInactive = options?.includeInactive === true;
    const enabled = options?.enabled ?? true;

    const query = useQuery({
        queryKey: toOverviewQueryKey(includeInactive),
        queryFn: () => creditCardsApi.getOverview({ includeInactive }),
        enabled,
    });

    return {
        overview: query.data ?? null,
        isLoading: query.isLoading,
        isRefreshing: query.isRefetching,
        refetch: query.refetch,
    };
}
