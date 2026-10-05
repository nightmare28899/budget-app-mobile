jest.mock('../../src/api/client', () => ({
    __esModule: true,
    default: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));
jest.mock('../../src/modules/access/localMode', () => ({ isLocalMode: () => false }));
jest.mock('../../src/store/guestDataStore', () => ({
    ensureGuestDataHydrated: jest.fn(),
    getGuestUserId: jest.fn(),
}));
jest.mock('../../src/store/authStore', () => ({ useAuthStore: { getState: jest.fn() } }));

import { categoriesApi } from '../../src/api/resources/categories';
import { subscriptionsApi } from '../../src/api/resources/subscriptions';
import { analyticsApi } from '../../src/api/resources/analytics';

const client = jest.requireMock('../../src/api/client').default as Record<
    'get' | 'post' | 'patch' | 'delete',
    jest.Mock
>;

beforeEach(() => jest.clearAllMocks());

describe('categoriesApi', () => {
    it('remove calls DELETE /categories/:id', async () => {
        client.delete.mockResolvedValue({ data: { id: 'c1' } });
        await categoriesApi.remove('c1');
        expect(client.delete).toHaveBeenCalledWith('/categories/c1');
    });
});

describe('subscriptionsApi', () => {
    it('linkExpenses posts only expenseIds', async () => {
        client.post.mockResolvedValue({ data: { linkedCount: 2 } });
        const res = await subscriptionsApi.linkExpenses('s1', ['e1', 'e2']);
        expect(client.post).toHaveBeenCalledWith('/subscriptions/s1/link-expenses', {
            expenseIds: ['e1', 'e2'],
        });
        expect(res).toEqual({ count: 2 });
    });

    it('unlinkExpenses posts to unlink endpoint', async () => {
        client.post.mockResolvedValue({ data: { unlinkedCount: 1 } });
        const res = await subscriptionsApi.unlinkExpenses('s1', ['e1']);
        expect(client.post).toHaveBeenCalledWith('/subscriptions/s1/unlink-expenses', {
            expenseIds: ['e1'],
        });
        expect(res).toEqual({ count: 1 });
    });

    it('removePermanently calls DELETE /permanent', async () => {
        client.delete.mockResolvedValue({ data: { message: 'ok' } });
        await subscriptionsApi.removePermanently('s1');
        expect(client.delete).toHaveBeenCalledWith('/subscriptions/s1/permanent');
    });
});

describe('analyticsApi.getCardBreakdown', () => {
    it('sends from/to and parses decimal strings safely', async () => {
        client.get.mockResolvedValue({
            data: {
                from: '2026-04-01',
                to: '2026-04-30',
                totalCount: '3',
                currencyBreakdown: [{ currency: 'MXN', total: '10.50' }],
                groups: [
                    {
                        creditCardId: 'cc1',
                        card: { id: 'cc1', name: 'Visa', bank: 'B', brand: 'visa', last4: '1234' },
                        expenseCount: 2,
                        totalsByCurrency: [{ currency: 'MXN', total: '10.50' }],
                    },
                    { creditCardId: null, card: null, expenseCount: 'x', totalsByCurrency: [] },
                ],
            },
        });
        const res = await analyticsApi.getCardBreakdown('2026-04-01', '2026-04-30');
        expect(client.get).toHaveBeenCalledWith('/analytics/cards', {
            params: { from: '2026-04-01', to: '2026-04-30' },
        });
        expect(res.totalCount).toBe(3);
        expect(res.groups[0].totalsByCurrency[0].total).toBe(10.5);
        expect(res.groups[1].card).toBeNull();
        expect(res.groups[1].expenseCount).toBe(0);
    });
});
