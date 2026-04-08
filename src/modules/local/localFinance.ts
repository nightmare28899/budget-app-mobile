import {
    BudgetSummary,
    Category,
    CategoryBreakdown,
    DailyTotal,
    Expense,
    HistoryPayload,
    HistorySummary,
    TodaySummary,
    Subscription,
    User,
    WeeklySummary,
} from '../../types';
import { normalizeBudgetPeriod } from '../../utils/budget';
import { aggregateCurrencyTotals, normalizeCurrency } from '../../utils/currency';
import { dateOnly } from '../../utils/filters';
import {
    calculateReservedFundsForPeriod,
    listUpcomingSubscriptions,
    resolvePeriodRange,
    toSubscriptionManagerItems,
} from '../subscriptions/subscriptionManager';
import { toNum } from '../../utils/number';

type LocalFinanceInput = {
    user: User | null;
    expenses: Expense[];
    subscriptions?: Subscription[];
    categories?: Category[];
    now?: Date;
};

function daysInRangeInclusive(start: Date, end: Date) {
    const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
    const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
    const diff = Math.round((endUtc - startUtc) / (24 * 60 * 60 * 1000));
    return Math.max(diff + 1, 1);
}

function getBudgetPeriod(user: User | null) {
    return normalizeBudgetPeriod(user?.budgetPeriod, 'monthly');
}

function getBudgetAmount(user: User | null) {
    return toNum(user?.budgetAmount ?? user?.dailyBudget);
}

function getCurrentPeriod(input: LocalFinanceInput) {
    const now = input.now ?? new Date();
    const periodType = getBudgetPeriod(input.user);
    return {
        periodType,
        range: resolvePeriodRange(
            periodType,
            input.user?.budgetPeriodStart,
            input.user?.budgetPeriodEnd,
            now,
        ),
    };
}

function filterExpensesByPeriod(expenses: Expense[], start: Date, end: Date) {
    const startTime = new Date(start);
    startTime.setHours(0, 0, 0, 0);
    const endTime = new Date(end);
    endTime.setHours(23, 59, 59, 999);

    return expenses.filter((expense) => {
        const parsed = new Date(expense.date);
        if (Number.isNaN(parsed.getTime())) {
            return false;
        }

        return parsed >= startTime && parsed <= endTime;
    });
}

function filterVisibleExpenses(expenses: Expense[], now = new Date()) {
    const todayKey = dateOnly(now);

    return expenses.filter((expense) => {
        const expenseDate = dateOnly(expense.date);
        return !!expenseDate && expenseDate <= todayKey;
    });
}

export function sortExpensesDesc(expenses: Expense[]) {
    return [...expenses].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
}

export function filterExpensesList(
    expenses: Expense[],
    filters: {
        from?: string;
        to?: string;
        q?: string;
        categoryId?: string;
    },
) {
    const from = filters.from?.trim();
    const to = filters.to?.trim();
    const q = filters.q?.trim().toLowerCase();
    const categoryId = filters.categoryId?.trim();

    return sortExpensesDesc(
        filterVisibleExpenses(expenses).filter((expense) => {
            const expenseDate = dateOnly(expense.date);
            if (from && expenseDate < from) {
                return false;
            }

            if (to && expenseDate > to) {
                return false;
            }

            if (
                categoryId
                && categoryId !== (expense.categoryId ?? expense.category?.id)
            ) {
                return false;
            }

            if (!q) {
                return true;
            }

            const haystack = [
                expense.title,
                expense.note,
                expense.category?.name,
            ]
                .map((item) => String(item ?? '').toLowerCase())
                .join(' ');

            return haystack.includes(q);
        }),
    );
}

export function calculateDailyBudget(user: User | null, now = new Date()) {
    const budgetAmount = getBudgetAmount(user);
    const periodType = getBudgetPeriod(user);
    if (budgetAmount <= 0) {
        return 0;
    }

    if (periodType === 'daily') {
        return budgetAmount;
    }

    if (periodType === 'weekly') {
        return budgetAmount / 7;
    }

    if (periodType === 'monthly') {
        const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        return budgetAmount / Math.max(days, 1);
    }

    if (periodType === 'annual') {
        const yearDays =
            new Date(now.getFullYear(), 1, 29).getMonth() === 1 ? 366 : 365;
        return budgetAmount / yearDays;
    }

    const range = resolvePeriodRange(
        periodType,
        user?.budgetPeriodStart,
        user?.budgetPeriodEnd,
        now,
    );
    return budgetAmount / daysInRangeInclusive(range.start, range.end);
}

export function calculateWeeklyBudget(user: User | null, now = new Date()) {
    const budgetAmount = getBudgetAmount(user);
    const periodType = getBudgetPeriod(user);
    if (budgetAmount <= 0) {
        return 0;
    }

    if (periodType === 'weekly') {
        return budgetAmount;
    }

    return calculateDailyBudget(user, now) * 7;
}

export function buildBudgetSummary({
    user,
    expenses,
    subscriptions = [],
    now,
}: LocalFinanceInput): BudgetSummary {
    const effectiveNow = now ?? new Date();
    const { periodType, range } = getCurrentPeriod({
        user,
        expenses,
        subscriptions,
        now: effectiveNow,
    });
    const visibleExpenses = filterVisibleExpenses(expenses, effectiveNow);
    const expensesInPeriod = filterExpensesByPeriod(visibleExpenses, range.start, range.end);
    const totalSpent = expensesInPeriod.reduce((sum, expense) => sum + toNum(expense.cost), 0);
    const budgetAmount = getBudgetAmount(user);
    const reservedSubscriptions = calculateReservedFundsForPeriod(
        toSubscriptionManagerItems(subscriptions),
        range,
    );
    const totalDays = daysInRangeInclusive(range.start, range.end);

    return {
        period: {
            type: periodType,
            start: range.start.toISOString().slice(0, 10),
            end: range.end.toISOString().slice(0, 10),
        },
        totalSpent,
        budgetAmount,
        reservedSubscriptions,
        safeToSpend: budgetAmount - reservedSubscriptions,
        remaining: budgetAmount - totalSpent,
        expenseCount: expensesInPeriod.length,
        dailyAverage: totalDays > 0 ? totalSpent / totalDays : totalSpent,
        weeklyBudget: calculateWeeklyBudget(user, effectiveNow),
    };
}

export function buildTodaySummary({
    user,
    expenses,
    subscriptions = [],
    now,
}: LocalFinanceInput): TodaySummary {
    const effectiveNow = now ?? new Date();
    const todayKey = dateOnly(effectiveNow);
    const todayExpenses = sortExpensesDesc(
        expenses.filter((expense) => dateOnly(expense.date) === todayKey),
    );
    const todayTotal = todayExpenses.reduce((sum, expense) => sum + toNum(expense.cost), 0);
    const budgetSummary = buildBudgetSummary({
        user,
        expenses,
        subscriptions,
        now: effectiveNow,
    });

    return {
        expenses: todayExpenses,
        total: todayTotal,
        currency: normalizeCurrency(
            todayExpenses[0]?.currency ?? user?.currency,
        ),
        currencyBreakdown: aggregateCurrencyTotals(
            todayExpenses,
            (expense) => expense.cost,
            (expense) => expense.currency,
        ),
        budgetAmount: budgetSummary.budgetAmount,
        budgetPeriod: budgetSummary.period.type,
        budgetPeriodStart: budgetSummary.period.start,
        budgetPeriodEnd: budgetSummary.period.end,
        spentInBudgetPeriod: budgetSummary.totalSpent,
        dailyBudget: calculateDailyBudget(user, effectiveNow),
        remaining: budgetSummary.remaining,
        percentage:
            budgetSummary.budgetAmount > 0
                ? (budgetSummary.totalSpent / budgetSummary.budgetAmount) * 100
                : 0,
    };
}

export function buildDailyTotals(
    expenses: Expense[],
    days = 7,
    now = new Date(),
): DailyTotal[] {
    const totalsByDay = new Map<string, number>();
    const safeDays = Math.max(days, 1);
    const anchorDate = new Date(now);
    anchorDate.setHours(12, 0, 0, 0);

    for (let index = safeDays - 1; index >= 0; index -= 1) {
        const date = new Date(anchorDate);
        date.setDate(date.getDate() - index);
        totalsByDay.set(date.toISOString().slice(0, 10), 0);
    }

    for (const expense of expenses) {
        const key = dateOnly(expense.date);
        if (!totalsByDay.has(key)) {
            continue;
        }

        totalsByDay.set(key, (totalsByDay.get(key) ?? 0) + toNum(expense.cost));
    }

    return Array.from(totalsByDay.entries()).map(([date, total]) => ({ date, total }));
}

export function buildCategoryBreakdown({
    user,
    expenses,
    categories = [],
    now,
}: LocalFinanceInput): CategoryBreakdown[] {
    const effectiveNow = now ?? new Date();
    const { range } = getCurrentPeriod({
        user,
        expenses,
        now: effectiveNow,
    });
    const visibleExpenses = filterVisibleExpenses(expenses, effectiveNow);
    const scopedExpenses = filterExpensesByPeriod(visibleExpenses, range.start, range.end);
    const totals = new Map<string, CategoryBreakdown>();

    for (const expense of scopedExpenses) {
        const categoryId = expense.categoryId ?? expense.category?.id ?? 'uncategorized';
        const category =
            expense.category
            ?? categories.find((item) => item.id === categoryId)
            ?? null;
        const current = totals.get(categoryId);
        const total = (current?.total ?? 0) + toNum(expense.cost);

        totals.set(categoryId, {
            name: category?.name ?? 'Other',
            icon: category?.icon ?? 'cube-outline',
            color: category?.color ?? '#95A5A6',
            total,
            count: (current?.count ?? 0) + 1,
            percentage: 0,
        });
    }

    const values = Array.from(totals.values()).sort((a, b) => b.total - a.total);
    const grandTotal = values.reduce((sum, item) => sum + item.total, 0);

    return values.map((item) => ({
        ...item,
        percentage: grandTotal > 0 ? (item.total / grandTotal) * 100 : 0,
    }));
}

export function buildWeeklySummary({
    user,
    expenses,
    now,
}: LocalFinanceInput): WeeklySummary {
    const effectiveNow = now ?? new Date();
    const range = resolvePeriodRange('weekly', undefined, undefined, effectiveNow);
    const visibleExpenses = filterVisibleExpenses(expenses, effectiveNow);
    const weeklyExpenses = filterExpensesByPeriod(visibleExpenses, range.start, range.end);
    const totalSpent = weeklyExpenses.reduce((sum, expense) => sum + toNum(expense.cost), 0);
    const weeklyBudget = calculateWeeklyBudget(user, effectiveNow);

    return {
        period: {
            type: 'weekly',
            start: range.start.toISOString().slice(0, 10),
            end: range.end.toISOString().slice(0, 10),
        },
        totalSpent,
        budgetAmount: weeklyBudget,
        weeklyBudget,
        remaining: weeklyBudget - totalSpent,
        expenseCount: weeklyExpenses.length,
        dailyAverage: totalSpent / 7,
    };
}

function buildHistorySummary(
    expenses: Expense[],
    subscriptions: Subscription[],
): HistorySummary {
    const totalExpenses = expenses.reduce((sum, expense) => sum + toNum(expense.cost), 0);
    const totalSubscriptions = subscriptions.reduce(
        (sum, subscription) => sum + toNum(subscription.cost),
        0,
    );

    return {
        expenseCount: expenses.length,
        subscriptionCount: subscriptions.length,
        totalExpenses,
        totalSubscriptions,
        total: totalExpenses + totalSubscriptions,
        expenseCurrency: normalizeCurrency(expenses[0]?.currency),
        expenseTotalsByCurrency: aggregateCurrencyTotals(
            expenses,
            (expense) => expense.cost,
            (expense) => expense.currency,
        ),
        subscriptionTotalsByCurrency: aggregateCurrencyTotals(
            subscriptions,
            (subscription) => subscription.cost,
            (subscription) => subscription.currency,
        ),
    };
}

export function buildLocalHistoryPayload({
    user,
    expenses,
    subscriptions = [],
}: LocalFinanceInput): HistoryPayload {
    const visibleExpenses = filterVisibleExpenses(expenses);

    return {
        user,
        summary: buildHistorySummary(visibleExpenses, subscriptions),
        expenses: sortExpensesDesc(visibleExpenses),
        subscriptions: [...subscriptions].sort(
            (a, b) =>
                new Date(b.nextPaymentDate).getTime() - new Date(a.nextPaymentDate).getTime(),
        ),
    };
}

export function buildUpcomingSubscriptions(
    subscriptions: Subscription[],
    days = 3,
    now = new Date(),
) {
    const upcoming = listUpcomingSubscriptions(
        toSubscriptionManagerItems(subscriptions),
        days,
        now,
    );
    const subscriptionMap = new Map(subscriptions.map((subscription) => [subscription.id, subscription]));

    return upcoming
        .map((item) => {
            const source = subscriptionMap.get(item.subscription.id);
            if (!source) {
                return null;
            }

            return {
                id: source.id,
                subscriptionId: source.id,
                name: source.name,
                amount: toNum(source.cost),
                currency: source.currency,
                daysRemaining: item.daysUntilDue,
                paymentMethod: source.paymentMethod,
                creditCardId: source.creditCardId,
                creditCard: source.creditCard,
                chargeDate: item.dueDate,
                nextPaymentDate: source.nextPaymentDate,
            };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);
}
