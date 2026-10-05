import {
    CreditCardNextPayment,
    CreditCardOverviewCard,
    CreditCardPortfolioCurrency,
    CreditCardsOverviewResponse,
    CreditCardStatementSummary,
    StatementPaymentStatus,
} from '../../types/index';
import { normalizeCreditCard } from '../../utils/domain/creditCards';
import { DEFAULT_CURRENCY, normalizeCurrency } from '../../utils/domain/currency';
import { toNum } from '../../utils/core/number';
import { toApiArray, toApiRecord } from '../../utils/platform/api';

function toNullableNumber(value: unknown): number | null {
    return value == null ? null : toNum(value);
}

function toNullableString(value: unknown): string | null {
    return typeof value === 'string' && value ? value : null;
}

function toPaymentStatus(value: unknown): StatementPaymentStatus {
    return value === 'PAID' || value === 'PARTIAL' ? value : 'UNPAID';
}

function normalizeStatementSummary(value: unknown): CreditCardStatementSummary | null {
    if (value == null || typeof value !== 'object') {
        return null;
    }

    const summary = toApiRecord(value);
    const flags = toApiRecord(summary.integrityFlags);

    return {
        statementImportId: toNullableString(summary.statementImportId),
        periodStart: toNullableString(summary.periodStart),
        periodEnd: toNullableString(summary.periodEnd),
        closingBalance: toNullableNumber(summary.closingBalance),
        paidTotal: toNum(summary.paidTotal),
        paymentStatus: toPaymentStatus(summary.paymentStatus),
        remainingStatement: toNum(summary.remainingStatement),
        deferredInstallmentBalance: toNum(summary.deferredInstallmentBalance),
        noInterestTarget: toNullableNumber(summary.noInterestTarget),
        currentPaymentDue: toNullableNumber(summary.currentPaymentDue),
        minimumPayment: toNullableNumber(summary.minimumPayment),
        dueDate: toNullableString(summary.dueDate),
        postCloseSpend: toNum(summary.postCloseSpend),
        postCloseExpenseCount: toNum(summary.postCloseExpenseCount),
        projectedNextCloseDate: toNullableString(summary.projectedNextCloseDate),
        projectedNextCloseAmount: toNum(summary.projectedNextCloseAmount),
        projectedTotalDebt: toNum(summary.projectedTotalDebt),
        nextPlanInstallments: toNum(summary.nextPlanInstallments),
        nextClosePaymentEstimate: toNum(summary.nextClosePaymentEstimate),
        estimatedRemainingAfterNextClose: toNum(summary.estimatedRemainingAfterNextClose),
        overpaid: toNum(summary.overpaid),
        integrityFlags: {
            missingReconciliation: flags.missingReconciliation === true,
            failedReconciliation: flags.failedReconciliation === true,
            missingPaymentBasis: flags.missingPaymentBasis === true,
            conflictingNoInterestTargets: flags.conflictingNoInterestTargets === true,
        },
    };
}

function normalizeNextPayment(value: unknown, fallbackCurrency: string): CreditCardNextPayment | null {
    if (value == null || typeof value !== 'object') {
        return null;
    }

    const payment = toApiRecord(value);
    return {
        amount: toNum(payment.amount),
        currency: normalizeCurrency(toNullableString(payment.currency), fallbackCurrency),
        dueDate: toNullableString(payment.dueDate),
        previousAmount: toNullableNumber(payment.previousAmount),
    };
}

export function normalizeOverviewCard(card: unknown): CreditCardOverviewCard {
    const raw = toApiRecord(card);
    const base = normalizeCreditCard(raw);
    const currency = normalizeCurrency(base.currency, DEFAULT_CURRENCY);
    const currentCycle = toApiRecord(raw.currentCycle);
    const creditStatus = toApiRecord(raw.creditStatus);
    const schedule = toApiRecord(raw.schedule);
    const subscriptions = toApiRecord(raw.subscriptions);
    const flags = toApiRecord(raw.flags);

    return {
        ...base,
        currency,
        currentCycle: {
            currency: normalizeCurrency(toNullableString(currentCycle.currency), currency),
            start: String(currentCycle.start ?? ''),
            end: String(currentCycle.end ?? ''),
            spend: toNum(currentCycle.spend),
            expenseCount: toNum(currentCycle.expenseCount),
            currencyMismatchCount: toNum(currentCycle.currencyMismatchCount),
        },
        creditStatus: {
            currency: normalizeCurrency(toNullableString(creditStatus.currency), currency),
            limit: toNullableNumber(creditStatus.limit),
            availableCredit: toNullableNumber(creditStatus.availableCredit),
            utilizationPercent: toNullableNumber(creditStatus.utilizationPercent),
            owedBalance: toNum(creditStatus.owedBalance),
        },
        statementSummary: normalizeStatementSummary(raw.statementSummary),
        nextPayment: normalizeNextPayment(raw.nextPayment, currency),
        schedule: {
            nextClosingDate: toNullableString(schedule.nextClosingDate),
            daysUntilClosing: toNullableNumber(schedule.daysUntilClosing),
            nextPaymentDueDate: toNullableString(schedule.nextPaymentDueDate),
            daysUntilPaymentDue: toNullableNumber(schedule.daysUntilPaymentDue),
        },
        subscriptions: {
            currency: normalizeCurrency(toNullableString(subscriptions.currency), currency),
            activeCount: toNum(subscriptions.activeCount),
            monthlyRecurringSpend: toNum(subscriptions.monthlyRecurringSpend),
            nextChargeDate: toNullableString(subscriptions.nextChargeDate),
            currencyMismatchCount: toNum(subscriptions.currencyMismatchCount),
        },
        currencyMismatchCount: toNum(raw.currencyMismatchCount),
        flags: {
            missingLimit: flags.missingLimit === true,
            highUtilization: flags.highUtilization === true,
            overLimit: flags.overLimit === true,
            paymentDueSoon: flags.paymentDueSoon === true,
            closingSoon: flags.closingSoon === true,
            currencyMismatch: flags.currencyMismatch === true,
        },
    };
}

function normalizePortfolioCurrency(value: unknown): CreditCardPortfolioCurrency {
    const row = toApiRecord(value);

    return {
        currency: normalizeCurrency(toNullableString(row.currency)),
        cardCount: toNum(row.cardCount),
        totalCreditLimit: toNum(row.totalCreditLimit),
        totalCurrentCycleSpend: toNum(row.totalCurrentCycleSpend),
        totalAvailableCredit: toNum(row.totalAvailableCredit),
        totalOwedBalance: toNum(row.totalOwedBalance),
        totalClosingBalance: toNum(row.totalClosingBalance),
        totalPaid: toNum(row.totalPaid),
        totalStatementRemainder: toNum(row.totalStatementRemainder),
        totalDeferredInstallmentBalance: toNum(row.totalDeferredInstallmentBalance),
        totalCurrentPaymentDue: toNum(row.totalCurrentPaymentDue),
        earliestPaymentDueDate: toNullableString(row.earliestPaymentDueDate),
        totalPostCloseSpend: toNum(row.totalPostCloseSpend),
        postCloseExpenseCount: toNum(row.postCloseExpenseCount),
        totalProjectedNextCloseAmount: toNum(row.totalProjectedNextCloseAmount),
        earliestProjectedNextCloseDate: toNullableString(row.earliestProjectedNextCloseDate),
        totalProjectedDebt: toNum(row.totalProjectedDebt),
        totalNextClosePaymentEstimate: toNum(row.totalNextClosePaymentEstimate),
        totalEstimatedRemainingAfterNextClose: toNum(
            row.totalEstimatedRemainingAfterNextClose,
        ),
        utilizationPercent: toNullableNumber(row.utilizationPercent),
        monthlyRecurringSpend: toNum(row.monthlyRecurringSpend),
    };
}

export function normalizeOverviewResponse(data: unknown): CreditCardsOverviewResponse {
    const raw = toApiRecord(data);
    const portfolio = toApiRecord(raw.portfolio);

    return {
        referenceDate: String(raw.referenceDate ?? ''),
        portfolio: {
            trackedCards: toNum(portfolio.trackedCards),
            activeCards: toNum(portfolio.activeCards),
            cardsWithLimit: toNum(portfolio.cardsWithLimit),
            byCurrency: toApiArray(portfolio.byCurrency).map(normalizePortfolioCurrency),
            paymentDueSoonCount: toNum(portfolio.paymentDueSoonCount),
            highUtilizationCount: toNum(portfolio.highUtilizationCount),
            linkedSubscriptionsCount: toNum(portfolio.linkedSubscriptionsCount),
        },
        cards: toApiArray(raw.cards).map(normalizeOverviewCard),
    };
}
