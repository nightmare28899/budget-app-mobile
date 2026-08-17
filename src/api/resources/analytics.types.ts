import { SubscriptionBillingCycle, CategoryBudgetStatusTone } from '../../types/index';

export interface RawPeriod {
    type?: string;
    start?: string;
    end?: string;
}

export interface RawSummaryData {
    period?: RawPeriod;
    budgetPeriod?: string;
    budgetPeriodStart?: string;
    budgetPeriodEnd?: string;
    budgetAmount?: string | number;
    weeklyBudget?: string | number;
    reservedSubscriptions?: string | number;
    safeToSpend?: string | number;
    totalSpent?: string | number;
    remaining?: string | number;
    expenseCount?: string | number;
    dailyAverage?: string | number;
}

export interface RawSpendInsight {
    start?: string;
    end?: string;
    totalSpent?: string | number;
    expenseCount?: string | number;
    averagePerDay?: string | number;
    previousStart?: string;
    previousEnd?: string;
    previousTotalSpent?: string | number;
    changeAmount?: string | number;
    changePercent?: string | number | null;
    projectedTotal?: string | number;
}

export interface RawCategoryInsight {
    name?: string;
    icon?: string;
    color?: string;
    total?: string | number;
    percentage?: string | number;
}

export interface RawSubscriptionInsight {
    id?: string;
    name?: string;
    currency?: string;
    billingCycle?: SubscriptionBillingCycle | 'DAILY';
    amount?: string | number;
    monthlyEquivalent?: string | number;
    projectedSavings?: string | number;
    nextPaymentDate?: string;
}

export interface RawInsightsData {
    referenceDate?: string;
    weeklySpend?: RawSpendInsight;
    monthlySpend?: RawSpendInsight;
    topCategory?: RawCategoryInsight | null;
    subscriptionSavings?: {
        horizonMonths?: string | number;
        monthlyRecurringSpend?: string | number;
        projectedSavings?: string | number;
        activeSubscriptions?: string | number;
        topSubscriptions?: RawSubscriptionInsight[];
    };
}

export interface RawCategoryBudgetItem {
    categoryId?: string;
    name?: string;
    icon?: string;
    color?: string;
    budgetAmount?: string | number;
    spent?: string | number;
    remaining?: string | number;
    percentage?: string | number;
    expenseCount?: string | number;
    status?: CategoryBudgetStatusTone;
}

export interface RawCategoryBudgetOverview {
    period?: RawPeriod;
    items?: RawCategoryBudgetItem[];
    totalBudgeted?: string | number;
    totalSpentBudgeted?: string | number;
    totalRemaining?: string | number;
    categoriesWithBudget?: string | number;
    overBudgetCount?: string | number;
    watchCount?: string | number;
}
