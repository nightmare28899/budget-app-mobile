import { toNum } from '../../../src/utils/core/number';

describe('toNum', () => {
    let warn: jest.SpyInstance;
    beforeEach(() => {
        warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    });
    afterEach(() => warn.mockRestore());

    it('keeps valid inputs', () => {
        expect(toNum(12.5)).toBe(12.5);
        expect(toNum('12.50')).toBe(12.5);
        expect(toNum(' 7 ')).toBe(7);
        expect(toNum('-3.2')).toBe(-3.2);
        expect(toNum(0)).toBe(0);
        expect(warn).not.toHaveBeenCalled();
    });

    it('handles Prisma Decimal strings and objects', () => {
        expect(toNum('1234567.89')).toBe(1234567.89);
        expect(toNum({ toString: () => '99.99' })).toBe(99.99);
        expect(toNum('1e3')).toBe(1000);
    });

    it('returns 0 silently for empty values', () => {
        expect(toNum(null)).toBe(0);
        expect(toNum(undefined)).toBe(0);
        expect(toNum('')).toBe(0);
        expect(warn).not.toHaveBeenCalled();
    });

    it('returns 0 and warns in dev for malformed values', () => {
        expect(toNum('abc')).toBe(0);
        expect(toNum(NaN)).toBe(0);
        expect(toNum(Infinity)).toBe(0);
        expect(toNum({})).toBe(0);
        expect(warn).toHaveBeenCalledTimes(4);
    });
});
