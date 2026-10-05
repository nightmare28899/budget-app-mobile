import {
    CreditCard,
    CreditCardOverviewCard,
    CreditCardPortfolioCurrency,
    CreditCardsOverviewResponse,
    Expense,
    Subscription,
} from '../../types/index';
import { toNum } from '../../utils/core/number';
import { DEFAULT_CURRENCY, normalizeCurrency } from '../../utils/domain/currency';

type BuildCreditCardsOverviewParams = {
    creditCards: CreditCard[];
    expenses: Expense[];
    subscriptions: Subscription[];
    now?: Date;
};

function startOfDay(date: Date) {
    const next = new Date(date);
    next.setHours(0, 0, 0, 0);
    return next;
}

function endOfDay(date: Date) {
    const next = new Date(date);
    next.setHours(23, 59, 59, 999);
    return next;
}

function formatDateOnly(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function resolveMonthlyDay(anchor: Date, day: number, useEndOfDay = false) {
    const year = anchor.getFullYear();
    const month = anchor.getMonth();
    const maxDay = new Date(year, month + 1, 0).getDate();
    const safeDay = Math.max(1, Math.min(day, maxDay));
    const date = new Date(year, month, safeDay);

    return useEndOfDay ? endOfDay(date) : startOfDay(date);
}

function resolveCurrentCycleWindow(closingDay: number | null | undefined, now: Date) {
    if (!closingDay || closingDay < 1 || closingDay > 31) {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return {
            start: startOfDay(start),
            end: endOfDay(end),
        };
    }

    const currentClose = resolveMonthlyDay(now, closingDay, true);

    if (now.getTime() <= currentClose.getTime()) {
        const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const previousClose = resolveMonthlyDay(previousMonth, closingDay, true);
        const start = new Date(previousClose);
        start.setDate(start.getDate() + 1);
        return {
            start: startOfDay(start),
            end: currentClose,
        };
    }

    const start = new Date(currentClose);
    start.setDate(start.getDate() + 1);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return {
        start: startOfDay(start),
        end: resolveMonthlyDay(nextMonth, closingDay, true),
    };
}

function resolveUpcomingDay(day: number | null | undefined, now: Date) {
    if (!day || day < 1 || day > 31) {
        return null;
    }

    const currentMonthDate = resolveMonthlyDay(now, day, true);
    if (now.getTime() <= currentMonthDate.getTime()) {
        return currentMonthDate;
    }

    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return resolveMonthlyDay(nextMonth, day, true);
}

function daysUntil(target: Date | null, now: Date) {
    if (!target) {
        return null;
    }

    const targetDate = startOfDay(target);
    const today = startOfDay(now);
    return Math.round((targetDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

function roundMoney(value: number) {
    return Number(value.toFixed(2));
}

function roundPercent(value: number) {
    return Number(value.toFixed(1));
}

function getMonthlyFactor(billingCycle?: Subscription['billingCycle']) {
    switch (billingCycle) {
        case 'WEEKLY':
            return 52 / 12;
        case 'YEARLY':
            return 1 / 12;
        case 'MONTHLY':
        default:
            return 1;
    }
}

function buildPortfolioByCurrency(
    cards: CreditCardOverviewCard[],
): CreditCardPortfolioCurrency[] {
    const currencies = [...new Set(cards.map((card) => card.currency))].sort();

    return currencies.map((currency) => {
        const group = cards.filter((card) => card.currency === currency);
        const sum = (pick: (card: CreditCardOverviewCard) => number) =>
            roundMoney(group.reduce((total, card) => total + pick(card), 0));
        const totalCreditLimit = sum((card) => card.creditStatus.limit ?? 0);
        const totalCurrentCycleSpend = sum((card) => card.currentCycle.spend);

        return {
            currency,
            cardCount: group.length,
            totalCreditLimit,
            totalCurrentCycleSpend,
            totalAvailableCredit: sum((card) => card.creditStatus.availableCredit ?? 0),
            totalOwedBalance: totalCurrentCycleSpend,
            totalClosingBalance: 0,
            totalPaid: 0,
            totalStatementRemainder: 0,
            totalDeferredInstallmentBalance: 0,
            totalCurrentPaymentDue: 0,
            earliestPaymentDueDate: null,
            totalPostCloseSpend: 0,
            postCloseExpenseCount: 0,
            totalProjectedNextCloseAmount: 0,
            earliestProjectedNextCloseDate: null,
            totalProjectedDebt: totalCurrentCycleSpend,
            totalNextClosePaymentEstimate: 0,
            totalEstimatedRemainingAfterNextClose: 0,
            utilizationPercent: totalCreditLimit > 0
                ? roundPercent((totalCurrentCycleSpend / totalCreditLimit) * 100)
                : null,
            monthlyRecurringSpend: sum((card) => card.subscriptions.monthlyRecurringSpend),
        };
    });
}

export function buildCreditCardsOverview({
    creditCards,
    expenses,
    subscriptions,
    now,
}: BuildCreditCardsOverviewParams): CreditCardsOverviewResponse {
    const effectiveNow = now ?? new Date();

    if (!creditCards.length) {
        return {
            referenceDate: formatDateOnly(effectiveNow),
            portfolio: {
                trackedCards: 0,
                activeCards: 0,
                cardsWithLimit: 0,
                byCurrency: [],
                paymentDueSoonCount: 0,
                highUtilizationCount: 0,
                linkedSubscriptionsCount: 0,
            },
            cards: [],
        };
    }

    const overviewCards: CreditCardOverviewCard[] = creditCards.map((card) => {
        const cycleWindow = resolveCurrentCycleWindow(card.closingDay, effectiveNow);
        const nextClosingDate = resolveUpcomingDay(card.closingDay, effectiveNow);
        const nextPaymentDueDate = resolveUpcomingDay(card.paymentDueDay, effectiveNow);
        const cardExpenses = expenses.filter((expense) => {
            if (expense.creditCardId !== card.id) {
                return false;
            }

            const expenseDate = new Date(expense.date);
            return expenseDate.getTime() >= cycleWindow.start.getTime()
                && expenseDate.getTime() <= effectiveNow.getTime();
        });
        const activeSubscriptions = subscriptions.filter((subscription) => {
            return subscription.creditCardId === card.id && subscription.isActive !== false;
        });
        const currentCycleSpend = roundMoney(
            cardExpenses.reduce((sum, expense) => sum + toNum(expense.cost), 0),
        );
        const monthlyRecurringSpend = roundMoney(
            activeSubscriptions.reduce((sum, subscription) => {
                return sum + toNum(subscription.cost) * getMonthlyFactor(subscription.billingCycle);
            }, 0),
        );
        const limit = card.creditLimit == null ? null : roundMoney(toNum(card.creditLimit));
        const availableCredit = limit == null ? null : roundMoney(limit - currentCycleSpend);
        const utilizationPercent = limit && limit > 0
            ? roundPercent((currentCycleSpend / limit) * 100)
            : null;
        const nextChargeDate = activeSubscriptions
            .map((subscription) => new Date(subscription.nextPaymentDate))
            .filter((date) => !Number.isNaN(date.getTime()))
            .sort((left, right) => left.getTime() - right.getTime())[0] ?? null;

        const currency = normalizeCurrency(card.currency, DEFAULT_CURRENCY);

        return {
            ...card,
            currency,
            statementSummary: null,
            nextPayment: null,
            currencyMismatchCount: 0,
            currentCycle: {
                start: formatDateOnly(cycleWindow.start),
                end: formatDateOnly(cycleWindow.end),
                spend: currentCycleSpend,
                expenseCount: cardExpenses.length,
            },
            creditStatus: {
                limit,
                availableCredit,
                utilizationPercent,
                owedBalance: currentCycleSpend,
            },
            schedule: {
                nextClosingDate: nextClosingDate ? formatDateOnly(nextClosingDate) : null,
                daysUntilClosing: daysUntil(nextClosingDate, effectiveNow),
                nextPaymentDueDate: nextPaymentDueDate ? formatDateOnly(nextPaymentDueDate) : null,
                daysUntilPaymentDue: daysUntil(nextPaymentDueDate, effectiveNow),
            },
            subscriptions: {
                activeCount: activeSubscriptions.length,
                monthlyRecurringSpend,
                nextChargeDate: nextChargeDate ? formatDateOnly(nextChargeDate) : null,
            },
            flags: {
                missingLimit: limit == null,
                highUtilization: utilizationPercent != null && utilizationPercent >= 70,
                overLimit: availableCredit != null && availableCredit < 0,
                paymentDueSoon:
                    daysUntil(nextPaymentDueDate, effectiveNow) != null
                    && (daysUntil(nextPaymentDueDate, effectiveNow) ?? 99) >= 0
                    && (daysUntil(nextPaymentDueDate, effectiveNow) ?? 99) <= 7,
                closingSoon:
                    daysUntil(nextClosingDate, effectiveNow) != null
                    && (daysUntil(nextClosingDate, effectiveNow) ?? 99) >= 0
                    && (daysUntil(nextClosingDate, effectiveNow) ?? 99) <= 5,
            },
        };
    });

    const activeOverviewCards = overviewCards.filter((card) => card.isActive);
    const byCurrency = buildPortfolioByCurrency(activeOverviewCards);

    return {
        referenceDate: formatDateOnly(effectiveNow),
        portfolio: {
            trackedCards: creditCards.length,
            activeCards: activeOverviewCards.length,
            cardsWithLimit: activeOverviewCards.filter((card) => {
                return card.creditStatus.limit != null && card.creditStatus.limit > 0;
            }).length,
            byCurrency,
            paymentDueSoonCount: activeOverviewCards.filter((card) => card.flags.paymentDueSoon).length,
            highUtilizationCount: activeOverviewCards.filter((card) => {
                return card.flags.highUtilization || card.flags.overLimit;
            }).length,
            linkedSubscriptionsCount: activeOverviewCards.reduce(
                (sum, card) => sum + card.subscriptions.activeCount,
                0,
            ),
        },
        cards: overviewCards,
    };
}
