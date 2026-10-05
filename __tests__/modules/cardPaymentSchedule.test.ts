import {
    calendarDaysBetween,
    daysUntilDueDate,
    hasPaymentPending,
    listPendingPayments,
    parseDateOnly,
    resolveReminderKind,
} from '../../src/modules/creditCards/cardPaymentSchedule';
import {
    CreditCardOverviewCard,
    CreditCardStatementSummary,
} from '../../src/types/index';

function summary(overrides: Partial<CreditCardStatementSummary> = {}): CreditCardStatementSummary {
    return {
        statementImportId: 'stmt',
        periodStart: null,
        periodEnd: null,
        closingBalance: 1000,
        paidTotal: 0,
        paymentStatus: 'UNPAID',
        remainingStatement: 1000,
        deferredInstallmentBalance: 0,
        noInterestTarget: 1000,
        currentPaymentDue: 1000,
        minimumPayment: 100,
        dueDate: '2026-10-10',
        postCloseSpend: 0,
        postCloseExpenseCount: 0,
        projectedNextCloseDate: null,
        projectedNextCloseAmount: 0,
        projectedTotalDebt: 0,
        nextPlanInstallments: 0,
        nextClosePaymentEstimate: 0,
        estimatedRemainingAfterNextClose: 0,
        overpaid: 0,
        integrityFlags: {
            missingReconciliation: false,
            failedReconciliation: false,
            missingPaymentBasis: false,
            conflictingNoInterestTargets: false,
        },
        ...overrides,
    };
}

function card(
    id: string,
    statementSummary: CreditCardStatementSummary | null,
    isActive = true,
): CreditCardOverviewCard {
    return { id, isActive, statementSummary } as unknown as CreditCardOverviewCard;
}

describe('date helpers', () => {
    it('parses date-only strings as local days', () => {
        const date = parseDateOnly('2026-10-10T00:00:00.000Z');
        expect(date?.getFullYear()).toBe(2026);
        expect(date?.getMonth()).toBe(9);
        expect(date?.getDate()).toBe(10);
        expect(parseDateOnly('nope')).toBeNull();
    });

    it('counts calendar days across month boundaries', () => {
        expect(calendarDaysBetween(new Date(2026, 9, 30), new Date(2026, 10, 2))).toBe(3);
        expect(calendarDaysBetween(new Date(2026, 9, 2), new Date(2026, 9, 1))).toBe(-1);
    });

    it('returns negative days when overdue and null when unparseable', () => {
        const now = new Date(2026, 9, 12, 18, 0);
        expect(daysUntilDueDate('2026-10-10', now)).toBe(-2);
        expect(daysUntilDueDate('x', now)).toBeNull();
    });
});

describe('hasPaymentPending', () => {
    it('is false without a statement, when paid or when nothing is due', () => {
        expect(hasPaymentPending(card('a', null))).toBe(false);
        expect(hasPaymentPending(card('a', summary({ statementImportId: null })))).toBe(false);
        expect(hasPaymentPending(card('a', summary({ paymentStatus: 'PAID' })))).toBe(false);
        expect(hasPaymentPending(card('a', summary({ currentPaymentDue: 0 })))).toBe(false);
    });

    it('is true for unpaid or partial statements with money due', () => {
        expect(hasPaymentPending(card('a', summary()))).toBe(true);
        expect(hasPaymentPending(card('a', summary({ paymentStatus: 'PARTIAL' })))).toBe(true);
        expect(hasPaymentPending(card('a', summary({ currentPaymentDue: null })))).toBe(true);
    });
});

describe('listPendingPayments', () => {
    const now = new Date(2026, 9, 1);

    it('sorts by nearest due date with undated last and skips inactive cards', () => {
        const result = listPendingPayments(
            [
                card('late', summary({ dueDate: '2026-10-20' })),
                card('undated', summary({ dueDate: null })),
                card('soon', summary({ dueDate: '2026-10-03' })),
                card('inactive', summary({ dueDate: '2026-10-02' }), false),
                card('paid', summary({ paymentStatus: 'PAID' })),
            ],
            now,
        );

        expect(result.map(item => item.card.id)).toEqual(['soon', 'late', 'undated']);
        expect(result[0].daysUntilDue).toBe(2);
        expect(result[2].daysUntilDue).toBeNull();
    });
});

describe('resolveReminderKind', () => {
    it('buckets days into reminder wording', () => {
        expect(resolveReminderKind(0)).toBe('dueToday');
        expect(resolveReminderKind(1)).toBe('dueInOne');
        expect(resolveReminderKind(5)).toBe('dueIn');
        expect(resolveReminderKind(-1)).toBe('overdueOne');
        expect(resolveReminderKind(-9)).toBe('overdue');
    });
});
