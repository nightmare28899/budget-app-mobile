import {
    ambiguousDateRange,
    jobReport,
    runImport,
    withFailedRetried,
} from '../../../src/modules/csvImport/expenseImportRunner';
import {
    ImportCancelled,
    ImportSessionChanged,
} from '../../../src/modules/csvImport/csvTypes';
import type {
    AcceptResult,
    ExpenseDraft,
    ImportJob,
    ImportSink,
    Settlement,
} from '../../../src/modules/csvImport/csvTypes';

const draft = (n: number): ExpenseDraft => ({
    title: `t${n}`, cost: n, currency: 'MXN', date: '2026-05-01',
    merchantName: null, note: null, paymentMethod: null, categoryId: null,
});
const job = (n: number): ImportJob => ({
    rows: Array.from({ length: n }, (_, i) => ({
        line: i + 2, draft: draft(i + 1), state: 'PENDING', handle: null, error: null,
    })),
});

class FakeSink implements ImportSink {
    accepted: string[] = [];
    settledCalls: string[][] = [];
    rejectTitles = new Set<string>();
    throwOn: string | null = null;
    thrown: unknown = new Error('boom');
    settlement: (handle: string) => Settlement = () => ({ kind: 'confirmed' });

    async accept(d: ExpenseDraft): Promise<AcceptResult> {
        if (d.title === this.throwOn) {
            throw this.thrown;
        }
        if (this.rejectTitles.has(d.title)) {
            return { kind: 'rejected', reason: `rejected ${d.title}` };
        }
        this.accepted.push(d.title);
        return { kind: 'accepted', handle: `h-${d.title}` };
    }

    async settle(handles: string[]): Promise<Record<string, Settlement>> {
        this.settledCalls.push(handles);
        return Object.fromEntries(handles.map((h) => [h, this.settlement(h)]));
    }
}

describe('runImport', () => {
    it('accepts and confirms every row', async () => {
        const sink = new FakeSink();
        const result = await runImport(sink, job(7), { batchSize: 3 });
        const report = jobReport(result.job);
        expect(report.confirmed).toBe(7);
        expect(report.failed).toBe(0);
        expect(result.abort).toBeNull();
        expect(sink.accepted).toHaveLength(7);
    });

    it('reports monotonic progress ending at the total', async () => {
        const sink = new FakeSink();
        const seen: number[] = [];
        await runImport(sink, job(7), {
            batchSize: 3,
            onProgress: (j, p) => {
                expect(p.total).toBe(7);
                expect(j.rows).toHaveLength(7);
                seen.push(p.done);
            },
        });
        expect(seen[seen.length - 1]).toBe(7);
        expect(seen).toEqual([...seen].sort((a, b) => a - b));
        expect(new Set(seen)).toContain(3);
    });

    it('fails a rejected row alone and continues', async () => {
        const sink = new FakeSink();
        sink.rejectTitles.add('t2');
        const report = jobReport((await runImport(sink, job(3), { batchSize: 10 })).job);
        expect(report.confirmed).toBe(2);
        expect(report.failed).toBe(1);
        expect(report.failures.map((f) => f.line)).toEqual([3]);
        expect(report.failures[0].error).toBe('rejected t2');
    });

    it('keeps queued rows accepted and not confirmed', async () => {
        const sink = new FakeSink();
        sink.settlement = () => ({ kind: 'queued' });
        const report = jobReport((await runImport(sink, job(4))).job);
        expect(report.confirmed).toBe(0);
        expect(report.queued).toBe(4);
        expect(report.hasUnfinished).toBe(true);
    });

    it('reports a server side rejection with its reason', async () => {
        const sink = new FakeSink();
        sink.settlement = (h) => (h === 'h-t2' ? { kind: 'failed', reason: 'bad currency' } : { kind: 'confirmed' });
        const report = jobReport((await runImport(sink, job(3))).job);
        expect(report.confirmed).toBe(2);
        expect(report.failures[0].error).toBe('bad currency');
    });

    it('never accepts a confirmed or queued row again on resume', async () => {
        const sink = new FakeSink();
        sink.settlement = () => ({ kind: 'queued' });
        const first = (await runImport(sink, job(5))).job;
        expect(sink.accepted).toHaveLength(5);
        sink.settlement = () => ({ kind: 'confirmed' });
        const second = (await runImport(sink, first)).job;
        expect(sink.accepted).toHaveLength(5);
        expect(jobReport(second).confirmed).toBe(5);
        expect(sink.settledCalls[sink.settledCalls.length - 1]).toHaveLength(5);
    });

    it('aborts on consecutive failures and leaves the rest pending and resumable', async () => {
        const sink = new FakeSink();
        ['t1', 't2', 't3'].forEach((t) => sink.rejectTitles.add(t));
        const first = await runImport(sink, job(8), { batchSize: 2, maxConsecutiveFailures: 3 });
        expect(first.abort).toBe('TOO_MANY_FAILURES');
        const rep = jobReport(first.job);
        expect(rep.failed).toBe(3);
        expect(rep.notAttempted).toBe(5);
        sink.rejectTitles.clear();
        const resumed = await runImport(sink, withFailedRetried(first.job), {
            batchSize: 2, maxConsecutiveFailures: 3,
        });
        expect(resumed.abort).toBeNull();
        expect(jobReport(resumed.job).confirmed).toBe(8);
        expect(sink.accepted).toHaveLength(8);
    });

    it('resets the consecutive failure counter on success', async () => {
        const sink = new FakeSink();
        ['t1', 't2', 't4', 't5'].forEach((t) => sink.rejectTitles.add(t));
        const r = await runImport(sink, job(6), { maxConsecutiveFailures: 3 });
        expect(r.abort).toBeNull();
        expect(jobReport(r.job).failed).toBe(4);
    });

    it('aborts immediately on a session change without settling', async () => {
        const sink = new FakeSink();
        sink.throwOn = 't3';
        sink.thrown = new ImportSessionChanged();
        const r = await runImport(sink, job(5), { batchSize: 10 });
        expect(r.abort).toBe('SESSION_CHANGED');
        expect(r.job.rows.filter((row) => row.state === 'ACCEPTED')).toHaveLength(2);
        expect(jobReport(r.job).notAttempted).toBe(3);
        expect(sink.settledCalls).toEqual([]);
    });

    it('fails only the row on an unexpected exception', async () => {
        const sink = new FakeSink();
        sink.throwOn = 't2';
        const report = jobReport((await runImport(sink, job(3))).job);
        expect(report.confirmed).toBe(2);
        expect(report.failures[0].error).toBe('boom');
    });

    it('does not retry rows that failed after being queued', async () => {
        const sink = new FakeSink();
        sink.settlement = () => ({ kind: 'failed', reason: 'rejected by server' });
        const first = (await runImport(sink, job(2))).job;
        const retried = withFailedRetried(first);
        expect(retried.rows.filter((r) => r.state === 'FAILED')).toHaveLength(2);
        await runImport(sink, retried);
        expect(sink.accepted).toHaveLength(2);
    });

    it('keeps rows queued when settling fails', async () => {
        const sink: ImportSink = {
            accept: async (d) => ({ kind: 'accepted', handle: `h-${d.title}` }),
            settle: async () => {
                throw new Error('offline');
            },
        };
        const report = jobReport((await runImport(sink, job(3))).job);
        expect(report.queued).toBe(3);
        expect(report.failed).toBe(0);
    });

    it('is a no-op for an empty job', async () => {
        const sink = new FakeSink();
        const r = await runImport(sink, { rows: [] });
        expect(r.abort).toBeNull();
        expect(sink.settledCalls).toEqual([]);
    });

    it('propagates cancellation', async () => {
        const sink = new FakeSink();
        sink.throwOn = 't2';
        sink.thrown = new ImportCancelled();
        await expect(runImport(sink, job(3))).rejects.toBeInstanceOf(ImportCancelled);
    });

    it('stops with a cancellation when asked to between rows', async () => {
        const sink = new FakeSink();
        let calls = 0;
        await expect(
            runImport(sink, job(5), { isCancelled: () => ++calls > 2 }),
        ).rejects.toBeInstanceOf(ImportCancelled);
        expect(sink.accepted).toHaveLength(2);
    });
});

describe('ambiguous outcomes', () => {
    class UnknownSink extends FakeSink {
        unknownTitles = new Set<string>();
        async accept(d: ExpenseDraft): Promise<AcceptResult> {
            if (this.unknownTitles.has(d.title)) {
                return { kind: 'unknown', reason: 'timeout' };
            }
            return super.accept(d);
        }
    }

    const run = async () => {
        const sink = new UnknownSink();
        sink.unknownTitles.add('t2');
        sink.rejectTitles.add('t3');
        const result = await runImport(sink, job(3), { maxConsecutiveFailures: 100 });
        return result.job;
    };

    it('records an unknown outcome as a failure flagged ambiguous', async () => {
        const done = await run();
        expect(done.rows[1]).toMatchObject({ state: 'FAILED', error: 'timeout', ambiguous: true });
        expect(done.rows[2].ambiguous).toBeUndefined();
        const report = jobReport(done);
        expect(report.failed).toBe(2);
        expect(report.failures.find((f) => f.line === 3)?.ambiguous).toBe(true);
    });

    it('never auto-retries ambiguous rows without a duplicate lookup', async () => {
        const retried = withFailedRetried(await run());
        expect(retried.rows[1].state).toBe('FAILED');
        expect(retried.rows[2].state).toBe('PENDING');
    });

    it('confirms ambiguous rows already present remotely and re-queues absent ones', async () => {
        const done = await run();
        const present = withFailedRetried(done, [
            { date: '2026-05-01T10:00:00Z', cost: 2, title: ' T2 ', currency: 'mxn' },
        ]);
        expect(present.rows[1].state).toBe('CONFIRMED');
        const absent = withFailedRetried(done, []);
        expect(absent.rows[1]).toMatchObject({ state: 'PENDING', error: null });
        expect(absent.rows[1].ambiguous).toBeUndefined();
    });

    it('reports the date range of ambiguous rows', async () => {
        expect(ambiguousDateRange(await run())).toEqual(['2026-05-01', '2026-05-01']);
        expect(ambiguousDateRange(job(2))).toBeNull();
    });
});
