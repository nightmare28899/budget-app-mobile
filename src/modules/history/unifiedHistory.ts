import { Expense, HistoryPayload, Subscription } from '../../types/index';
import { dateOnly } from '../../utils/core/filters';
import { toNum } from '../../utils/core/number';

export type UnifiedHistoryType = 'expense' | 'subscription';

export type UnifiedHistoryRecord = {
    id: string;
    type: UnifiedHistoryType;
    date: string;
    amount: number;
    expense?: Expense;
    subscription?: Subscription;
};

const AUTO_MARKERS = /\b(auto|automatic|subscription|suscripcion)\b/g;

function localDateOnly(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function toTimestamp(value: string): number {
    if (!value) {
        return 0;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return 0;
    }
    return date.getTime();
}

function normalizeName(value: string | null | undefined): string {
    return String(value ?? '')
        .trim()
        .toLowerCase()
        .replace(AUTO_MARKERS, '')
        .replace(/\s+/g, ' ');
}

function amountMatches(a: number, b: number): boolean {
    return Math.abs(toNum(a) - toNum(b)) < 0.01;
}

function dateFromSubscription(subscription: Subscription): string {
    return dateOnly(subscription.chargeDate || subscription.nextPaymentDate);
}

function subscriptionIdFromExpense(expense: Expense): string | null {
    const raw = expense.subscriptionId;
    return typeof raw === 'string' && raw.trim().length ? raw : null;
}

function matchesSubscriptionExpense(expense: Expense, subscription: Subscription): boolean {
    if (!expense.isSubscription) {
        return false;
    }

    const expenseSubscriptionId = subscriptionIdFromExpense(expense);
    if (expenseSubscriptionId && expenseSubscriptionId === subscription.id) {
        return true;
    }

    if (dateOnly(expense.date) !== dateFromSubscription(subscription)) {
        return false;
    }

    if (!amountMatches(expense.cost, subscription.cost)) {
        return false;
    }

    const expenseName = normalizeName(expense.title);
    const subscriptionName = normalizeName(subscription.name);

    if (!expenseName || !subscriptionName) {
        return false;
    }

    return (
        expenseName === subscriptionName
        || expenseName.includes(subscriptionName)
        || subscriptionName.includes(expenseName)
    );
}

function mapExpense(expense: Expense): UnifiedHistoryRecord {
    return {
        id: `expense-${expense.id}`,
        type: 'expense',
        date: dateOnly(expense.date),
        amount: toNum(expense.cost),
        expense,
    };
}

function mapSubscription(subscription: Subscription): UnifiedHistoryRecord {
    return {
        id: `subscription-${subscription.id}`,
        type: 'subscription',
        date: dateOnly(subscription.chargeDate || subscription.nextPaymentDate),
        amount: toNum(subscription.cost),
        subscription,
    };
}

export function buildUnifiedHistory(
    payload: HistoryPayload | null | undefined,
): UnifiedHistoryRecord[] {
    const today = localDateOnly(new Date());
    const expenseRows = payload?.expenses ?? [];
    const expenses = expenseRows.map(mapExpense);
    const subscriptions = (payload?.subscriptions ?? [])
        .filter((item) => {
            const dueDate = dateOnly(item.chargeDate || item.nextPaymentDate);
            return !!dueDate
                && dueDate < today
                && !expenseRows.some((expense) => matchesSubscriptionExpense(expense, item));
        })
        .map(mapSubscription);

    return [...expenses, ...subscriptions].sort((a, b) => {
        if (a.date !== b.date) {
            return b.date.localeCompare(a.date);
        }

        const aDate = a.type === 'expense'
            ? a.expense?.date ?? ''
            : a.subscription?.chargeDate || a.subscription?.nextPaymentDate || '';
        const bDate = b.type === 'expense'
            ? b.expense?.date ?? ''
            : b.subscription?.chargeDate || b.subscription?.nextPaymentDate || '';

        return toTimestamp(bDate) - toTimestamp(aDate);
    });
}

export function getRecentUnifiedHistory(
    payload: HistoryPayload | null | undefined,
    limit = 5,
): UnifiedHistoryRecord[] {
    return buildUnifiedHistory(payload).slice(0, Math.max(0, limit));
}
