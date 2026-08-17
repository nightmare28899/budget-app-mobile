jest.mock('../../src/api/client', () => ({
    __esModule: true,
    default: { get: jest.fn() },
}));

jest.mock('../../src/api/resources/users', () => ({
    usersApi: { getMe: jest.fn() },
}));

jest.mock('../../src/api/resources/expenses', () => ({
    expensesApi: { getAllPages: jest.fn() },
    normalizeExpense: (expense: unknown) => expense,
}));

jest.mock('../../src/api/resources/subscriptions', () => ({
    subscriptionsApi: { getAll: jest.fn() },
    normalizeSubscription: (subscription: unknown) => subscription,
}));

jest.mock('../../src/modules/access/localMode', () => ({
    isLocalMode: () => false,
}));

jest.mock('../../src/store/guestDataStore', () => ({
    ensureGuestDataHydrated: jest.fn(),
}));

jest.mock('../../src/store/authStore', () => ({
    useAuthStore: {
        getState: jest.fn(),
    },
}));

import {
    historyApi,
    isPartialHistoryError,
} from '../../src/api/resources/history';

const mockApiClient = jest.requireMock('../../src/api/client').default as {
    get: jest.Mock;
};
const mockUsersApi = jest.requireMock('../../src/api/resources/users').usersApi as {
    getMe: jest.Mock;
};
const mockExpensesApi = jest.requireMock('../../src/api/resources/expenses').expensesApi as {
    getAllPages: jest.Mock;
};
const mockSubscriptionsApi = jest.requireMock('../../src/api/resources/subscriptions').subscriptionsApi as {
    getAll: jest.Mock;
};

describe('historyApi.getAll', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('uses the fallback sources when the aggregate endpoint fails completely', async () => {
        const expense = {
            id: 'expense-1',
            cost: 25,
            currency: 'MXN',
            date: '2026-08-10',
        };
        const subscription = {
            id: 'subscription-1',
            name: 'Streaming',
            cost: 100,
            currency: 'MXN',
            nextPaymentDate: '2026-08-20',
        };

        mockApiClient.get.mockRejectedValueOnce(new Error('aggregate unavailable'));
        mockUsersApi.getMe.mockResolvedValueOnce({ id: 'user-1', currency: 'MXN' });
        mockExpensesApi.getAllPages.mockResolvedValueOnce({ expenses: [expense] });
        mockSubscriptionsApi.getAll.mockResolvedValueOnce([subscription]);

        await expect(historyApi.getAll()).resolves.toMatchObject({
            user: { id: 'user-1' },
            expenses: [expense],
            subscriptions: [subscription],
            summary: {
                expenseCount: 1,
                subscriptionCount: 1,
                totalExpenses: 25,
                totalSubscriptions: 100,
            },
        });
    });

    it('throws a typed error while preserving data from successful fallback sources', async () => {
        const subscription = {
            id: 'subscription-1',
            name: 'Streaming',
            cost: 100,
            currency: 'MXN',
            nextPaymentDate: '2026-08-20',
        };

        mockApiClient.get.mockRejectedValueOnce(new Error('aggregate unavailable'));
        mockUsersApi.getMe.mockResolvedValueOnce({ id: 'user-1', currency: 'MXN' });
        mockExpensesApi.getAllPages.mockRejectedValueOnce(new Error('expenses unavailable'));
        mockSubscriptionsApi.getAll.mockResolvedValueOnce([subscription]);

        try {
            await historyApi.getAll();
            throw new Error('Expected historyApi.getAll to reject');
        } catch (error: unknown) {
            expect(isPartialHistoryError(error)).toBe(true);
            if (!isPartialHistoryError(error)) {
                return;
            }

            expect(error.failedSources).toEqual(['expenses']);
            expect(error.partialData.user).toMatchObject({ id: 'user-1' });
            expect(error.partialData.expenses).toEqual([]);
            expect(error.partialData.subscriptions).toEqual([subscription]);
        }
    });
});
