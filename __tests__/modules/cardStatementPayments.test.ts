import {
    computeCardPaymentProgress,
    isPaymentDateInRange,
    overpaidBy,
    paymentQuickAmounts,
    recentActivePayments,
} from '../../src/modules/creditCards/cardStatementPayments';
import type {
    StatementPayment,
    StatementPaymentSummary,
    StatementPaymentTargetSummary,
} from '../../src/types/statementImports';

const summary = (extra: Partial<StatementPaymentSummary> = {}): StatementPaymentSummary => ({
    currency: 'MXN',
    closingBalance: 1000,
    paidTotal: 250,
    paymentStatus: 'PARTIAL',
    isPaid: false,
    remainingStatement: 750,
    noInterestTarget: 800,
    remainingNoInterest: 550,
    currentPaymentDue: 550,
    dueDate: null,
    overpaid: 0,
    ...extra,
});

const payment = (id: string, paidAt: string, extra: Partial<StatementPayment> = {}): StatementPayment => ({
    id,
    amount: 10,
    currency: 'MXN',
    paidAt,
    note: null,
    source: 'MANUAL',
    supersedesId: null,
    voidedAt: null,
    voidReason: null,
    createdAt: null,
    ...extra,
});

describe('computeCardPaymentProgress', () => {
    it('uses no-interest target as total and current due as remaining', () => {
        const progress = computeCardPaymentProgress({
            paidTotal: 250,
            closingBalance: 1000,
            noInterestTarget: 800,
            currentPaymentDue: 550,
            remainingStatement: 750,
            paymentStatus: 'PARTIAL',
        });
        expect(progress).toEqual({ paid: 250, total: 800, remaining: 550, fraction: 250 / 800, isPaid: false });
    });

    it('falls back to closing balance and remaining statement', () => {
        const progress = computeCardPaymentProgress({
            paidTotal: 0,
            closingBalance: 1000,
            noInterestTarget: null,
            currentPaymentDue: null,
            remainingStatement: 1000,
            paymentStatus: 'UNPAID',
        });
        expect(progress).toMatchObject({ total: 1000, remaining: 1000, fraction: 0, isPaid: false });
    });

    it('flags paid and clamps fraction', () => {
        const progress = computeCardPaymentProgress({
            paidTotal: 1200,
            closingBalance: 1000,
            noInterestTarget: null,
            currentPaymentDue: 0,
            remainingStatement: 0,
            paymentStatus: 'PAID',
        });
        expect(progress).toMatchObject({ remaining: 0, fraction: 1, isPaid: true });
    });

    it('returns null without any total', () => {
        expect(
            computeCardPaymentProgress({
                paidTotal: 0,
                closingBalance: null,
                noInterestTarget: null,
                currentPaymentDue: null,
                remainingStatement: 0,
                paymentStatus: 'UNPAID',
            }),
        ).toBeNull();
    });
});

describe('overpaidBy', () => {
    it('is zero within the closing balance', () => {
        expect(overpaidBy(750, summary())).toBe(0);
    });
    it('reports the excess over the closing balance', () => {
        expect(overpaidBy(800.5, summary())).toBe(50.5);
    });
    it('is zero when the closing balance is unknown', () => {
        expect(overpaidBy(5000, summary({ closingBalance: null }))).toBe(0);
    });
    it('avoids float noise', () => {
        expect(overpaidBy(0.3, summary({ closingBalance: 0.5, paidTotal: 0.2 }))).toBe(0);
    });
});

describe('recentActivePayments', () => {
    it('keeps active payments, newest first, limited', () => {
        const list = [
            payment('a', '2026-09-01T12:00:00.000Z'),
            payment('b', '2026-09-05T12:00:00.000Z', { supersedesId: 'a' }),
            payment('c', '2026-09-03T12:00:00.000Z', { voidedAt: '2026-09-04T00:00:00.000Z' }),
            payment('d', '2026-09-02T12:00:00.000Z'),
            payment('e', '2026-09-04T12:00:00.000Z'),
            payment('f', '2026-08-30T12:00:00.000Z'),
        ];
        expect(recentActivePayments(list, 3).map(p => p.id)).toEqual(['b', 'e', 'd']);
    });
});

describe('paymentQuickAmounts', () => {
    const target = (kind: StatementPaymentTargetSummary['kind'], amount: number): StatementPaymentTargetSummary => ({
        id: kind,
        kind,
        label: kind,
        amount,
        currency: 'MXN',
        dueDate: null,
    });

    it('builds remaining, no-interest and minimum chips', () => {
        const chips = paymentQuickAmounts(summary(), [target('MINIMUM', 300)]);
        expect(chips).toEqual([
            { key: 'noInterest', amount: 550 },
            { key: 'remaining', amount: 750 },
            { key: 'minimum', amount: 50 },
        ]);
    });

    it('drops non-positive and duplicated amounts', () => {
        const chips = paymentQuickAmounts(
            summary({ remainingNoInterest: 750, noInterestTarget: 250 }),
            [target('MINIMUM', 100)],
        );
        expect(chips.map(c => c.key)).toEqual(['noInterest']);
    });
});

describe('isPaymentDateInRange', () => {
    const now = new Date('2026-10-05T10:00:00.000Z');
    it('accepts 2000-01-01 and today', () => {
        expect(isPaymentDateInRange('2000-01-01T12:00:00.000Z', now)).toBe(true);
        expect(isPaymentDateInRange('2026-10-05T12:00:00.000Z', now)).toBe(true);
    });
    it('rejects earlier and future days', () => {
        expect(isPaymentDateInRange('1999-12-31T12:00:00.000Z', now)).toBe(false);
        expect(isPaymentDateInRange('2026-10-06T12:00:00.000Z', now)).toBe(false);
        expect(isPaymentDateInRange('nope', now)).toBe(false);
    });
});
