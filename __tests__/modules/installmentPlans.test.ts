import {
    getPlanProgress,
    sortPlansByRemaining,
    summarizeInstallmentPlans,
} from '../../src/modules/creditCards/installmentPlans';
import { CreditCardInstallmentPlan } from '../../src/types/index';

function plan(overrides: Partial<CreditCardInstallmentPlan>): CreditCardInstallmentPlan {
    return {
        id: 'p',
        type: 'NO_INTEREST',
        merchantName: null,
        purchaseDate: null,
        originalAmount: null,
        installmentNumber: null,
        installmentCount: null,
        installmentAmount: null,
        remainingAmount: null,
        currency: 'MXN',
        statementPeriodEnd: null,
        isFinalInstallment: false,
        ...overrides,
    };
}

describe('installmentPlans', () => {
    it('sorts by remaining desc with nulls last', () => {
        const sorted = sortPlansByRemaining([
            plan({ id: 'a', remainingAmount: 100 }),
            plan({ id: 'b', remainingAmount: null }),
            plan({ id: 'c', remainingAmount: 900 }),
        ]);
        expect(sorted.map(p => p.id)).toEqual(['c', 'a', 'b']);
    });

    it('computes progress or null', () => {
        expect(getPlanProgress(plan({ installmentNumber: 3, installmentCount: 12 }))).toBe(0.25);
        expect(getPlanProgress(plan({ installmentNumber: 13, installmentCount: 12 }))).toBe(1);
        expect(getPlanProgress(plan({ installmentNumber: 3 }))).toBeNull();
        expect(getPlanProgress(plan({ installmentNumber: 1, installmentCount: 0 }))).toBeNull();
    });

    it('sums per currency and picks latest statement date', () => {
        const summary = summarizeInstallmentPlans([
            plan({ installmentAmount: 100, remainingAmount: 500, statementPeriodEnd: '2026-09-15' }),
            plan({ installmentAmount: 50, remainingAmount: null, statementPeriodEnd: '2026-10-15' }),
            plan({ currency: 'USD', installmentAmount: 10, remainingAmount: 20 }),
        ]);
        expect(summary.count).toBe(3);
        expect(summary.totals).toEqual([
            { currency: 'MXN', monthly: 150, remaining: 500 },
            { currency: 'USD', monthly: 10, remaining: 20 },
        ]);
        expect(summary.statementPeriodEnd).toBe('2026-10-15');
    });

    it('handles empty list', () => {
        expect(summarizeInstallmentPlans([])).toEqual({
            count: 0,
            totals: [],
            statementPeriodEnd: null,
        });
    });
});
