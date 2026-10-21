import {
    LEAD_OPTIONS,
    DEFAULT_LEAD_DAYS,
    NOTIFY_HOUR,
    ReminderEvent,
    dateOfReminderKey,
    nextNotifyTime,
    normalizeLead,
    notifyTimeOn,
    pruneReminderKeys,
    reminderBucket,
    reminderDestination,
    reminderKey,
} from '../../../src/modules/reminders';

describe('reminder keys', () => {
    it('are stable and carry the date', () => {
        const e: ReminderEvent = {
            kind: 'CARD_DUE',
            targetId: 'c1',
            title: 'Visa',
            date: '2026-02-10',
            amount: null,
            currency: null,
        };
        expect(reminderKey(e)).toBe('CARD_DUE|c1|2026-02-10');
        expect(dateOfReminderKey(reminderKey(e))).toBe('2026-02-10');
        expect(dateOfReminderKey('garbage')).toBeNull();
    });

    it('prune drops past keys and malformed ones', () => {
        const keys = new Set([
            'CARD_DUE|c1|2026-02-09',
            'CARD_DUE|c1|2026-02-10',
            'SUBSCRIPTION|s|2026-03-01',
            'garbage',
        ]);
        expect(pruneReminderKeys(keys, '2026-02-10')).toEqual(
            new Set(['CARD_DUE|c1|2026-02-10', 'SUBSCRIPTION|s|2026-03-01']),
        );
    });
});

describe('timing', () => {
    it('notifies at 09:00 local', () => {
        expect(NOTIFY_HOUR).toBe(9);
        const at = notifyTimeOn('2026-02-10');
        expect([at.getFullYear(), at.getMonth(), at.getDate(), at.getHours(), at.getMinutes()]).toEqual([
            2026, 1, 10, 9, 0,
        ]);
    });

    it('targets today 09:00 when it is still ahead', () => {
        const next = nextNotifyTime(new Date(2026, 1, 10, 6, 30));
        expect(next.getTime()).toBe(new Date(2026, 1, 10, 9, 0).getTime());
    });

    it('rolls to tomorrow once 09:00 has passed or is now', () => {
        expect(nextNotifyTime(new Date(2026, 1, 10, 10, 0)).getTime()).toBe(
            new Date(2026, 1, 11, 9, 0).getTime(),
        );
        expect(nextNotifyTime(new Date(2026, 1, 10, 9, 0)).getTime()).toBe(
            new Date(2026, 1, 11, 9, 0).getTime(),
        );
    });

    it('works on the wall clock across a month end', () => {
        expect(nextNotifyTime(new Date(2026, 2, 7, 10, 0)).getTime()).toBe(
            new Date(2026, 2, 8, 9, 0).getTime(),
        );
        expect(nextNotifyTime(new Date(2026, 0, 31, 23, 59)).getTime()).toBe(
            new Date(2026, 1, 1, 9, 0).getTime(),
        );
    });
});

describe('presentation and settings', () => {
    it('buckets follow the days remaining', () => {
        expect(reminderBucket(0)).toBe('TODAY');
        expect(reminderBucket(-3)).toBe('TODAY');
        expect(reminderBucket(1)).toBe('TOMORROW');
        expect(reminderBucket(3)).toBe('IN_DAYS');
    });

    it('destinations point at cards or upcoming subscriptions', () => {
        const base = { targetId: 'x', title: 'T', date: '2026-02-10', amount: null, currency: null };
        expect(reminderDestination({ ...base, kind: 'CARD_CLOSING' })).toEqual({
            targetScreen: 'CreditCards',
        });
        expect(reminderDestination({ ...base, kind: 'CARD_DUE' })).toEqual({
            targetScreen: 'CreditCards',
        });
        expect(reminderDestination({ ...base, kind: 'SUBSCRIPTION' })).toEqual({
            targetScreen: 'UpcomingSubscriptions',
            upcomingDays: '7',
        });
    });

    it('lead options are 0, 1, 3 and normalize falls back to 1', () => {
        expect(LEAD_OPTIONS).toEqual([0, 1, 3]);
        expect(normalizeLead(0)).toBe(0);
        expect(normalizeLead(3)).toBe(3);
        expect(normalizeLead(2)).toBe(1);
        expect(normalizeLead(-1)).toBe(1);
        expect(normalizeLead(Number.NaN)).toBe(1);
        expect(DEFAULT_LEAD_DAYS).toBe(1);
    });
});
