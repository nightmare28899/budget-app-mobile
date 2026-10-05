export {};

jest.mock('../../src/api/client', () => ({
    __esModule: true,
    default: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

const { statementImportsApi } =
    require('../../src/api/resources/statementImports') as typeof import('../../src/api/resources/statementImports');

const client = jest.requireMock('../../src/api/client').default as Record<
    'get' | 'post' | 'patch' | 'delete',
    jest.Mock
>;

describe('statement review api', () => {
    beforeEach(() => jest.clearAllMocks());

    it('patches rows with version and only the given rows', async () => {
        client.patch.mockResolvedValueOnce({ data: { id: 'i', version: 3 } });
        const detail = await statementImportsApi.updateRows('i', 2, [{ id: 'r', decision: 'EXCLUDE' }]);
        expect(client.patch).toHaveBeenCalledWith('/statement-imports/i/rows', {
            version: 2,
            rows: [{ id: 'r', decision: 'EXCLUDE' }],
        });
        expect(detail.version).toBe(3);
    });

    it('confirms, reverts and resumes with only the version', async () => {
        client.post.mockResolvedValueOnce({
            data: { import: { id: 'i', status: 'CONFIRMED' }, createdExpenseCount: 4 },
        });
        const confirmed = await statementImportsApi.confirm('i', 5);
        expect(client.post).toHaveBeenLastCalledWith('/statement-imports/i/confirm', { version: 5 });
        expect(confirmed.createdExpenseCount).toBe(4);
        expect(confirmed.statement.status).toBe('CONFIRMED');

        client.post.mockResolvedValueOnce({
            data: { import: { id: 'i', status: 'REVERTED' }, deletedExpenseCount: 4 },
        });
        const reverted = await statementImportsApi.revert('i', 6);
        expect(client.post).toHaveBeenLastCalledWith('/statement-imports/i/revert', { version: 6 });
        expect(reverted.deletedExpenseCount).toBe(4);

        client.post.mockResolvedValueOnce({ data: { id: 'i', status: 'NEEDS_REVIEW' } });
        await statementImportsApi.resume('i', 7);
        expect(client.post).toHaveBeenLastCalledWith('/statement-imports/i/resume', { version: 7 });
    });

    it('deletes an import', async () => {
        client.delete.mockResolvedValueOnce({ data: { message: 'ok' } });
        await statementImportsApi.remove('i');
        expect(client.delete).toHaveBeenCalledWith('/statement-imports/i');
    });

    it('creates, corrects and voids payments', async () => {
        const response = {
            data: { paymentVersion: 2, summary: { paidTotal: '10' }, history: [{ id: 'p', amount: '10' }] },
        };
        client.post.mockResolvedValue(response);
        const write = {
            amount: 10,
            currency: 'MXN',
            paidAt: '2026-09-01T12:00:00.000Z',
            expectedVersion: 1,
            idempotencyKey: 'k',
        };
        const created = await statementImportsApi.createPayment('i', write);
        expect(client.post).toHaveBeenLastCalledWith('/statement-imports/i/payments', write);
        expect(created.paymentVersion).toBe(2);
        expect(created.summary.paidTotal).toBe(10);

        await statementImportsApi.correctPayment('p', { ...write, reason: 'typo' });
        expect(client.post).toHaveBeenLastCalledWith('/statement-payments/p/corrections', {
            ...write,
            reason: 'typo',
        });

        await statementImportsApi.voidPayment('p', { expectedVersion: 2, reason: 'dup' });
        expect(client.post).toHaveBeenLastCalledWith('/statement-payments/p/void', {
            expectedVersion: 2,
            reason: 'dup',
        });
    });
});
