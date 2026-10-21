import {
    analyzeCsv,
    countRows,
    dateRange,
    detectFormat,
    markDuplicates,
    selectForImport,
} from '../../../src/modules/csvImport/csvImportAnalyzer';
import { CSV_IMPORT_LIMITS } from '../../../src/modules/csvImport/csvTypes';
import type {
    ColumnMapping,
    CsvAnalysis,
    ExistingExpense,
    ImportOptions,
} from '../../../src/modules/csvImport/csvTypes';

const mapping: ColumnMapping = { date: 0, title: 1, amount: 2 };
const opts: ImportOptions = {
    decimal: 'DOT',
    dateOrder: 'YMD',
    sign: 'POSITIVE_IS_EXPENSE',
    defaultCurrency: 'MXN',
    defaultCategoryId: null,
    defaultPaymentMethod: null,
    categories: [],
    today: '2026-06-01',
    fallbackTitle: 'Imported expense',
};
const header = ['Date', 'Title', 'Amount'];

function analysisRows(records: string[][], hasHeader = true) {
    const result = analyzeCsv(records, hasHeader, mapping, opts);
    if (result.kind !== 'ok') {
        throw new Error(`expected ok, got ${result.kind}`);
    }
    return (result as { kind: 'ok'; analysis: CsvAnalysis }).analysis;
}

const existing = (over: Partial<ExistingExpense>): ExistingExpense => ({
    date: '2026-05-01', cost: 3.5, title: 'Coffee', currency: 'MXN', ...over,
});

describe('analyzeCsv', () => {
    it('counts every status and skips the header', () => {
        const a = analysisRows([
            header,
            ['2026-05-01', 'Coffee', '3.50'],
            ['2026-05-02', 'Refund', '-9'],
            ['bad', 'x', '1'],
            ['2026-07-01', 'Future', '2'],
        ]);
        expect(a.counts).toMatchObject({ total: 4, valid: 1, warning: 1, error: 1, skippedIncome: 1 });
        expect(a.counts.valid + a.counts.warning).toBe(2);
        expect(a.rows.map((r) => r.line)).toEqual([2, 3, 4, 5]);
    });

    it('treats every record as data without a header and starts lines at one', () => {
        const a = analysisRows([['2026-05-01', 'Coffee', '3']], false);
        expect(a.rows.map((r) => r.line)).toEqual([1]);
    });

    it('rejects more than the row limit', () => {
        const rows = Array.from({ length: CSV_IMPORT_LIMITS.MAX_ROWS + 1 }, () => ['2026-05-01', 'x', '1']);
        expect(analyzeCsv([header, ...rows], true, mapping, opts)).toEqual({
            kind: 'tooManyRows',
            rows: CSV_IMPORT_LIMITS.MAX_ROWS + 1,
        });
    });

    it('accepts exactly the row limit', () => {
        const rows = Array.from({ length: CSV_IMPORT_LIMITS.MAX_ROWS }, () => ['2026-05-01', 'x', '1']);
        expect(analyzeCsv([header, ...rows], true, mapping, opts).kind).toBe('ok');
    });

    it('reports empty data', () => {
        expect(analyzeCsv([header], true, mapping, opts)).toEqual({ kind: 'noRows' });
    });
});

describe('detectFormat', () => {
    it('picks decimal, date order and sign from the mapped columns', () => {
        const d = detectFormat([
            header,
            ['15/01/2026', 'A', '-1.234,56'],
            ['16/01/2026', 'B', '-10,00'],
            ['17/01/2026', 'C', '5,25'],
        ], true, mapping);
        expect(d.decimal.separator).toBe('COMMA');
        expect(d.date.order).toBe('DMY');
        expect(d.sign).toBe('NEGATIVE_IS_EXPENSE');
    });

    it('defaults to positive is expense', () => {
        const d = detectFormat([header, ['2026-01-01', 'A', '5'], ['2026-01-02', 'B', '7']], true, mapping);
        expect(d.sign).toBe('POSITIVE_IS_EXPENSE');
        expect(d.date.order).toBe('YMD');
    });
});

describe('markDuplicates', () => {
    it('matches on day, amount, title and currency ignoring case', () => {
        const rows = analysisRows([
            header,
            ['2026-05-01', 'Coffee', '3.50'],
            ['2026-05-01', 'Tea', '3.50'],
            ['2026-05-02', 'coffee ', '3.50'],
        ]).rows;
        const marked = markDuplicates(rows, [
            existing({ title: 'COFFEE' }),
            existing({ date: '2026-05-02', currency: 'USD', title: 'coffee' }),
        ]);
        expect(marked.map((r) => r.duplicate)).toEqual([true, false, false]);
    });

    it('does not treat rows repeated inside the file as duplicates of each other', () => {
        const rows = analysisRows([
            header,
            ['2026-05-01', 'Coffee', '3.50'],
            ['2026-05-01', 'Coffee', '3.50'],
        ]).rows;
        expect(markDuplicates(rows, []).every((r) => !r.duplicate)).toBe(true);
    });

    it('reads the day of an existing expense from its date value', () => {
        const rows = analysisRows([header, ['2026-05-01', 'Coffee', '3.50']]).rows;
        expect(markDuplicates(rows, [existing({ date: '2026-05-01T12:00:00' })])[0].duplicate).toBe(true);
        expect(markDuplicates(rows, [existing({ date: '2026-05-02T12:00:00' })])[0].duplicate).toBe(false);
    });

    it('only marks importable rows and ranges over them', () => {
        const rows = analysisRows([
            header,
            ['2026-05-10', 'A', '1'],
            ['2026-05-02', 'B', '2'],
            ['bad', 'C', '3'],
        ]).rows;
        expect(dateRange(rows)).toEqual(['2026-05-02', '2026-05-10']);
        expect(dateRange([])).toBeNull();
    });

    it('counts duplicates and selects rows for import on request', () => {
        const rows = analysisRows([
            header,
            ['2026-05-01', 'Coffee', '3.50'],
            ['2026-05-02', 'Tea', '2'],
        ]).rows;
        const marked = markDuplicates(rows, [existing({})]);
        expect(countRows(marked).duplicates).toBe(1);
        expect(selectForImport(marked, true)).toHaveLength(1);
        expect(selectForImport(marked, false)).toHaveLength(2);
    });
});
