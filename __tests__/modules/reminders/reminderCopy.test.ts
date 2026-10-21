import { ReminderEvent, createReminderCopy } from '../../../src/modules/reminders';

const t = (key: string, values?: Record<string, string | number>) =>
    values?.count !== undefined ? `${key}:${values.count}` : key;
const copy = createReminderCopy({
    t: t as never,
    formatAmount: (amount, currency) => `${currency ?? '-'} ${amount}`,
});

function event(kind: ReminderEvent['kind'], amount: number | null = 25): ReminderEvent {
    return { kind, targetId: 'x', title: 'Visa', date: '2026-02-10', amount, currency: 'MXN' };
}

describe('createReminderCopy', () => {
    it('uses the event title and the bucketed line with the amount', () => {
        expect(copy(event('CARD_DUE'), 0, false)).toEqual({
            title: 'Visa',
            body: 'reminders.cardDueToday · MXN 25',
        });
        expect(copy(event('CARD_DUE'), 1, false).body).toBe('reminders.cardDueTomorrow · MXN 25');
        expect(copy(event('CARD_DUE'), 3, false).body).toBe('reminders.cardDueInDays:3 · MXN 25');
    });

    it('covers closing and subscription lines', () => {
        expect(copy(event('CARD_CLOSING'), 0, false).body).toContain('reminders.cardClosingToday');
        expect(copy(event('CARD_CLOSING'), 3, false).body).toContain('reminders.cardClosingInDays:3');
        expect(copy(event('SUBSCRIPTION'), 1, false).body).toContain('reminders.subscriptionTomorrow');
    });

    it('hides the amount when asked or when there is none', () => {
        expect(copy(event('SUBSCRIPTION'), 0, true).body).toBe('reminders.subscriptionToday');
        expect(copy(event('SUBSCRIPTION', null), 0, false).body).toBe('reminders.subscriptionToday');
    });
});
