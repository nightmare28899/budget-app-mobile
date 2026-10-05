declare const process: { env: Record<string, string | undefined> };
process.env.TZ = 'America/Mexico_City';

import {
    parseDateOnly,
    toDateOnlyNoonUtcIso,
    toLocalDateString,
} from '../../src/utils/core/dateOnly';
import { dateOnly } from '../../src/utils/core/filters';

describe('dateOnly helpers (America/Mexico_City)', () => {
    it('runs in the expected timezone', () => {
        expect(new Date(2026, 0, 1, 12).getTimezoneOffset()).toBe(360);
    });

    it('keeps the local day in the evening (UTC already next day)', () => {
        const evening = new Date(2026, 9, 4, 20, 30);
        expect(evening.toISOString().slice(0, 10)).toBe('2026-10-05');
        expect(toLocalDateString(evening)).toBe('2026-10-04');
        expect(dateOnly(evening)).toBe('2026-10-04');
    });

    it('handles month and year boundaries', () => {
        expect(toLocalDateString(new Date(2026, 9, 31, 23, 59))).toBe('2026-10-31');
        expect(toLocalDateString(new Date(2026, 11, 31, 23, 30))).toBe('2026-12-31');
        expect(toLocalDateString(new Date(2027, 0, 1, 0, 5))).toBe('2027-01-01');
        expect(toLocalDateString(new Date(2028, 1, 29, 22, 0))).toBe('2028-02-29');
    });

    it('parses date-only strings on the same local day', () => {
        const parsed = parseDateOnly('2026-10-04');
        expect(parsed).not.toBeNull();
        expect(parsed!.getFullYear()).toBe(2026);
        expect(parsed!.getMonth()).toBe(9);
        expect(parsed!.getDate()).toBe(4);
        expect(parsed!.getHours()).toBe(12);
        expect(toLocalDateString(parsed!)).toBe('2026-10-04');
        expect(new Date('2026-10-04').getDate()).toBe(3); // the bug being avoided
    });

    it('parses boundaries and ISO prefixes, rejects invalid days', () => {
        expect(toLocalDateString(parseDateOnly('2026-12-31')!)).toBe('2026-12-31');
        expect(toLocalDateString(parseDateOnly('2027-01-01')!)).toBe('2027-01-01');
        expect(toLocalDateString(parseDateOnly('2026-10-04T12:00:00.000Z')!)).toBe('2026-10-04');
        expect(parseDateOnly('2026-02-31')).toBeNull();
        expect(parseDateOnly('nope')).toBeNull();
    });

    it('round-trips through the noon-UTC wire format', () => {
        const evening = new Date(2026, 9, 4, 20, 30);
        const wire = toDateOnlyNoonUtcIso(evening);
        expect(wire).toBe('2026-10-04T12:00:00.000Z');
        expect(dateOnly(wire)).toBe('2026-10-04');
    });

    it('dateOnly keeps the calendar part of date strings untouched', () => {
        expect(dateOnly('2026-10-04')).toBe('2026-10-04');
        expect(dateOnly('2026-10-04T23:59:59.000Z')).toBe('2026-10-04');
        expect(dateOnly('garbage')).toBe('');
    });
});
