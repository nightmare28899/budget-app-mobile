jest.mock('../../src/api/client', () => ({
    __esModule: true,
    default: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));
const mockIsLocalMode = jest.fn(() => false);
jest.mock('../../src/store/guestDataStore', () => ({ ensureGuestDataHydrated: jest.fn() }));
jest.mock('../../src/modules/access/localMode', () => ({
    isLocalMode: () => mockIsLocalMode(),
}));

import { creditCardsApi } from '../../src/api/resources/creditCards';
import { getCreditCardHasStatementsCount } from '../../src/utils/domain/creditCards';
import { createApiError } from '../../src/utils/platform/api';

const client = jest.requireMock('../../src/api/client').default as Record<
    'delete',
    jest.Mock
>;

beforeEach(() => {
    jest.clearAllMocks();
    mockIsLocalMode.mockReturnValue(false);
});

describe('creditCardsApi.removePermanently', () => {
    it('calls DELETE /credit-cards/:id/permanent and returns counts', async () => {
        client.delete.mockResolvedValue({
            data: { id: 'c1', deleted: true, unlinkedExpenses: 3, unlinkedSubscriptions: 1 },
        });
        const res = await creditCardsApi.removePermanently('c1');
        expect(client.delete).toHaveBeenCalledWith('/credit-cards/c1/permanent');
        expect(res).toEqual({
            id: 'c1',
            deleted: true,
            unlinkedExpenses: 3,
            unlinkedSubscriptions: 1,
        });
    });
});

describe('getCreditCardHasStatementsCount', () => {
    it('maps the 409 code to the statement count', () => {
        const error = createApiError(409, {
            code: 'CREDIT_CARD_HAS_STATEMENTS',
            message: 'creditCardHasStatements',
            statementCount: 4,
        });
        expect(getCreditCardHasStatementsCount(error)).toBe(4);
    });

    it('returns null for other errors', () => {
        expect(getCreditCardHasStatementsCount(createApiError(409, { code: 'X' }))).toBeNull();
        expect(getCreditCardHasStatementsCount(createApiError(404, {}))).toBeNull();
        expect(getCreditCardHasStatementsCount(new Error('x'))).toBeNull();
    });
});
