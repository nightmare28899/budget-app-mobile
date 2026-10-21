import { createExpenseSink } from '../../../src/modules/csvImport/importSink';
import { jobReport, runImport } from '../../../src/modules/csvImport/expenseImportRunner';
import type { ExpenseDraft, ImportJob } from '../../../src/modules/csvImport/csvTypes';

const draft = (n: number): ExpenseDraft => ({
    title: `t${n}`, cost: n, currency: 'MXN', date: '2026-05-01',
    merchantName: 'Shop', note: 'n', paymentMethod: 'CASH', categoryId: 'c1',
});
const job = (n: number): ImportJob => ({
    rows: Array.from({ length: n }, (_, i) => ({
        line: i + 2, draft: draft(i + 1), state: 'PENDING', handle: null, error: null,
    })),
});

describe('createExpenseSink', () => {
    it('creates each row once and confirms it', async () => {
        const create = jest.fn(async (payload: { title: string }) => ({ id: `id-${payload.title}` }));
        const sink = createExpenseSink({ create, isSessionValid: () => true });
        const result = await runImport(sink, job(5), { batchSize: 2 });
        expect(create).toHaveBeenCalledTimes(5);
        expect(jobReport(result.job).confirmed).toBe(5);
    });

    it('maps a draft to the create payload', async () => {
        const create = jest.fn(async () => ({ id: 'x' }));
        const sink = createExpenseSink({ create, isSessionValid: () => true });
        await sink.accept(draft(1));
        expect(create).toHaveBeenCalledWith({
            title: 't1',
            cost: 1,
            currency: 'MXN',
            date: '2026-05-01',
            merchantName: 'Shop',
            note: 'n',
            paymentMethod: 'CASH',
            categoryId: 'c1',
        });
    });

    it('omits empty optional fields from the payload', async () => {
        const create = jest.fn(async () => ({ id: 'x' }));
        const sink = createExpenseSink({ create, isSessionValid: () => true });
        await sink.accept({ ...draft(1), merchantName: null, note: null, paymentMethod: null, categoryId: null });
        expect(create).toHaveBeenCalledWith({
            title: 't1', cost: 1, currency: 'MXN', date: '2026-05-01',
        });
    });

    it('marks only the failing row as failed with its message', async () => {
        const create = jest.fn(async (payload: { title: string }) => {
            if (payload.title === 't1') {
                throw new Error('disk full');
            }
            return { id: payload.title };
        });
        const sink = createExpenseSink({ create, isSessionValid: () => true });
        const report = jobReport((await runImport(sink, job(2), { maxConsecutiveFailures: 100 })).job);
        expect(report.failed).toBe(1);
        expect(report.confirmed).toBe(1);
        expect(report.failures[0].error).toBe('disk full');
    });

    it('prefers the backend message of an api error', async () => {
        const create = jest.fn(async () => {
            throw { response: { data: { message: 'invalid currency' } } };
        });
        const sink = createExpenseSink({ create, isSessionValid: () => true });
        const report = jobReport((await runImport(sink, job(1))).job);
        expect(report.failures[0].error).toBe('invalid currency');
    });

    it('aborts before creating anything when the session changed', async () => {
        const create = jest.fn(async () => ({ id: 'x' }));
        const sink = createExpenseSink({ create, isSessionValid: () => false });
        const result = await runImport(sink, job(3));
        expect(result.abort).toBe('SESSION_CHANGED');
        expect(create).not.toHaveBeenCalled();
    });

    it('treats an axios error without a response as an unknown outcome', async () => {
        const create = jest.fn(async () => {
            throw Object.assign(new Error('timeout of 10000ms exceeded'), {
                isAxiosError: true,
                code: 'ECONNABORTED',
            });
        });
        const sink = createExpenseSink({ create, isSessionValid: () => true });
        await expect(sink.accept(draft(1))).resolves.toEqual({
            kind: 'unknown',
            reason: 'timeout of 10000ms exceeded',
        });
    });

    it('keeps an axios error with an http response a plain rejection', async () => {
        const create = jest.fn(async () => {
            throw Object.assign(new Error('Request failed'), {
                isAxiosError: true,
                response: { status: 500, data: { message: 'server broke' } },
            });
        });
        const sink = createExpenseSink({ create, isSessionValid: () => true });
        await expect(sink.accept(draft(1))).resolves.toEqual({ kind: 'rejected', reason: 'server broke' });
    });
});
