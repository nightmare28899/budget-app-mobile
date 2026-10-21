import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('../../src/api/resources/statementImports', () => ({ statementImportsApi: {
    createPayment: jest.fn(), correctPayment: jest.fn(), voidPayment: jest.fn(), getOne: jest.fn(),
} }));
import { statementImportsApi } from '../../src/api/resources/statementImports';
import { useStatementPayments } from '../../src/hooks/statements/useStatementPayments';

const api = statementImportsApi as jest.Mocked<typeof statementImportsApi>;
let payments: ReturnType<typeof useStatementPayments>;
function Harness({ id = 'statement', version = 1 }: { id?: string; version?: number }) { payments = useStatementPayments(id, version); return null; }
const value = { amount: 10, currency: 'MXN', paidAt: '2026-10-21T12:00:00.000Z' };
function deferred<T>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>(done => { resolve = done; });
    return { resolve, promise };
}

describe('payment mutation and refresh lifecycle', () => {
    let renderer: Renderer.ReactTestRenderer;
    let client: QueryClient;
    beforeEach(async () => {
        jest.clearAllMocks();
        client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false, gcTime: Infinity } } });
        api.getOne.mockResolvedValue({ paymentVersion: 2 } as Awaited<ReturnType<typeof api.getOne>>);
        api.createPayment.mockResolvedValue({ paymentVersion: 2 } as Awaited<ReturnType<typeof api.createPayment>>);
        await act(async () => { renderer = Renderer.create(<QueryClientProvider client={client}><Harness /></QueryClientProvider>); });
    });
    afterEach(async () => { await act(async () => renderer.unmount()); client.clear(); });
    it('reuses an intent key after network loss and refreshes the version before retry', async () => {
        api.createPayment.mockRejectedValueOnce(new Error('network'));
        await act(async () => { expect((await payments.addPayment(value)).ok).toBe(false); });
        const first = api.createPayment.mock.calls[0][1];
        await act(async () => { expect((await payments.addPayment(value)).ok).toBe(true); });
        expect(api.createPayment.mock.calls[1][1]).toMatchObject({ idempotencyKey: first.idempotencyKey, expectedVersion: 2 });
    });
    it('keeps an acknowledged write successful if ledger refresh fails', async () => {
        api.getOne.mockRejectedValueOnce(new Error('offline'));
        await act(async () => { expect((await payments.addPayment(value)).ok).toBe(true); });
        expect(api.createPayment).toHaveBeenCalledTimes(1);
    });
    it('blocks concurrent callbacks until refresh settles', async () => {
        const refresh = deferred<Awaited<ReturnType<typeof api.getOne>>>();
        api.getOne.mockReturnValueOnce(refresh.promise);
        let first!: ReturnType<typeof payments.addPayment>;
        await act(async () => { first = payments.addPayment(value); await Promise.resolve(); });
        await act(async () => { expect((await payments.addPayment(value)).ok).toBe(false); });
        expect(api.createPayment).toHaveBeenCalledTimes(1);
        await act(async () => { refresh.resolve({ paymentVersion: 2 } as Awaited<ReturnType<typeof api.getOne>>); await first; });
    });
    it('resets version and intent identity when a route is reused for another statement', async () => {
        await act(async () => renderer.update(<QueryClientProvider client={client}><Harness id="a" version={17} /></QueryClientProvider>));
        api.createPayment.mockRejectedValueOnce(new Error('network'));
        api.getOne.mockResolvedValueOnce({ paymentVersion: 18 } as Awaited<ReturnType<typeof api.getOne>>);
        await act(async () => { await payments.addPayment(value); });
        const previous = api.createPayment.mock.calls[0][1];
        expect(previous.expectedVersion).toBe(17);
        await act(async () => renderer.update(<QueryClientProvider client={client}><Harness id="b" version={0} /></QueryClientProvider>));
        await act(async () => { await payments.addPayment(value); });
        expect(api.createPayment.mock.calls[1][0]).toBe('b');
        expect(api.createPayment.mock.calls[1][1].expectedVersion).toBe(0);
        expect(api.createPayment.mock.calls[1][1].idempotencyKey).not.toBe(previous.idempotencyKey);
    });
    it('isolates delayed previous-statement completions from a new statement', async () => {
        const old = deferred<Awaited<ReturnType<typeof api.createPayment>>>();
        api.createPayment.mockReturnValueOnce(old.promise);
        let previous!: ReturnType<typeof payments.addPayment>;
        await act(async () => { previous = payments.addPayment(value); await Promise.resolve(); });
        await act(async () => renderer.update(<QueryClientProvider client={client}><Harness id="b" version={0} /></QueryClientProvider>));
        expect(payments.isWorking).toBe(false);
        await act(async () => { await payments.addPayment(value); });
        expect(api.createPayment.mock.calls[1][1].expectedVersion).toBe(0);
        await act(async () => { old.resolve({ paymentVersion: 99 } as Awaited<ReturnType<typeof api.createPayment>>); await previous; });
        await act(async () => { await payments.addPayment({ ...value, amount: 11 }); });
        expect(api.createPayment.mock.calls[2][0]).toBe('b');
        expect(api.createPayment.mock.calls[2][1].expectedVersion).toBe(2);
    });
    it('does not submit another mutation while a failed ledger reload is still offline', async () => {
        api.createPayment.mockRejectedValueOnce(new Error('network'));
        api.getOne.mockRejectedValue(new Error('offline'));
        await act(async () => { await payments.addPayment(value); });
        await act(async () => { expect((await payments.addPayment(value)).ok).toBe(false); });
        expect(api.createPayment).toHaveBeenCalledTimes(1);
    });
});
