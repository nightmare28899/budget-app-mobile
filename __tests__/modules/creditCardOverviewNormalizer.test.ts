import { normalizeOverviewResponse } from '../../src/modules/creditCards/overviewNormalizer';

const backendPayload = {
    referenceDate: '2026-10-01',
    portfolio: {
        trackedCards: 2,
        activeCards: 2,
        cardsWithLimit: 1,
        byCurrency: [
            {
                currency: 'MXN',
                cardCount: 2,
                totalCreditLimit: '50000.00',
                totalCurrentCycleSpend: 1200.5,
                totalAvailableCredit: 30000,
                totalOwedBalance: 20000,
                totalClosingBalance: 8000,
                totalPaid: 1000,
                totalStatementRemainder: 7000,
                totalDeferredInstallmentBalance: 3000,
                totalCurrentPaymentDue: 2500,
                earliestPaymentDueDate: '2026-10-10',
                totalPostCloseSpend: 400,
                postCloseExpenseCount: 3,
                totalProjectedNextCloseAmount: 400,
                earliestProjectedNextCloseDate: '2026-10-25',
                totalProjectedDebt: 20000,
                totalNextClosePaymentEstimate: 900,
                totalEstimatedRemainingAfterNextClose: 6100,
                utilizationPercent: 40,
                monthlyRecurringSpend: 300,
            },
        ],
        paymentDueSoonCount: 1,
        highUtilizationCount: 0,
        linkedSubscriptionsCount: 2,
    },
    cards: [
        {
            id: 'card-1',
            name: 'Oro',
            bank: 'Banamex',
            brand: 'MASTERCARD',
            last4: '1234',
            color: null,
            creditLimit: 50000,
            closingDay: 15,
            paymentDueDay: 5,
            isActive: true,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
            currency: 'MXN',
            currentCycle: {
                currency: 'MXN',
                start: '2026-09-16',
                end: '2026-10-15',
                spend: 1200.5,
                expenseCount: 4,
                currencyMismatchCount: 1,
            },
            creditStatus: {
                currency: 'MXN',
                limit: 50000,
                availableCredit: 30000,
                utilizationPercent: 40,
                owedBalance: 20000,
            },
            statementSummary: {
                statementImportId: 'stmt-1',
                periodStart: '2026-08-16',
                periodEnd: '2026-09-15',
                closingBalance: 8000,
                paidTotal: 1000,
                paymentStatus: 'PARTIAL',
                remainingStatement: 7000,
                deferredInstallmentBalance: 3000,
                noInterestTarget: 2500,
                currentPaymentDue: 2500,
                minimumPayment: 450,
                dueDate: '2026-10-10',
                postCloseSpend: 400,
                postCloseExpenseCount: 3,
                projectedNextCloseDate: '2026-10-25',
                projectedNextCloseAmount: 400,
                projectedTotalDebt: 20000,
                nextPlanInstallments: 2,
                nextClosePaymentEstimate: 900,
                estimatedRemainingAfterNextClose: 6100,
                overpaid: 0,
                integrityFlags: {
                    missingReconciliation: false,
                    failedReconciliation: false,
                    missingPaymentBasis: true,
                    conflictingNoInterestTargets: false,
                },
            },
            nextPayment: {
                amount: 2500,
                currency: 'MXN',
                dueDate: '2026-10-10',
                previousAmount: null,
            },
            schedule: {
                nextClosingDate: '2026-10-15',
                daysUntilClosing: 14,
                nextPaymentDueDate: '2026-10-05',
                daysUntilPaymentDue: 4,
            },
            subscriptions: {
                currency: 'MXN',
                activeCount: 2,
                monthlyRecurringSpend: 300,
                nextChargeDate: null,
                currencyMismatchCount: 0,
            },
            currencyMismatchCount: 1,
            flags: {
                missingLimit: false,
                highUtilization: false,
                overLimit: false,
                paymentDueSoon: true,
                closingSoon: false,
                currencyMismatch: true,
            },
        },
        {
            id: 'card-2',
            name: 'Plain',
            bank: 'Other',
            brand: 'VISA',
            last4: '9999',
            creditLimit: null,
            currency: 'USD',
            statementSummary: {
                statementImportId: null,
                paymentStatus: 'UNPAID',
            },
            nextPayment: null,
        },
    ],
};

describe('normalizeOverviewResponse', () => {
    it('keeps portfolio totals grouped by currency', () => {
        const result = normalizeOverviewResponse(backendPayload);

        expect(result.referenceDate).toBe('2026-10-01');
        expect(result.portfolio.activeCards).toBe(2);
        expect(result.portfolio.paymentDueSoonCount).toBe(1);
        expect(result.portfolio.byCurrency).toHaveLength(1);
        const mxn = result.portfolio.byCurrency[0];
        expect(mxn.currency).toBe('MXN');
        expect(mxn.totalCreditLimit).toBe(50000);
        expect(mxn.totalOwedBalance).toBe(20000);
        expect(mxn.totalCurrentPaymentDue).toBe(2500);
        expect(mxn.earliestPaymentDueDate).toBe('2026-10-10');
        expect(mxn.totalEstimatedRemainingAfterNextClose).toBe(6100);
        expect(mxn.utilizationPercent).toBe(40);
    });

    it('preserves card currency, statement summary and next payment', () => {
        const [card] = normalizeOverviewResponse(backendPayload).cards;

        expect(card.currency).toBe('MXN');
        expect(card.currentCycle.currency).toBe('MXN');
        expect(card.creditStatus.owedBalance).toBe(20000);
        expect(card.statementSummary).toMatchObject({
            statementImportId: 'stmt-1',
            paymentStatus: 'PARTIAL',
            minimumPayment: 450,
            noInterestTarget: 2500,
            currentPaymentDue: 2500,
            dueDate: '2026-10-10',
            deferredInstallmentBalance: 3000,
            nextClosePaymentEstimate: 900,
            estimatedRemainingAfterNextClose: 6100,
        });
        expect(card.statementSummary?.integrityFlags.missingPaymentBasis).toBe(true);
        expect(card.nextPayment).toEqual({
            amount: 2500,
            currency: 'MXN',
            dueDate: '2026-10-10',
            previousAmount: null,
        });
        expect(card.flags.currencyMismatch).toBe(true);
        expect(card.currencyMismatchCount).toBe(1);
    });

    it('degrades gracefully for a card without statement data', () => {
        const card = normalizeOverviewResponse(backendPayload).cards[1];

        expect(card.currency).toBe('USD');
        expect(card.nextPayment).toBeNull();
        expect(card.statementSummary?.statementImportId).toBeNull();
        expect(card.statementSummary?.minimumPayment).toBeNull();
        expect(card.statementSummary?.dueDate).toBeNull();
        expect(card.statementSummary?.remainingStatement).toBe(0);
        expect(card.creditStatus.limit).toBeNull();
    });

    it('returns an empty overview for malformed input', () => {
        const result = normalizeOverviewResponse(null);

        expect(result.cards).toEqual([]);
        expect(result.portfolio.byCurrency).toEqual([]);
    });
});
