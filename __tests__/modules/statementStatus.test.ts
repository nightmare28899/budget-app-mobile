import {
    STATEMENT_STATUS_FILTERS,
    statementStatusTone,
    toStatementImportStatus,
} from '../../src/modules/statements/statementStatus';

describe('statementStatus', () => {
    it('maps every backend status to a tone', () => {
        expect(statementStatusTone('NEEDS_REVIEW')).toBe('warning');
        expect(statementStatusTone('CONFIRMED')).toBe('success');
        expect(statementStatusTone('FAILED')).toBe('danger');
        expect(statementStatusTone('REVERTED')).toBe('neutral');
        expect(statementStatusTone('UPLOADED')).toBe('info');
        expect(statementStatusTone('PARSED')).toBe('info');
    });

    it('coerces unknown values to UPLOADED', () => {
        expect(toStatementImportStatus('CONFIRMED')).toBe('CONFIRMED');
        expect(toStatementImportStatus('nope')).toBe('UPLOADED');
        expect(toStatementImportStatus(undefined)).toBe('UPLOADED');
    });

    it('exposes filters with all first', () => {
        expect(STATEMENT_STATUS_FILTERS[0]).toBe('ALL');
        expect(STATEMENT_STATUS_FILTERS).toContain('NEEDS_REVIEW');
        expect(STATEMENT_STATUS_FILTERS).toHaveLength(7);
    });
});
