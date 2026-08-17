import {
    calculateReservedFundsForPeriod,
    listChargesForPeriod,
    listUpcomingSubscriptions,
    toSubscriptionManagerItems,
} from '../../src/modules/subscriptions/subscriptionManager';
import { Subscription } from '../../src/types/index';

function subscription(overrides: Partial<Subscription> = {}): Subscription {
    return {
        id: 'subscription-1',
        name: 'Streaming',
        cost: 100,
        currency: 'MXN',
        billingCycle: 'MONTHLY',
        chargeDate: null,
        nextPaymentDate: '2026-08-15',
        reminderDays: 3,
        isActive: true,
        ...overrides,
    } as Subscription;
}

describe('subscriptionManager', () => {
    it('lists monthly charges inside a period', () => {
        const items = toSubscriptionManagerItems([
            subscription({ nextPaymentDate: '2026-08-15' }),
        ]);

        const charges = listChargesForPeriod(items, {
            start: new Date('2026-08-01T00:00:00'),
            end: new Date('2026-08-31T23:59:59'),
        });

        expect(charges).toHaveLength(1);
        expect(charges[0]).toMatchObject({
            subscriptionId: 'subscription-1',
            dueDate: '2026-08-15',
            amount: 100,
        });
    });

    it('supports weekly and yearly frequencies', () => {
        const items = toSubscriptionManagerItems([
            subscription({ id: 'weekly', billingCycle: 'WEEKLY', nextPaymentDate: '2026-08-01', cost: 20 }),
            subscription({ id: 'yearly', billingCycle: 'YEARLY', nextPaymentDate: '2026-01-01', cost: 120 }),
        ]);

        const charges = listChargesForPeriod(items, {
            start: new Date('2026-08-01T00:00:00'),
            end: new Date('2026-08-14T23:59:59'),
        });

        expect(charges.filter((charge) => charge.subscriptionId === 'weekly')).toHaveLength(2);
        expect(charges.filter((charge) => charge.subscriptionId === 'yearly')).toHaveLength(0);
    });

    it('excludes inactive subscriptions from reserved funds', () => {
        const items = toSubscriptionManagerItems([
            subscription({ id: 'active', cost: 100 }),
            subscription({ id: 'inactive', cost: 200, isActive: false }),
        ]);

        const reserved = calculateReservedFundsForPeriod(items, {
            start: new Date('2026-08-01T00:00:00'),
            end: new Date('2026-08-31T23:59:59'),
        });

        expect(reserved).toBe(100);
    });

    it('returns upcoming subscriptions within the requested window', () => {
        const items = toSubscriptionManagerItems([
            subscription({ id: 'tomorrow', nextPaymentDate: '2026-08-16' }),
            subscription({ id: 'later', nextPaymentDate: '2026-08-25' }),
            subscription({ id: 'inactive', nextPaymentDate: '2026-08-16', isActive: false }),
        ]);

        const upcoming = listUpcomingSubscriptions(
            items,
            3,
            new Date('2026-08-15T12:00:00'),
        );

        expect(upcoming).toHaveLength(1);
        expect(upcoming[0]).toMatchObject({
            dueDate: '2026-08-16',
            daysUntilDue: 1,
            subscription: { id: 'tomorrow' },
        });
    });
});
