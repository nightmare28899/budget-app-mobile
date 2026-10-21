import { detectDecimal, parseCsvNumber } from '../../../src/modules/csvImport/csvNumbers';

const dot = (s: string) => parseCsvNumber(s, 'DOT');
const comma = (s: string) => parseCsvNumber(s, 'COMMA');

describe('parseCsvNumber', () => {
    it('parses plain and grouped numbers with a dot decimal', () => {
        expect(dot('1,234.56')).toBe(1234.56);
        expect(dot('1,234,567.5')).toBe(1234567.5);
        expect(dot('12')).toBe(12);
        expect(dot('.5')).toBe(0.5);
    });

    it('parses grouped numbers with a comma decimal', () => {
        expect(comma('1.234,56')).toBe(1234.56);
        expect(comma('12,5')).toBe(12.5);
        expect(comma('1.234')).toBe(1234);
    });

    it('accepts space, apostrophe and nbsp grouping', () => {
        expect(comma('1 234,56')).toBe(1234.56);
        expect(dot("1'234.56")).toBe(1234.56);
        expect(dot('1 234.56')).toBe(1234.56);
        expect(dot('1 234.56')).toBe(1234.56);
    });

    it('strips currency symbols and codes', () => {
        expect(dot('$1,234.56')).toBe(1234.56);
        expect(dot('€ 99')).toBe(99);
        expect(dot('MXN 10.50')).toBe(10.5);
        expect(dot('10.50 USD')).toBe(10.5);
    });

    it('reads negatives in every notation', () => {
        expect(dot('-5')).toBe(-5);
        expect(dot('(5.00)')).toBe(-5);
        expect(dot('($5.00)')).toBe(-5);
        expect(dot('5.00-')).toBe(-5);
        expect(dot('−5.00')).toBe(-5);
        expect(dot('$-5.00')).toBe(-5);
    });

    it('accepts a leading plus', () => {
        expect(dot('+5.00')).toBe(5);
    });

    it('returns null for garbage', () => {
        for (const bad of ['', '   ', 'abc', '1.2.3', '--5', '12abc34', 'NaN', 'Infinity', '1e5']) {
            expect(dot(bad)).toBeNull();
        }
    });

    it('keeps huge values finite or null', () => {
        const value = dot('9'.repeat(400));
        expect(value === null || Number.isFinite(value)).toBe(true);
    });
});

describe('detectDecimal', () => {
    it('detects dot when both separators are present', () => {
        expect(detectDecimal(['1,234.56', '10.00'])).toEqual({ separator: 'DOT', ambiguous: false });
    });

    it('detects comma when both separators are present', () => {
        expect(detectDecimal(['1.234,56', '10,00'])).toEqual({ separator: 'COMMA', ambiguous: false });
    });

    it('detects comma from one or two digits after it', () => {
        expect(detectDecimal(['12,5', '7,25']).separator).toBe('COMMA');
    });

    it('treats a repeated single separator as grouping', () => {
        expect(detectDecimal(['1,234,567']).separator).toBe('DOT');
        expect(detectDecimal(['1.234.567']).separator).toBe('COMMA');
    });

    it('flags three digits after a single separator as ambiguous', () => {
        expect(detectDecimal(['1,234', '2,500'])).toEqual({ separator: 'DOT', ambiguous: true });
    });

    it('lets an unambiguous sample resolve the ambiguous ones', () => {
        expect(detectDecimal(['1,234', '12,50'])).toEqual({ separator: 'COMMA', ambiguous: false });
    });

    it('defaults to dot without ambiguity when there are no separators', () => {
        expect(detectDecimal(['10', '200'])).toEqual({ separator: 'DOT', ambiguous: false });
    });

    it('flags conflicting evidence', () => {
        expect(detectDecimal(['1,234.56', '1.234,56', '9.99']).ambiguous).toBe(true);
    });
});
