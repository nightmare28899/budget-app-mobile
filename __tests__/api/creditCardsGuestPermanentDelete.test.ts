jest.mock('../../src/modules/access/localMode', () => ({ isLocalMode: () => true }));
jest.mock('../../src/store/secureStorage', () => ({
    createSecureStorage: () => ({
        getString: () => undefined,
        set: jest.fn(),
        delete: jest.fn(),
    }),
    migrateLegacyStringStore: jest.fn(),
}));
jest.mock('../../src/api/client', () => ({ __esModule: true, default: {} }));

import { creditCardsApi } from '../../src/api/resources/creditCards';
import { useGuestDataStore } from '../../src/store/guestDataStore';

describe('creditCardsApi.removePermanently (guest mode)', () => {
    beforeEach(() => {
        useGuestDataStore.setState({
            isHydrated: true,
            creditCards: [
                { id: 'c1', name: 'A' },
                { id: 'c2', name: 'B' },
            ] as never,
            expenses: [
                { id: 'e1', creditCardId: 'c1' },
                { id: 'e2', creditCardId: 'c2' },
                { id: 'e3', creditCardId: 'c1' },
            ] as never,
            subscriptions: [
                { id: 's1', creditCardId: 'c1' },
                { id: 's2', creditCardId: null },
            ] as never,
        });
    });

    it('removes the card and unlinks expenses/subscriptions', async () => {
        const res = await creditCardsApi.removePermanently('c1');
        expect(res).toEqual({
            id: 'c1',
            deleted: true,
            unlinkedExpenses: 2,
            unlinkedSubscriptions: 1,
        });

        const state = useGuestDataStore.getState();
        expect(state.creditCards.map((c) => c.id)).toEqual(['c2']);
        expect(state.expenses.map((e) => e.creditCardId)).toEqual([null, 'c2', null]);
        expect(state.subscriptions.map((s) => s.creditCardId)).toEqual([null, null]);
    });

    it('throws a 404-shaped error for unknown card', async () => {
        await expect(creditCardsApi.removePermanently('nope')).rejects.toMatchObject({
            response: { status: 404 },
        });
    });
});
