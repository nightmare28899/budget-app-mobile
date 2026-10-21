import { CreditCardOverviewCard, Subscription } from '../../../src/types/index';
import {
    cardInputFromOverview,
    subscriptionInputFromSubscription,
} from '../../../src/modules/reminders';

function overview(overrides: Record<string, unknown> = {}): CreditCardOverviewCard {
    return {
        id: 'c1',
        name: 'Visa',
        closingDay: 20,
        paymentDueDay: 5,
        isActive: false,
        nextPayment: null,
        statementSummary: null,
        ...overrides,
    } as unknown as CreditCardOverviewCard;
}

describe('cardInputFromOverview', () => {
    it('maps days, activity and no payment when unknown', () => {
        expect(cardInputFromOverview(overview())).toEqual({
            id: 'c1',
            name: 'Visa',
            closingDay: 20,
            paymentDueDay: 5,
            isActive: false,
            nextPayment: null,
            paidThrough: null,
        });
    });

    it('next payment with a due date becomes an amount; without one it is dropped', () => {
        const withDate = overview({
            nextPayment: { amount: 800, currency: 'USD', dueDate: '2026-02-15T12:00:00.000Z', previousAmount: null },
        });
        expect(cardInputFromOverview(withDate).nextPayment).toEqual({
            date: '2026-02-15',
            amount: 800,
            currency: 'USD',
        });
        const noDate = overview({
            nextPayment: { amount: 800, currency: 'USD', dueDate: null, previousAmount: null },
        });
        expect(cardInputFromOverview(noDate).nextPayment).toBeNull();
    });

    it('paid statement due date becomes paidThrough; unpaid does not', () => {
        const summary = {
            statementImportId: 's',
            dueDate: '2026-09-12T12:00:00.000Z',
            paymentStatus: 'PAID',
        };
        expect(cardInputFromOverview(overview({ statementSummary: summary })).paidThrough).toBe(
            '2026-09-12',
        );
        expect(
            cardInputFromOverview(
                overview({ statementSummary: { ...summary, paymentStatus: 'UNPAID' } }),
            ).paidThrough,
        ).toBeNull();
        expect(
            cardInputFromOverview(
                overview({ statementSummary: { ...summary, statementImportId: null } }),
            ).paidThrough,
        ).toBeNull();
    });
});

describe('subscriptionInputFromSubscription', () => {
    it('maps the schedule fields and treats a missing isActive as active', () => {
        const input = subscriptionInputFromSubscription({
            id: 's1',
            name: 'Netflix',
            cost: '199.5' as unknown as number,
            currency: 'MXN',
            billingCycle: 'MONTHLY',
            nextPaymentDate: '2026-02-12T12:00:00.000Z',
            chargeDate: '2026-02-12',
        } as Subscription);
        expect(input).toEqual({
            id: 's1',
            name: 'Netflix',
            cost: 199.5,
            currency: 'MXN',
            billingCycle: 'MONTHLY',
            nextPaymentDate: '2026-02-12',
            isActive: true,
        });
    });

    it('drops subscriptions without a parseable date', () => {
        expect(
            subscriptionInputFromSubscription({
                id: 's1',
                name: 'X',
                cost: 1,
                currency: 'MXN',
                billingCycle: 'MONTHLY',
                nextPaymentDate: 'nope',
                chargeDate: '',
            } as Subscription),
        ).toBeNull();
    });
});
