import {
    buildCycleTimeline,
    cycleFraction,
    inferToday,
    previousClosing,
} from '../../src/modules/creditCards/cycleTimeline';

const d = (y: number, m: number, day: number) => new Date(y, m - 1, day, 12);

describe('previousClosing', () => {
    it('is the same day one month earlier', () => {
        expect(previousClosing(d(2026, 10, 15), 15)).toEqual(d(2026, 9, 15));
    });

    it('closing day 31 lands on the last day of a short month', () => {
        expect(previousClosing(d(2026, 3, 31), 31)).toEqual(d(2026, 2, 28));
        expect(previousClosing(d(2026, 5, 31), 31)).toEqual(d(2026, 4, 30));
    });

    it('leap year february has 29 days', () => {
        expect(previousClosing(d(2028, 3, 31), 31)).toEqual(d(2028, 2, 29));
        expect(previousClosing(d(2028, 3, 29), 29)).toEqual(d(2028, 2, 29));
    });

    it('closing day 29 and 30 in a non leap february', () => {
        expect(previousClosing(d(2026, 3, 29), 29)).toEqual(d(2026, 2, 28));
        expect(previousClosing(d(2026, 3, 30), 30)).toEqual(d(2026, 2, 28));
    });

    it('a clamped closing returns to the real day the next month', () => {
        expect(previousClosing(d(2026, 2, 28), 31)).toEqual(d(2026, 1, 31));
    });

    it('december to january crosses the year', () => {
        expect(previousClosing(d(2026, 1, 15), 15)).toEqual(d(2025, 12, 15));
    });

    it('without a closing day it uses the day of the next closing', () => {
        expect(previousClosing(d(2026, 10, 12), null)).toEqual(d(2026, 9, 12));
        expect(previousClosing(d(2026, 10, 12), 0)).toEqual(d(2026, 9, 12));
        expect(previousClosing(d(2026, 10, 12), 40)).toEqual(d(2026, 9, 12));
    });
});

describe('buildCycleTimeline', () => {
    it('positions today, closing and due on the track', () => {
        const t = buildCycleTimeline(d(2026, 10, 5), d(2026, 10, 15), d(2026, 11, 4), 15)!;
        expect(t.start).toEqual(d(2026, 9, 15));
        expect(t.end).toEqual(d(2026, 11, 4));
        // 50 days long: today is 20 days in, closing at 30 days
        expect(t.todayFraction).toBeCloseTo(20 / 50, 4);
        expect(t.closingFraction).toBeCloseTo(30 / 50, 4);
        expect(t.dueFraction).toBe(1);
    });

    it('ends the track at the closing without a due date', () => {
        const t = buildCycleTimeline(d(2026, 10, 5), d(2026, 10, 15), null, 15)!;
        expect(t.closingFraction).toBe(1);
        expect(t.dueFraction).toBeNull();
    });

    it('has no timeline without a closing date', () => {
        expect(buildCycleTimeline(d(2026, 10, 5), null, d(2026, 11, 4), 15)).toBeNull();
    });

    it('clamps today to the track', () => {
        expect(buildCycleTimeline(d(2026, 8, 1), d(2026, 10, 15), d(2026, 11, 4), 15)!.todayFraction).toBe(0);
        expect(buildCycleTimeline(d(2027, 1, 1), d(2026, 10, 15), d(2026, 11, 4), 15)!.todayFraction).toBe(1);
    });

    it('keeps the closing as the track end when the due date is before it', () => {
        const t = buildCycleTimeline(d(2026, 10, 20), d(2026, 11, 15), d(2026, 11, 5), 15)!;
        expect(t.end).toEqual(d(2026, 11, 15));
        expect(t.closingFraction).toBe(1);
        expect(t.dueFraction!).toBeLessThan(1);
    });

    it('never divides by zero', () => {
        const t = buildCycleTimeline(d(2026, 10, 15), d(2026, 10, 15), null, null)!;
        expect(t.todayFraction).toBeGreaterThanOrEqual(0);
        expect(t.todayFraction).toBeLessThanOrEqual(1);
        expect(cycleFraction(d(2026, 10, 15), d(2026, 10, 15), d(2026, 10, 15))).toBe(0);
    });
});

describe('inferToday', () => {
    it('is inferred from the server countdowns', () => {
        expect(inferToday(d(2026, 10, 15), 3, d(2026, 11, 4), 23, d(2000, 1, 1))).toEqual(d(2026, 10, 12));
        expect(inferToday(null, null, d(2026, 11, 4), 23, d(2000, 1, 1))).toEqual(d(2026, 10, 12));
        expect(inferToday(null, null, null, null, d(2000, 1, 1))).toEqual(d(2000, 1, 1));
    });
});
