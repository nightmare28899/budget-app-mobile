import {
    buildAnalyticsInsights,
    buildLocalHistoryPayload,
} from '../../src/modules/local/localFinance';
import {
    buildBudgetSummary,
    calculateDailyBudget,
} from '../../src/modules/local/localFinance.budget';
import { Expense, Subscription, User } from '../../src/types/index';

const user = {
    id: 'user-1',
    currency: 'MXN',
    budgetAmount: 1000,
    budgetPeriod: 'monthly',
} as User;

function expense(
    id: string,
    date: string,
    cost: number,
    categoryId = 'food',
): Expense {
    return {
        id,
        title: id,
        date,
        cost,
        currency: 'MXN',
        categoryId,
    } as Expense;
}

function subscription(
    id: string,
    nextPaymentDate: string,
    cost: number,
): Subscription {
    return {
        id,
        name: id,
        cost,
        currency: 'MXN',
        billingCycle: 'MONTHLY',
        nextPaymentDate,
        isActive: true,
    } as Subscription;
}

describe('local finance calculations', () => {
    it('calculates daily budgets from supported budget periods', () => {
        const now = new Date('2026-02-15T12:00:00.000Z');

        expect(calculateDailyBudget({ ...user, budgetPeriod: 'daily', budgetAmount: 25 } as User, now)).toBe(25);
        expect(calculateDailyBudget({ ...user, budgetPeriod: 'weekly', budgetAmount: 70 } as User, now)).toBe(10);
        expect(calculateDailyBudget({ ...user, budgetPeriod: 'monthly', budgetAmount: 280 } as User, now)).toBe(10);
        expect(calculateDailyBudget({ ...user, budgetPeriod: 'annual', budgetAmount: 365 } as User, now)).toBe(1);
    });

    it('builds a sorted local history while excluding future expenses', () => {
        const payload = buildLocalHistoryPayload({
            user,
            expenses: [
                expense('older', '2026-08-08', 20),
                expense('future', '2026-08-20', 90),
                expense('newer', '2026-08-10', 35),
            ],
            subscriptions: [
                subscription('later', '2026-08-30', 50),
                subscription('sooner', '2026-08-12', 80),
            ],
            now: new Date('2026-08-15T12:00:00.000Z'),
        });

        expect(payload.expenses.map(item => item.id)).toEqual(['newer', 'older']);
        expect(payload.subscriptions.map(item => item.id)).toEqual(['later', 'sooner']);
        expect(payload.summary).toMatchObject({
            expenseCount: 2,
            subscriptionCount: 2,
            totalExpenses: 55,
            totalSubscriptions: 130,
        });
    });

    it('calculates current-period spending and reserved subscriptions', () => {
        const summary = buildBudgetSummary({
            user,
            now: new Date('2026-08-15T12:00:00.000Z'),
            expenses: [
                expense('current', '2026-08-10', 200),
                expense('previous', '2026-07-20', 500),
            ],
            subscriptions: [subscription('monthly', '2026-08-20', 100)],
        });

        expect(summary.totalSpent).toBe(200);
        expect(summary.budgetAmount).toBe(1000);
        expect(summary.reservedSubscriptions).toBe(100);
        expect(summary.remaining).toBe(800);
        expect(summary.safeToSpend).toBe(900);
    });

    it('computes monthly subscription savings and excludes inactive subscriptions', () => {
        const insights = buildAnalyticsInsights(
            {
                user,
                expenses: [],
                subscriptions: [
                    subscription('active', '2026-08-20', 100),
                    { ...subscription('inactive', '2026-08-20', 200), isActive: false },
                ],
                now: new Date('2026-08-15T12:00:00.000Z'),
            },
            6,
        );

        expect(insights.subscriptionSavings).toMatchObject({
            activeSubscriptions: 1,
            monthlyRecurringSpend: 100,
            projectedSavings: 600,
        });
    });
});
