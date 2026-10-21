import { validateRow } from '../../../src/modules/csvImport/csvRowValidator';
import { CSV_IMPORT_LIMITS } from '../../../src/modules/csvImport/csvTypes';
import type { ColumnMapping, ImportOptions } from '../../../src/modules/csvImport/csvTypes';

const opts: ImportOptions = {
    decimal: 'DOT',
    dateOrder: 'YMD',
    sign: 'POSITIVE_IS_EXPENSE',
    defaultCurrency: 'MXN',
    defaultCategoryId: 'cat-default',
    defaultPaymentMethod: 'CASH',
    categories: [
        { id: 'cat-1', name: 'Groceries' },
        { id: 'cat-2', name: 'Comida' },
    ],
    today: '2026-06-01',
    fallbackTitle: 'Imported expense',
};
const full: ColumnMapping = {
    date: 0, title: 1, amount: 2, currency: 3, category: 4, note: 5, merchant: 6,
};
const validate = (cells: string[], mapping: ColumnMapping = full, o: ImportOptions = opts) =>
    validateRow(7, cells, mapping, o);
const row = (...cells: string[]) => ['2026-05-10', ...cells];

describe('validateRow', () => {
    it('builds a draft for a valid row', () => {
        const r = validate(['2026-05-10', 'Coffee', '3.50', 'usd', 'groceries', 'latte', 'Cafe Uno']);
        expect(r.status).toBe('VALID');
        expect(r.issues).toEqual([]);
        expect(r.draft).toEqual({
            title: 'Coffee',
            cost: 3.5,
            currency: 'USD',
            date: '2026-05-10',
            merchantName: 'Cafe Uno',
            note: 'latte',
            paymentMethod: 'CASH',
            categoryId: 'cat-1',
        });
        expect(r.line).toBe(7);
    });

    it('flags a missing date as an error', () => {
        const r = validate(['', 'Coffee', '3.50', '', '', '', '']);
        expect(r.status).toBe('ERROR');
        expect(r.issues).toEqual(['MISSING_DATE']);
        expect(r.draft).toBeNull();
    });

    it('flags unparseable date, amount and zero as errors', () => {
        expect(validate(['nope', 'x', '3', '', '', '', '']).issues).toEqual(['INVALID_DATE']);
        expect(validate(row('x', 'abc', '', '', '', '')).issues).toEqual(['INVALID_AMOUNT']);
        expect(validate(row('x', '', '', '', '', '')).issues).toEqual(['MISSING_AMOUNT']);
        expect(validate(row('x', '0.00', '', '', '', '')).issues).toEqual(['ZERO_AMOUNT']);
        expect(validate(row('x', '0.004', '', '', '', '')).issues).toEqual(['ZERO_AMOUNT']);
    });

    it('rejects amounts above the app maximum', () => {
        expect(validate(row('x', '10000000', '', '', '', '')).issues).toEqual(['AMOUNT_TOO_LARGE']);
        expect(validate(row('x', '9999999.99', '', '', '', '')).status).toBe('VALID');
    });

    it('rounds the amount to cents', () => {
        expect(validate(row('x', '1.2449', '', '', '', '')).draft?.cost).toBe(1.24);
    });

    it('uses the default currency silently when blank and warns when invalid', () => {
        const blank = validate(row('x', '3', '', '', '', ''));
        expect(blank.draft?.currency).toBe('MXN');
        expect(blank.status).toBe('VALID');
        const bad = validate(row('x', '3', '$', '', '', ''));
        expect(bad.draft?.currency).toBe('MXN');
        expect(bad.issues).toEqual(['INVALID_CURRENCY']);
        expect(bad.status).toBe('WARNING');
        expect(validate(row('x', '3', 'PESOS', '', '', '')).issues).toEqual(['INVALID_CURRENCY']);
    });

    it('falls back to the default category with a warning only when unknown', () => {
        const unknown = validate(row('x', '3', '', 'Nope', '', ''));
        expect(unknown.draft?.categoryId).toBe('cat-default');
        expect(unknown.issues).toEqual(['UNKNOWN_CATEGORY']);
        const blank = validate(row('x', '3', '', '', '', ''));
        expect(blank.draft?.categoryId).toBe('cat-default');
        expect(blank.status).toBe('VALID');
    });

    it('matches categories ignoring case and accents', () => {
        expect(validate(row('x', '3', '', '  COMIDA ', '', '')).draft?.categoryId).toBe('cat-2');
        const accented = { ...opts, categories: [{ id: 'c9', name: 'Educación' }] };
        expect(validate(row('x', '3', '', 'educacion', '', ''), full, accented).draft?.categoryId).toBe('c9');
    });

    it('uses the merchant then the fallback when the title is missing', () => {
        const byMerchant = validate(row('', '3', '', '', '', 'Cafe Uno'));
        expect(byMerchant.draft?.title).toBe('Cafe Uno');
        expect(byMerchant.issues).toEqual(['MISSING_TITLE']);
        expect(validate(row('', '3', '', '', '', '')).draft?.title).toBe('Imported expense');
    });

    it('warns about future dates', () => {
        const r = validate(['2026-07-01', 'x', '3', '', '', '', '']);
        expect(r.status).toBe('WARNING');
        expect(r.issues).toEqual(['FUTURE_DATE']);
        expect(r.draft).not.toBeNull();
    });

    it('sanitizes and caps strings with a warning', () => {
        const r = validate(row('A‮bc' + 'x'.repeat(300), '3', '', '', 'n'.repeat(900), ''));
        expect(r.draft?.title).toHaveLength(CSV_IMPORT_LIMITS.MAX_TITLE);
        expect(r.draft?.title).not.toContain('‮');
        expect(r.draft?.note).toHaveLength(CSV_IMPORT_LIMITS.MAX_NOTE);
        expect(r.issues).toContain('TEXT_TRUNCATED');
        expect(r.status).toBe('WARNING');
    });

    it('skips negative amounts as income when positive is expense', () => {
        const neg = validate(row('Refund', '-20', '', '', '', ''));
        expect(neg.status).toBe('SKIPPED_INCOME');
        expect(neg.draft).toBeNull();
        expect(validate(row('x', '20', '', '', '', '')).draft?.cost).toBe(20);
    });

    it('flips the sign with the negative-is-expense convention', () => {
        const o: ImportOptions = { ...opts, sign: 'NEGATIVE_IS_EXPENSE' };
        expect(validate(row('x', '-20', '', '', '', ''), full, o).draft?.cost).toBe(20);
        expect(validate(row('x', '20', '', '', '', ''), full, o).status).toBe('SKIPPED_INCOME');
        expect(validate(row('x', '(20.00)', '', '', '', ''), full, o).draft?.cost).toBe(20);
    });

    it('handles debit and credit columns', () => {
        const m: ColumnMapping = { date: 0, title: 1, debit: 2, credit: 3 };
        expect(validate(['2026-05-10', 'Rent', '500.00', ''], m).draft?.cost).toBe(500);
        expect(validate(['2026-05-10', 'Salary', '', '900'], m).status).toBe('SKIPPED_INCOME');
        expect(validate(['2026-05-10', 'x', '', ''], m).issues).toEqual(['MISSING_AMOUNT']);
        expect(validate(['2026-05-10', 'Rent', '-500', ''], m).draft?.cost).toBe(500);
    });

    it('reads decimal comma and day first dates', () => {
        const o: ImportOptions = { ...opts, decimal: 'COMMA', dateOrder: 'DMY' };
        const r = validate(['10/05/2026', 'x', '1.234,56', '', '', '', ''], full, o);
        expect(r.draft?.cost).toBe(1234.56);
        expect(r.draft?.date).toBe('2026-05-10');
    });

    it('treats missing cells of a short row as blank', () => {
        expect(validate(['2026-05-10', 'x', '3']).status).toBe('VALID');
    });

    it('keeps a null default payment method', () => {
        const r = validate(row('x', '3', '', '', '', ''), full, { ...opts, defaultPaymentMethod: null });
        expect(r.draft?.paymentMethod).toBeNull();
    });
});
