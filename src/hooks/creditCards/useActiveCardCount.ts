import { useCreditCardsOverview } from './useCreditCardsOverview';
import { useAppAccess } from '../access/useAppAccess';

/**
 * Number of registered (active) cards for the drawer badge. Shares the
 * ['creditCards','overview','active'] query, so it adds no extra request and
 * refreshes with the existing ['creditCards'] invalidations. 0 while logged out
 * or loading.
 */
export function useActiveCardCount(): number {
    const { isAuthenticated, isGuest } = useAppAccess();
    const { overview } = useCreditCardsOverview({ enabled: isAuthenticated || isGuest });
    return overview?.cards.length ?? 0;
}
