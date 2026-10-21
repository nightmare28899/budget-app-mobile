import {
    SEARCH_RESULTS_PER_GROUP,
    buildSearchOutcome,
    filterSubscriptionsByName,
    limitGroup,
    normalizeSearchQuery,
} from '../../src/modules/search/globalSearch';
import { Expense, Income, Subscription } from '../../src/types/index';

const exp = { id: 'e' } as Expense;
const inc = { id: 'i' } as Income;

function sub(id: string, name: string): Subscription {
    return { id, name } as Subscription;
}

const ok = <T,>(items: T[], total = items.length) => ({
    status: 'fulfilled' as const,
    value: { items, total },
});
const fail = (reason: unknown = new Error('boom')) => ({
    status: 'rejected' as const,
    reason,
});

describe('globalSearch', () => {
    it('trims the query', () => {
        expect(normalizeSearchQuery('  netflix  ')).toBe('netflix');
        expect(normalizeSearchQuery('   ')).toBe('');
    });

    it('filters subscriptions by case-insensitive name contains', () => {
        const result = filterSubscriptionsByName(
            [sub('1', 'Netflix'), sub('2', 'Spotify'), sub('3', 'NETFLIX Kids')],
            'netflix',
        );
        expect(result.items.map((s) => s.id)).toEqual(['1', '3']);
        expect(result.total).toBe(2);
    });

    it('caps a group but keeps the real total', () => {
        const many = Array.from({ length: 25 }, (_, i) => sub(String(i), `Svc ${i}`));
        const result = filterSubscriptionsByName(many, 'svc');
        expect(result.items).toHaveLength(SEARCH_RESULTS_PER_GROUP);
        expect(result.total).toBe(25);
        expect(limitGroup([1, 2, 3], 10)).toEqual({ items: [1, 2, 3], total: 10 });
    });

    it('builds an outcome with all groups', () => {
        const outcome = buildSearchOutcome(ok([exp]), ok([inc]), ok([sub('s', 'S')]));
        expect(outcome.expenses).toEqual({ items: [exp], total: 1 });
        expect(outcome.error).toBeNull();
        expect(outcome.isPartial).toBe(false);
        expect(outcome.isEmpty).toBe(false);
    });

    it('is empty when every source succeeds with nothing', () => {
        const outcome = buildSearchOutcome(ok([]), ok([]), ok([]));
        expect(outcome.isEmpty).toBe(true);
        expect(outcome.error).toBeNull();
    });

    it('is partial when some sources fail', () => {
        const outcome = buildSearchOutcome(ok([exp]), fail(), ok([]));
        expect(outcome.isPartial).toBe(true);
        expect(outcome.error).toBeNull();
        expect(outcome.incomes).toEqual({ items: [], total: 0 });
        expect(outcome.expenses.items).toEqual([exp]);
    });

    it('reports the first error when all sources fail', () => {
        const first = new Error('first');
        const outcome = buildSearchOutcome(fail(first), fail(), fail());
        expect(outcome.error).toBe(first);
        expect(outcome.isPartial).toBe(false);
    });
});
