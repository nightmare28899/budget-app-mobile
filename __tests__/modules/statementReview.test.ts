import type { StatementRow } from '../../src/types/statementImports';
import { normalizeStatementDetail, normalizeStatementRow } from '../../src/modules/statements/statementNormalizer';
import {
    applyRowDraft,
    buildRowPatches,
    canIncludeAsExpense,
    computeConfirmBlockers,
    filterStatementRows,
    hasAccountingAdjustment,
    mergeRowDraft,
    parseMoneyInput,
    toRowDateIso,
} from '../../src/modules/statements/statementReview';

const baseRow = (overrides: Partial<StatementRow> = {}): StatementRow =>
    normalizeStatementRow({
        id: 'r1',
        section: 'CURRENT_CHARGES',
        position: 1,
        transactionDate: '2026-08-20T12:00:00.000Z',
        parsedTransactionDate: '2026-08-20T12:00:00.000Z',
        description: 'OXXO',
        amount: '100.00',
        parsedAmount: '100.00',
        currency: 'MXN',
        parsedCurrency: 'MXN',
        kind: 'CHARGE',
        parsedKind: 'CHARGE',
        decision: 'PENDING',
        ...overrides,
    });

describe('normalizeStatementRow', () => {
    it('parses decimal strings and nested relations', () => {
        const row = normalizeStatementRow({
            id: 'r',
            amount: '1234.50',
            parsedAmount: '1000.00',
            decision: 'INFO_ONLY',
            matchedExpenseId: 'e1',
            matchedExpense: { id: 'e1', title: 'Coffee', cost: '1234.50', date: '2026-08-20T00:00:00.000Z' },
            category: { id: 'c1', name: 'Food' },
            warningCodes: ['MATCHES_REGISTERED_EXPENSE', 7],
            isAdjusted: true,
        });
        expect(row.amount).toBe(1234.5);
        expect(row.parsedAmount).toBe(1000);
        expect(row.matchedExpense?.cost).toBe(1234.5);
        expect(row.category?.name).toBe('Food');
        expect(row.warningCodes).toEqual(['MATCHES_REGISTERED_EXPENSE']);
        expect(row.isAdjusted).toBe(true);
    });

    it('falls back on unknown enums', () => {
        const row = normalizeStatementRow({ id: 'r', decision: 'X', kind: 'Y', section: 'Z' });
        expect(row.decision).toBe('PENDING');
        expect(row.kind).toBe('UNKNOWN');
        expect(row.section).toBe('OTHER');
    });

    it('detail exposes rows, payment history and paymentVersion', () => {
        const detail = normalizeStatementDetail({
            id: 'i',
            paymentVersion: 3,
            rows: [{ id: 'r', warningCodes: ['A'] }],
            paymentHistory: [{ id: 'p', amount: '50.5', currency: 'MXN', paidAt: '2026-09-01T12:00:00.000Z' }],
        });
        expect(detail.paymentVersion).toBe(3);
        expect(detail.rows).toHaveLength(1);
        expect(detail.warningCodes).toEqual(['A']);
        expect(detail.paymentHistory[0].amount).toBe(50.5);
    });
});

describe('decision logic', () => {
    it('only charge-like non-CFDI rows can become expenses', () => {
        expect(canIncludeAsExpense(baseRow())).toBe(true);
        expect(canIncludeAsExpense(baseRow({ kind: 'PAYMENT' }))).toBe(false);
        expect(canIncludeAsExpense(baseRow({ section: 'CFDI' }))).toBe(false);
    });

    it('detects accounting adjustments by cents', () => {
        expect(hasAccountingAdjustment(baseRow())).toBe(false);
        expect(hasAccountingAdjustment(baseRow({ amount: 100.004 }))).toBe(false);
        expect(hasAccountingAdjustment(baseRow({ amount: 100.01 }))).toBe(true);
        expect(hasAccountingAdjustment(baseRow({ transactionDate: '2026-08-21T12:00:00.000Z' }))).toBe(true);
    });

    it('clearing a match by including drops it locally', () => {
        const row = baseRow({ decision: 'INFO_ONLY', matchedExpenseId: 'e1' });
        const merged = applyRowDraft(row, { decision: 'INCLUDE_EXPENSE' });
        expect(merged.matchedExpenseId).toBeNull();
        expect(applyRowDraft(row, { decision: 'INFO_ONLY' }).matchedExpenseId).toBe('e1');
    });

    it('mergeRowDraft drops no-op fields and empties', () => {
        const row = baseRow();
        let drafts = mergeRowDraft({}, row, { amount: 120, decision: 'INCLUDE_EXPENSE' });
        expect(drafts.r1).toEqual({ amount: 120, decision: 'INCLUDE_EXPENSE' });
        drafts = mergeRowDraft(drafts, row, { amount: 100 });
        expect(drafts.r1).toEqual({ decision: 'INCLUDE_EXPENSE' });
        drafts = mergeRowDraft(drafts, row, { decision: 'PENDING' });
        expect(drafts).toEqual({});
    });

    it('builds whitelisted patches without extra fields', () => {
        const patches = buildRowPatches({
            r1: { amount: 120.456, decisionNote: '  fix  ', categoryId: null },
        });
        expect(patches).toEqual([{ id: 'r1', amount: 120.46, decisionNote: 'fix', categoryId: null }]);
    });

    it('sends noon UTC for the local calendar day', () => {
        expect(toRowDateIso(new Date(2026, 8, 5, 23, 30))).toBe('2026-09-05T12:00:00.000Z');
    });
});

describe('computeConfirmBlockers', () => {
    it('lists every backend rejection reason', () => {
        const rows = [
            baseRow({ id: 'a' }),
            baseRow({ id: 'b', decision: 'INCLUDE_EXPENSE' }),
            baseRow({ id: 'c', decision: 'EXCLUDE', amount: 5 }),
        ];
        const codes = computeConfirmBlockers({
            rows,
            reconciliationPassed: false,
            hasDefaultCard: true,
            unsavedCount: 2,
        }).map(b => b.code);
        expect(codes).toEqual(['reconciliation', 'pending', 'invalidRows', 'unsaved']);
    });

    it('requires a note for adjusted rows and accepts matched-only imports', () => {
        const adjusted = baseRow({ decision: 'EXCLUDE', amount: 90, isAdjusted: true });
        const matched = baseRow({ id: 'm', decision: 'INFO_ONLY', matchedExpenseId: 'e' });
        const blockers = computeConfirmBlockers({
            rows: [adjusted, matched],
            reconciliationPassed: true,
            hasDefaultCard: true,
            unsavedCount: 0,
        });
        expect(blockers).toEqual([{ code: 'missingNotes', count: 1 }]);
    });
});

describe('filters and money input', () => {
    it('filters rows', () => {
        const rows = [baseRow({ id: 'a' }), baseRow({ id: 'b', decision: 'INCLUDE_EXPENSE', categoryId: 'c' })];
        expect(filterStatementRows(rows, 'PENDING').map(r => r.id)).toEqual(['a']);
        expect(filterStatementRows(rows, 'READY').map(r => r.id)).toEqual(['b']);
        expect(filterStatementRows(rows, 'MISSING_CATEGORY').map(r => r.id)).toEqual(['a']);
    });

    it('parses money safely', () => {
        expect(parseMoneyInput('1,234.50')).toBe(1234.5);
        expect(parseMoneyInput('1.234,50')).toBe(1234.5);
        expect(parseMoneyInput('12,5')).toBe(12.5);
        expect(parseMoneyInput('0')).toBeNull();
        expect(parseMoneyInput('1.234')).toBeNull();
        expect(parseMoneyInput('abc')).toBeNull();
    });
});
