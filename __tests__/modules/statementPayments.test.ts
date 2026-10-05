import {
    classifyPaymentHistory,
    generateIdempotencyKey,
    suggestedPaymentAmount,
    toPaidAtIso,
} from '../../src/modules/statements/statementPayments';
import { classifyStatementError } from '../../src/modules/statements/statementErrors';
import { normalizeStatementPayment, normalizeStatementPaymentMutation } from '../../src/modules/statements/statementNormalizer';
import { classifyStatementUploadError } from '../../src/modules/statements/statementFile';

const httpError = (status: number, data: unknown) => ({ response: { status, data } });

describe('payments helpers', () => {
    it('classifies history states', () => {
        const mk = (id: string, extra: object = {}) => normalizeStatementPayment({ id, amount: 1, ...extra });
        const states = classifyPaymentHistory([
            mk('new', { supersedesId: 'old' }),
            mk('old', { voidedAt: '2026-09-01T00:00:00.000Z' }),
            mk('gone', { voidedAt: '2026-09-02T00:00:00.000Z' }),
        ]);
        expect(states).toEqual({ new: 'active', old: 'corrected', gone: 'voided' });
    });

    it('generates v4 uuids', () => {
        const key = generateIdempotencyKey();
        expect(key).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
        expect(generateIdempotencyKey()).not.toBe(key);
    });

    it('uses the local calendar day, capped at UTC today', () => {
        const now = new Date(Date.UTC(2026, 8, 29, 3, 0));
        expect(toPaidAtIso(new Date(2026, 8, 28), now)).toBe('2026-09-28T12:00:00.000Z');
        expect(toPaidAtIso(new Date(2026, 8, 30), now)).toBe('2026-09-29T12:00:00.000Z');
    });

    it('suggests the remaining no-interest amount first', () => {
        const summary = normalizeStatementPaymentMutation({
            summary: { remainingNoInterest: '800', remainingStatement: '1000' },
        }).summary;
        expect(suggestedPaymentAmount(summary)).toBe(800);
        expect(suggestedPaymentAmount({ ...summary, remainingNoInterest: 0, remainingStatement: 0 })).toBeNull();
    });
});

describe('error classification', () => {
    it('detects the cycle conflict code on 409', () => {
        const err = httpError(409, { code: 'STATEMENT_CYCLE_CONFLICT', message: 'x' });
        expect(classifyStatementError(err).kind).toBe('cycleConflict');
        expect(classifyStatementUploadError(err).kind).toBe('cycleConflict');
        expect(classifyStatementUploadError(httpError(409, { message: 'dup' })).kind).toBe('duplicate');
    });

    it('maps backend validation messages', () => {
        const kind = (message: string, status = 400) => classifyStatementError(httpError(status, { message })).kind;
        expect(kind('Statement reconciliation must pass before confirmation')).toBe('reconciliation');
        expect(kind('All statement rows must be reviewed before confirmation')).toBe('pendingRows');
        expect(kind('Every accounting adjustment requires a decision note')).toBe('adjustmentNote');
        expect(kind('Statement import version is stale', 409)).toBe('staleVersion');
        expect(kind('Statement payment version is stale', 409)).toBe('staleVersion');
        expect(kind('Statements with payment history cannot be deleted', 409)).toBe('hasPayments');
        expect(kind('Statement row 1 requires a category')).toBe('other');
        expect(classifyStatementError(new Error('x')).kind).toBe('network');
    });
});
