import { getErrorMessage } from '../../utils/platform/api';
import { duplicateKey } from './csvImportAnalyzer';
import {
    AbortReason,
    CSV_IMPORT_LIMITS,
    DayString,
    ExistingExpense,
    ImportCancelled,
    ImportJob,
    ImportProgress,
    ImportReport,
    ImportSessionChanged,
    ImportSink,
    JobRow,
    RunResult,
    Settlement,
} from './csvTypes';

export function createJob(items: Array<{ line: number; draft: JobRow['draft'] }>): ImportJob {
    return {
        rows: items.map(({ line, draft }) => ({
            line, draft, state: 'PENDING', handle: null, error: null,
        })),
    };
}

export function jobReport(job: ImportJob): ImportReport {
    const count = (state: JobRow['state']) => job.rows.filter((r) => r.state === state).length;
    const queued = count('ACCEPTED');
    const notAttempted = count('PENDING');
    return {
        total: job.rows.length,
        confirmed: count('CONFIRMED'),
        queued,
        failed: count('FAILED'),
        notAttempted,
        failures: job.rows
            .filter((r) => r.state === 'FAILED')
            .map((r) => ({
                line: r.line,
                title: r.draft.title,
                error: r.error,
                ...(r.ambiguous ? { ambiguous: true as const } : {}),
            })),
        hasUnfinished: queued > 0 || notAttempted > 0,
    };
}

/**
 * Failed rows that never reached the sink go back to pending; rows the sink already holds are never re-sent.
 * Ambiguous failures (no HTTP response) may already exist remotely, so they are only touched when `existing`
 * (a fresh lookup of the remote expenses) is given: rows found there are confirmed, absent ones are re-queued.
 */
export function withFailedRetried(job: ImportJob, existing?: ExistingExpense[]): ImportJob {
    const keys = existing
        ? new Set(existing.map((e) => duplicateKey(e.date.slice(0, 10), e.cost, e.title, e.currency)))
        : null;
    return {
        rows: job.rows.map((r) => {
            if (r.state !== 'FAILED' || r.handle !== null) {
                return r;
            }
            if (!r.ambiguous) {
                return { ...r, state: 'PENDING', error: null };
            }
            if (!keys) {
                return r;
            }
            const rest: JobRow = { ...r };
            delete rest.ambiguous;
            const landed = keys.has(duplicateKey(r.draft.date, r.draft.cost, r.draft.title, r.draft.currency));
            return landed
                ? { ...rest, state: 'CONFIRMED', error: null }
                : { ...rest, state: 'PENDING', error: null };
        }),
    };
}

/** First and last day among the ambiguous failures; null when there are none. */
export function ambiguousDateRange(job: ImportJob): [DayString, DayString] | null {
    const days = job.rows
        .filter((r) => r.state === 'FAILED' && r.ambiguous)
        .map((r) => r.draft.date)
        .sort();
    return days.length > 0 ? [days[0], days[days.length - 1]] : null;
}

export type RunOptions = {
    batchSize?: number;
    maxConsecutiveFailures?: number;
    onProgress?: (job: ImportJob, progress: ImportProgress) => void;
    /** Checked before every row; when it returns true the run stops with {@link ImportCancelled}. */
    isCancelled?: () => boolean;
};

/**
 * Pushes the pending rows of a job into an {@link ImportSink} in batches, then asks the sink which accepted rows
 * are confirmed. A row is only ever sent once: it leaves PENDING as ACCEPTED (the sink holds it) or FAILED, and a
 * run that is interrupted or resumed continues with what is still PENDING.
 */
export async function runImport(
    sink: ImportSink,
    job: ImportJob,
    options: RunOptions = {},
): Promise<RunResult> {
    const batchSize = Math.max(options.batchSize ?? CSV_IMPORT_LIMITS.BATCH_SIZE, 1);
    const maxFailures = options.maxConsecutiveFailures ?? CSV_IMPORT_LIMITS.MAX_CONSECUTIVE_FAILURES;
    const onProgress = options.onProgress ?? (() => undefined);
    const rows: JobRow[] = job.rows.map((r) => ({ ...r }));
    const total = rows.length;
    const snapshot = (): ImportJob => ({ rows: rows.map((r) => ({ ...r })) });
    const done = () => rows.filter((r) => r.state !== 'PENDING').length;

    const settle = async () => {
        const open = rows
            .map((r, index) => (r.state === 'ACCEPTED' && r.handle !== null ? index : -1))
            .filter((index) => index >= 0);
        if (open.length === 0) {
            return;
        }
        onProgress(snapshot(), { done: done(), total, settling: true });
        let settlements: Record<string, Settlement>;
        try {
            settlements = await sink.settle(open.map((index) => rows[index].handle as string));
        } catch (error) {
            if (error instanceof ImportCancelled) {
                throw error;
            }
            return; // rows stay ACCEPTED: they are held by the sink and can be settled later
        }
        for (const index of open) {
            const row = rows[index];
            const settlement = settlements[row.handle as string];
            if (settlement?.kind === 'confirmed') {
                rows[index] = { ...row, state: 'CONFIRMED' };
            } else if (settlement?.kind === 'failed') {
                rows[index] = { ...row, state: 'FAILED', error: settlement.reason };
            }
        }
        onProgress(snapshot(), { done: done(), total, settling: false });
    };

    let abort: AbortReason | null = null;
    let consecutiveFailures = 0;
    const pending = rows.map((r, i) => (r.state === 'PENDING' ? i : -1)).filter((i) => i >= 0);

    for (let start = 0; start < pending.length; start += batchSize) {
        for (const index of pending.slice(start, start + batchSize)) {
            if (options.isCancelled?.()) {
                throw new ImportCancelled();
            }
            const row = rows[index];
            try {
                const result = await sink.accept(row.draft);
                if (result.kind === 'accepted') {
                    rows[index] = { ...row, state: 'ACCEPTED', handle: result.handle, error: null };
                    consecutiveFailures = 0;
                } else if (result.kind === 'unknown') {
                    rows[index] = { ...row, state: 'FAILED', error: result.reason, ambiguous: true };
                    consecutiveFailures++;
                } else {
                    rows[index] = { ...row, state: 'FAILED', error: result.reason };
                    consecutiveFailures++;
                }
            } catch (error) {
                if (error instanceof ImportSessionChanged) {
                    abort = 'SESSION_CHANGED';
                    break;
                }
                if (error instanceof ImportCancelled) {
                    throw error;
                }
                rows[index] = { ...row, state: 'FAILED', error: getErrorMessage(error) };
                consecutiveFailures++;
            }
            onProgress(snapshot(), { done: done(), total, settling: false });
            if (consecutiveFailures >= maxFailures) {
                abort = 'TOO_MANY_FAILURES';
                break;
            }
        }
        if (abort) {
            break;
        }
        await settle();
    }
    if (abort !== 'SESSION_CHANGED') {
        await settle();
    }
    return { job: snapshot(), abort };
}
