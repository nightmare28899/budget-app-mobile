import {
    CardReminderInput,
    HORIZON_DAYS,
    ReminderAmount,
    ReminderEvent,
    SubscriptionReminderInput,
    planReminders,
    reminderKey,
    remindersDue,
} from '../../../src/modules/reminders';

const TODAY = '2026-02-10';

function card(overrides: Partial<CardReminderInput> = {}): CardReminderInput {
    return {
        id: 'c1',
        name: 'Visa',
        closingDay: null,
        paymentDueDay: null,
        isActive: true,
        nextPayment: null,
        paidThrough: null,
        ...overrides,
    };
}

function sub(overrides: Partial<SubscriptionReminderInput> = {}): SubscriptionReminderInput {
    const id = overrides.id ?? 's1';
    return {
        id,
        name: `Sub ${id}`,
        cost: 99,
        currency: 'MXN',
        billingCycle: 'MONTHLY',
        nextPaymentDate: '2026-02-12',
        isActive: true,
        ...overrides,
    };
}

function plan(
    cards: CardReminderInput[] = [],
    subs: SubscriptionReminderInput[] = [],
    horizon: number = HORIZON_DAYS,
    today = TODAY,
) {
    return planReminders(cards, subs, today, horizon);
}

const dates = (events: ReminderEvent[]) => events.map(e => e.date);

describe('planReminders - cards', () => {
    it('paid statement suppresses its due reminder but not the next cycle', () => {
        const early = plan([card({ paymentDueDay: 10, paidThrough: '2026-02-10' })]);
        expect(dates(early)).toEqual(['2026-03-10']);
        const late = plan([card({ paymentDueDay: 10, paidThrough: '2026-01-10' })]);
        expect(dates(late)).toEqual(['2026-02-10', '2026-03-10']);
    });

    it('card due today is planned for today', () => {
        const events = plan([card({ paymentDueDay: 10 })]);
        expect(dates(events)).toEqual(['2026-02-10', '2026-03-10']);
        expect(events.every(e => e.kind === 'CARD_DUE')).toBe(true);
    });

    it('card due tomorrow is planned for tomorrow', () => {
        expect(plan([card({ paymentDueDay: 11 })])[0].date).toBe('2026-02-11');
    });

    it('overdue due day rolls to next month and never emits the past', () => {
        const events = plan([card({ paymentDueDay: 9 })]);
        expect(dates(events)).toEqual(['2026-03-09']);
        expect(events.every(e => e.date >= TODAY)).toBe(true);
    });

    it('month-end due day clamps to the last day of short months', () => {
        const events = plan([card({ paymentDueDay: 31 })], [], 60);
        expect(dates(events)).toEqual(['2026-02-28', '2026-03-31']);
    });

    it('closing day 30 clamps to Feb 28 and to Feb 29 on leap years', () => {
        const nonLeap = plan([card({ closingDay: 30 })])[0];
        expect(nonLeap.date).toBe('2026-02-28');
        expect(nonLeap.kind).toBe('CARD_CLOSING');
        const leap = plan([card({ closingDay: 30 })], [], HORIZON_DAYS, '2028-02-10')[0];
        expect(leap.date).toBe('2028-02-29');
    });

    it('closing and due on the same day stay distinct events', () => {
        const events = plan([card({ closingDay: 15, paymentDueDay: 15 })]).filter(
            e => e.date === '2026-02-15',
        );
        expect(new Set(events.map(e => e.kind))).toEqual(new Set(['CARD_CLOSING', 'CARD_DUE']));
        expect(new Set(events.map(reminderKey)).size).toBe(2);
    });

    it('inactive cards and cards without valid days plan nothing', () => {
        expect(plan([card({ paymentDueDay: 15, closingDay: 12, isActive: false })])).toEqual([]);
        expect(plan([card()])).toEqual([]);
        expect(plan([card({ paymentDueDay: 0, closingDay: 32 })])).toEqual([]);
    });

    it('payment amount attaches only to the matching due date', () => {
        const nextPayment: ReminderAmount = { date: '2026-02-15', amount: 1200.5, currency: 'MXN' };
        const events = plan([card({ paymentDueDay: 15, nextPayment })]).filter(
            e => e.kind === 'CARD_DUE',
        );
        expect(events[0].amount).toBe(1200.5);
        expect(events[0].currency).toBe('MXN');
        expect(events[1].amount).toBeNull();
    });
});

describe('planReminders - subscriptions', () => {
    it('active subscription projects its charges inside the horizon', () => {
        const events = plan([], [sub({ nextPaymentDate: '2026-02-12' })]);
        expect(dates(events)).toEqual(['2026-02-12', '2026-03-12']);
        expect(
            events.every(
                e =>
                    e.kind === 'SUBSCRIPTION' &&
                    e.targetId === 's1' &&
                    e.amount === 99 &&
                    e.currency === 'MXN',
            ),
        ).toBe(true);
    });

    it('inactive subscriptions are skipped', () => {
        expect(plan([], [sub({ isActive: false })])).toEqual([]);
    });

    it('a past next date only emits future charges', () => {
        expect(dates(plan([], [sub({ nextPaymentDate: '2026-02-01' })]))).toEqual(['2026-03-01']);
    });

    it('weekly subscription emits every week in the window', () => {
        const events = plan([], [sub({ nextPaymentDate: '2026-02-10', billingCycle: 'WEEKLY' })], 14);
        expect(dates(events)).toEqual(['2026-02-10', '2026-02-17', '2026-02-24']);
    });

    it('yearly subscription appears only when inside the horizon', () => {
        const inside = plan([], [sub({ nextPaymentDate: '2025-02-20', billingCycle: 'YEARLY' })]);
        expect(dates(inside)).toEqual(['2026-02-20']);
    });

    it('day 31 monthly anchor survives short months', () => {
        const events = plan([], [sub({ nextPaymentDate: '2026-01-31' })], 60);
        expect(dates(events)).toEqual(['2026-02-28', '2026-03-31']);
    });

    it('events beyond the horizon are dropped', () => {
        expect(plan([], [sub({ nextPaymentDate: '2026-06-01' })])).toEqual([]);
    });

    it('plan is sorted by date, then kind, then title', () => {
        const events = plan(
            [card({ paymentDueDay: 12, closingDay: 12 })],
            [sub({ nextPaymentDate: '2026-02-12' })],
            5,
        );
        expect(events.map(e => e.kind)).toEqual(['CARD_DUE', 'CARD_CLOSING', 'SUBSCRIPTION']);
    });
});

describe('remindersDue', () => {
    const ev = (date: string, id = 's1'): ReminderEvent => ({
        kind: 'SUBSCRIPTION',
        targetId: id,
        title: 'T',
        date,
        amount: null,
        currency: null,
    });

    it('lead zero only fires on the day', () => {
        const events = [ev('2026-02-10'), ev('2026-02-11', 's2')];
        expect(remindersDue(events, TODAY, 0, new Set()).map(e => e.date)).toEqual(['2026-02-10']);
    });

    it('lead one fires the day before and the day itself', () => {
        const events = [ev('2026-02-10'), ev('2026-02-11', 's2'), ev('2026-02-12', 's3')];
        expect(remindersDue(events, TODAY, 1, new Set()).map(e => e.targetId)).toEqual(['s1', 's2']);
    });

    it('lead three fires within three days but not four', () => {
        const events = [ev('2026-02-13'), ev('2026-02-14', 's2')];
        expect(remindersDue(events, TODAY, 3, new Set()).map(e => e.targetId)).toEqual(['s1']);
    });

    it('past events are never notified', () => {
        expect(remindersDue([ev('2026-02-09')], TODAY, 3, new Set())).toEqual([]);
    });

    it('already notified keys are skipped', () => {
        const e = ev('2026-02-10');
        expect(remindersDue([e], TODAY, 1, new Set([reminderKey(e)]))).toEqual([]);
        expect(remindersDue([e], TODAY, 1, new Set(['other']))).toHaveLength(1);
    });

    it('an out-of-range lead falls back to the default', () => {
        const events = [ev('2026-02-11'), ev('2026-02-12', 's2')];
        expect(remindersDue(events, TODAY, 99, new Set()).map(e => e.targetId)).toEqual(['s1']);
    });
});
