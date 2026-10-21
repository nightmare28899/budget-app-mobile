import { detectDateOrder, parseCsvDate } from '../../../src/modules/csvImport/csvDates';

const JAN_15 = '2024-01-15';

describe('parseCsvDate', () => {
    it('reads iso and year first variants', () => {
        expect(parseCsvDate('2024-01-15', 'DMY')).toBe(JAN_15);
        expect(parseCsvDate('2024/01/15', 'MDY')).toBe(JAN_15);
        expect(parseCsvDate('2024.1.15', 'DMY')).toBe(JAN_15);
        expect(parseCsvDate('20240115', 'DMY')).toBe(JAN_15);
    });

    it('reads the date literally when a time or zone follows', () => {
        expect(parseCsvDate('2024-01-15T23:30:00Z', 'DMY')).toBe(JAN_15);
        expect(parseCsvDate('2024-01-15 08:00:00', 'DMY')).toBe(JAN_15);
        expect(parseCsvDate('15/01/2024 14:05', 'DMY')).toBe(JAN_15);
    });

    it('supports day first and month first', () => {
        expect(parseCsvDate('15/01/2024', 'DMY')).toBe(JAN_15);
        expect(parseCsvDate('15-01-2024', 'DMY')).toBe(JAN_15);
        expect(parseCsvDate('15.01.2024', 'DMY')).toBe(JAN_15);
        expect(parseCsvDate('01/15/2024', 'MDY')).toBe(JAN_15);
        expect(parseCsvDate('01/02/2024', 'DMY')).toBe('2024-02-01');
        expect(parseCsvDate('01/02/2024', 'MDY')).toBe('2024-01-02');
    });

    it('expands two digit years', () => {
        expect(parseCsvDate('15/01/24', 'DMY')).toBe('2024-01-15');
        expect(parseCsvDate('31/12/99', 'DMY')).toBe('1999-12-31');
    });

    it('reads month names in english and spanish', () => {
        expect(parseCsvDate('15 Jan 2024', 'DMY')).toBe(JAN_15);
        expect(parseCsvDate('Jan 15, 2024', 'DMY')).toBe(JAN_15);
        expect(parseCsvDate('15-ene-2024', 'DMY')).toBe(JAN_15);
        expect(parseCsvDate('15 de enero de 2024', 'DMY')).toBe(JAN_15);
        expect(parseCsvDate('5 sep 2024', 'DMY')).toBe('2024-09-05');
        expect(parseCsvDate('5 Agosto 2024', 'DMY')).toBe('2024-08-05');
    });

    it('returns null for invalid dates', () => {
        expect(parseCsvDate('', 'DMY')).toBeNull();
        expect(parseCsvDate('31/02/2024', 'DMY')).toBeNull();
        expect(parseCsvDate('13/13/2024', 'DMY')).toBeNull();
        expect(parseCsvDate('2024-13-01', 'DMY')).toBeNull();
        expect(parseCsvDate('hello', 'DMY')).toBeNull();
        expect(parseCsvDate('15/01', 'DMY')).toBeNull();
        expect(parseCsvDate('0000-01-01', 'DMY')).toBeNull();
    });

    it('accepts leap days only in leap years', () => {
        expect(parseCsvDate('29/02/2024', 'DMY')).toBe('2024-02-29');
        expect(parseCsvDate('29/02/2023', 'DMY')).toBeNull();
    });
});

describe('detectDateOrder', () => {
    it('detects year first as unambiguous', () => {
        expect(detectDateOrder(['2024-01-02', '2024-03-04'])).toEqual({ order: 'YMD', ambiguous: false });
    });

    it('detects day first from a day above twelve', () => {
        expect(detectDateOrder(['01/02/2024', '15/02/2024'])).toEqual({ order: 'DMY', ambiguous: false });
    });

    it('detects month first from a second field above twelve', () => {
        expect(detectDateOrder(['01/02/2024', '02/15/2024'])).toEqual({ order: 'MDY', ambiguous: false });
    });

    it('falls back to the preferred order and flags all-ambiguous samples', () => {
        expect(detectDateOrder(['01/02/2024', '03/04/2024'], 'MDY')).toEqual({ order: 'MDY', ambiguous: true });
        expect(detectDateOrder(['01/02/2024']).order).toBe('DMY');
    });

    it('does not flag textual months as ambiguous', () => {
        expect(detectDateOrder(['15 Jan 2024', '3 Feb 2024']).ambiguous).toBe(false);
    });

    it('ignores blank samples', () => {
        expect(detectDateOrder(['', '2024-01-02']).order).toBe('YMD');
    });
});
