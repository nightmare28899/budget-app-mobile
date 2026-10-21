import {
    ReminderNotificationPort,
    ReminderSettings,
    ReminderSources,
    ReminderStore,
    ScheduledReminder,
    SubscriptionReminderInput,
    syncReminders,
} from '../../../src/modules/reminders';

const at = (month: number, day: number, hour = 9) => new Date(2026, month - 1, day, hour, 0).getTime();

function sub(id: string, date: string, overrides: Partial<SubscriptionReminderInput> = {}) {
    return {
        id,
        name: `Sub ${id}`,
        cost: 50,
        currency: 'MXN',
        billingCycle: 'YEARLY',
        nextPaymentDate: date,
        isActive: true,
        ...overrides,
    } as SubscriptionReminderInput;
}

function harness(opts: {
    now?: Date;
    subs?: SubscriptionReminderInput[];
    records?: Record<string, number>;
    canNotify?: boolean;
    maxScheduled?: number;
} = {}) {
    let records = opts.records ?? {};
    const port = {
        canNotify: jest.fn(async () => opts.canNotify ?? true),
        requestPermission: jest.fn(async () => true),
        replaceAll: jest.fn(async (_items: ScheduledReminder[]) => {}),
        cancelAll: jest.fn(async () => {}),
    } satisfies ReminderNotificationPort;
    const store: ReminderStore = {
        load: () => records,
        save: next => {
            records = next;
        },
    };
    const sources = {
        cards: jest.fn(async () => []),
        subscriptions: jest.fn(async () => opts.subs ?? []),
    } satisfies ReminderSources;
    const copy = jest.fn((event, daysUntil: number, hideAmounts: boolean) => ({
        title: event.title,
        body: `${daysUntil}|${hideAmounts}`,
    }));
    let now = opts.now ?? new Date(2026, 1, 10, 8, 0);
    const run = (settings: Partial<ReminderSettings> = {}) =>
        syncReminders(
            { port, store, copy, now: () => now, maxScheduled: opts.maxScheduled ?? 64 },
            { enabled: true, leadDays: 1, appLockEnabled: false, ...settings },
            sources,
        );
    return {
        port,
        sources,
        copy,
        run,
        records: () => records,
        setNow: (value: Date) => {
            now = value;
        },
        lastItems: () => port.replaceAll.mock.calls[port.replaceAll.mock.calls.length - 1][0],
    };
}

const THREE = [sub('a', '2026-02-10'), sub('b', '2026-02-11'), sub('c', '2026-02-14')];

describe('syncReminders', () => {
    it('disabled reminders cancel everything and clear the records', async () => {
        const h = harness({ subs: THREE, records: { 'SUBSCRIPTION|a|2026-02-10': 1 } });
        const result = await h.run({ enabled: false });
        expect(result.status).toBe('DISABLED');
        expect(h.port.cancelAll).toHaveBeenCalledTimes(1);
        expect(h.port.replaceAll).not.toHaveBeenCalled();
        expect(h.sources.subscriptions).not.toHaveBeenCalled();
        expect(h.records()).toEqual({});
    });

    it('schedules each event at 09:00 on its lead day with the days remaining at fire time', async () => {
        const h = harness({ subs: THREE });
        const result = await h.run();
        expect(result).toMatchObject({ status: 'UPDATED', scheduled: 3 });
        const items = h.lastItems();
        expect(items.map(i => [i.id, i.fireAt])).toEqual([
            ['SUBSCRIPTION|a|2026-02-10', at(2, 10)],
            ['SUBSCRIPTION|b|2026-02-11', at(2, 10)],
            ['SUBSCRIPTION|c|2026-02-14', at(2, 13)],
        ]);
        expect(h.copy.mock.calls.map(c => c[1])).toEqual([0, 1, 1]);
        expect(items[0].destination).toEqual({
            targetScreen: 'UpcomingSubscriptions',
            upcomingDays: '7',
        });
    });

    it('lead zero fires on the day itself', async () => {
        const h = harness({ subs: THREE });
        await h.run({ leadDays: 0 });
        expect(h.lastItems().map(i => i.fireAt)).toEqual([at(2, 10), at(2, 11), at(2, 14)]);
    });

    it('is idempotent: running twice yields the same plan', async () => {
        const h = harness({ subs: THREE });
        await h.run();
        const first = h.lastItems();
        await h.run();
        expect(h.lastItems()).toEqual(first);
        expect(h.port.replaceAll).toHaveBeenCalledTimes(2);
    });

    it('never schedules an already-fired event again', async () => {
        const h = harness({ subs: THREE });
        await h.run();
        h.setNow(new Date(2026, 1, 10, 10, 0));
        await h.run();
        expect(h.lastItems().map(i => i.id)).toEqual(['SUBSCRIPTION|c|2026-02-14']);
        await h.run();
        expect(h.lastItems().map(i => i.id)).toEqual(['SUBSCRIPTION|c|2026-02-14']);
    });

    it('an event first seen inside its window fires at the next 09:00 if that is not after the event day', async () => {
        const h = harness({ subs: [sub('b', '2026-02-11')], now: new Date(2026, 1, 10, 10, 0) });
        await h.run();
        expect(h.lastItems().map(i => i.fireAt)).toEqual([at(2, 11)]);
    });

    it('an event due today that is first seen after 09:00 is not scheduled', async () => {
        const h = harness({ subs: [sub('a', '2026-02-10')], now: new Date(2026, 1, 10, 10, 0) });
        const result = await h.run();
        expect(result.scheduled).toBe(0);
        expect(h.lastItems()).toEqual([]);
    });

    it('a pending notification survives a lead change that would put it in the past', async () => {
        const h = harness({ subs: [sub('c', '2026-02-14')] });
        await h.run({ leadDays: 1 });
        expect(h.lastItems().map(i => i.fireAt)).toEqual([at(2, 13)]);
        h.setNow(new Date(2026, 1, 12, 8, 0));
        await h.run({ leadDays: 3 });
        expect(h.lastItems().map(i => i.fireAt)).toEqual([at(2, 13)]);
    });

    it('plans nearest-first within the platform cap', async () => {
        const h = harness({
            subs: [sub('far', '2026-03-01'), sub('near', '2026-02-11'), sub('mid', '2026-02-20')],
            maxScheduled: 2,
        });
        const result = await h.run();
        expect(h.lastItems().map(i => i.id)).toEqual([
            'SUBSCRIPTION|near|2026-02-11',
            'SUBSCRIPTION|mid|2026-02-20',
        ]);
        expect(result).toMatchObject({ scheduled: 2, dropped: 1 });
        expect(Object.keys(h.records())).toHaveLength(2);
    });

    it('passes the app lock flag to hide amounts', async () => {
        const h = harness({ subs: [sub('b', '2026-02-11')] });
        await h.run({ appLockEnabled: true });
        expect(h.copy.mock.calls[0][2]).toBe(true);
        await h.run({ appLockEnabled: false });
        expect(h.copy.mock.calls[1][2]).toBe(false);
    });

    it('blocked notifications schedule nothing and keep the records', async () => {
        const h = harness({ subs: THREE, canNotify: false, records: { keep: at(3, 1) } });
        const result = await h.run();
        expect(result.status).toBe('NOTIFICATIONS_BLOCKED');
        expect(h.port.replaceAll).not.toHaveBeenCalled();
        expect(h.records()).toEqual({ keep: at(3, 1) });
    });

    it('a failing source keeps the previous schedule untouched', async () => {
        const h = harness({ subs: THREE, records: { keep: at(3, 1) } });
        h.sources.subscriptions.mockRejectedValueOnce(new Error('offline'));
        const result = await h.run();
        expect(result.status).toBe('FAILED');
        expect(h.port.replaceAll).not.toHaveBeenCalled();
        expect(h.port.cancelAll).not.toHaveBeenCalled();
        expect(h.records()).toEqual({ keep: at(3, 1) });
    });

    it('a failing platform call reports FAILED and does not persist records', async () => {
        const h = harness({ subs: THREE });
        h.port.replaceAll.mockRejectedValueOnce(new Error('native'));
        const result = await h.run();
        expect(result.status).toBe('FAILED');
        expect(h.records()).toEqual({});
    });

    it('a failing platform call keeps the previously stored schedule', async () => {
        const h = harness({ subs: THREE, records: { keep: at(3, 1) } });
        h.port.replaceAll.mockRejectedValueOnce(new Error('native'));
        const result = await h.run();
        expect(result.status).toBe('FAILED');
        expect(h.records()).toEqual({ keep: at(3, 1) });
    });

    it('prunes records of past events', async () => {
        const h = harness({
            subs: [],
            records: { 'SUBSCRIPTION|a|2026-02-01': at(1, 31), 'SUBSCRIPTION|a|2026-02-20': at(2, 19) },
        });
        await h.run();
        expect(h.records()).toEqual({});
    });

    it('cards and subscriptions are both planned', async () => {
        const h = harness({ subs: [sub('b', '2026-02-11')] });
        h.sources.cards.mockResolvedValueOnce([
            {
                id: 'c1',
                name: 'Visa',
                closingDay: null,
                paymentDueDay: 12,
                isActive: true,
                nextPayment: null,
                paidThrough: null,
            },
        ] as never);
        await h.run();
        expect(h.lastItems()[0].destination.targetScreen).toBe('UpcomingSubscriptions');
        expect(h.lastItems().some(i => i.destination.targetScreen === 'CreditCards')).toBe(true);
    });
});
