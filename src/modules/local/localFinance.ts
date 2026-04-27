import {
  AnalyticsCategoryImpact,
  AnalyticsInsights,
  AnalyticsSpendInsight,
  AnalyticsSubscriptionOpportunity,
  AnalyticsSubscriptionSavings,
  Category,
  CategoryBreakdown,
  Expense,
  HistoryPayload,
  HistorySummary,
  Income,
  ReportPeriodType,
  ReportSnapshot,
  SavingsGoal,
  Subscription,
} from '../../types/index';
import {
  aggregateCurrencyTotals,
  normalizeCurrency,
} from '../../utils/domain/currency';
import {
  listUpcomingSubscriptions,
  toSubscriptionManagerItems,
} from '../subscriptions/subscriptionManager';
import { toNum } from '../../utils/core/number';
import {
  addDays,
  daysInRangeInclusive,
  endOfDay,
  formatDateLocal,
  getDaysInMonth,
  startOfMonth,
  startOfWeek,
} from './localFinance.dates';
import {
  filterExpensesByPeriod,
  filterIncomesByPeriod,
  filterVisibleExpenses,
  filterVisibleIncomes,
  sortExpensesDesc,
} from './localFinance.filters';
import {
  buildBudgetSummary,
  buildCategoryBudgetOverview,
  LocalFinanceInput,
  roundMoney,
  roundPercent,
} from './localFinance.budget';

// ─── Analytics ───────────────────────────────────────────────────────────────

function normalizeHorizonMonths(raw?: number) {
  return Math.min(24, Math.max(1, Math.floor(raw || 6)));
}

function buildSpendInsight(
  expenses: Expense[],
  currentStart: Date,
  currentEnd: Date,
  previousStart: Date,
  previousEnd: Date,
): AnalyticsSpendInsight {
  const currentExpenses = filterExpensesByPeriod(
    expenses,
    currentStart,
    currentEnd,
  );
  const previousExpenses = filterExpensesByPeriod(
    expenses,
    previousStart,
    previousEnd,
  );
  const totalSpent = currentExpenses.reduce(
    (sum, expense) => sum + toNum(expense.cost),
    0,
  );
  const previousTotalSpent = previousExpenses.reduce(
    (sum, expense) => sum + toNum(expense.cost),
    0,
  );
  const changeAmount = totalSpent - previousTotalSpent;
  const trackedDays = daysInRangeInclusive(currentStart, currentEnd);

  return {
    start: formatDateLocal(currentStart),
    end: formatDateLocal(currentEnd),
    totalSpent: roundMoney(totalSpent),
    expenseCount: currentExpenses.length,
    averagePerDay: roundMoney(totalSpent / trackedDays),
    previousStart: formatDateLocal(previousStart),
    previousEnd: formatDateLocal(previousEnd),
    previousTotalSpent: roundMoney(previousTotalSpent),
    changeAmount: roundMoney(changeAmount),
    changePercent:
      previousTotalSpent > 0
        ? roundPercent((changeAmount / previousTotalSpent) * 100)
        : null,
  };
}

function buildTopCategoryImpact(
  expenses: Expense[],
  categories: Category[],
): AnalyticsCategoryImpact | null {
  const totals = new Map<string, AnalyticsCategoryImpact>();

  for (const expense of expenses) {
    const categoryId =
      expense.categoryId ?? expense.category?.id ?? 'uncategorized';
    const category =
      expense.category ??
      categories.find(item => item.id === categoryId) ??
      null;
    const name = category?.name ?? 'Other';
    const current = totals.get(name);

    totals.set(name, {
      name,
      icon: category?.icon ?? 'cube-outline',
      color: category?.color ?? '#95A5A6',
      total: (current?.total ?? 0) + toNum(expense.cost),
      percentage: 0,
    });
  }

  const values = Array.from(totals.values()).sort((a, b) => b.total - a.total);
  if (!values.length) {
    return null;
  }

  const grandTotal = values.reduce((sum, item) => sum + item.total, 0);
  const top = values[0];

  return {
    ...top,
    total: roundMoney(top.total),
    percentage:
      grandTotal > 0 ? roundPercent((top.total / grandTotal) * 100) : 0,
  };
}

function buildCategoryBreakdownFromExpenses(
  expenses: Expense[],
  categories: Category[],
): CategoryBreakdown[] {
  const totals = new Map<string, CategoryBreakdown>();

  for (const expense of expenses) {
    const categoryId =
      expense.categoryId ?? expense.category?.id ?? 'uncategorized';
    const category =
      expense.category ??
      categories.find(item => item.id === categoryId) ??
      null;
    const current = totals.get(categoryId);
    const total = (current?.total ?? 0) + toNum(expense.cost);

    totals.set(categoryId, {
      name: category?.name ?? 'Other',
      icon: category?.icon ?? 'cube-outline',
      color: category?.color ?? '#95A5A6',
      total: roundMoney(total),
      count: (current?.count ?? 0) + 1,
      percentage: 0,
    });
  }

  const values = Array.from(totals.values()).sort((a, b) => b.total - a.total);
  const grandTotal = values.reduce((sum, item) => sum + item.total, 0);

  return values.map(item => ({
    ...item,
    percentage: grandTotal > 0 ? roundPercent((item.total / grandTotal) * 100) : 0,
  }));
}

function getMonthlyFactor(
  billingCycle?: Subscription['billingCycle'] | 'DAILY',
) {
  switch (billingCycle) {
    case 'DAILY':
      return 365 / 12;
    case 'WEEKLY':
      return 52 / 12;
    case 'YEARLY':
      return 1 / 12;
    case 'MONTHLY':
    default:
      return 1;
  }
}

function buildSubscriptionSavings(
  subscriptions: Subscription[],
  horizonMonths: number,
  now: Date,
): AnalyticsSubscriptionSavings {
  const activeSubscriptions = subscriptions.filter(subscription => {
    if (subscription.isActive === false) {
      return false;
    }

    if (!subscription.createdAt) {
      return true;
    }

    const createdAt = new Date(subscription.createdAt);
    return (
      !Number.isNaN(createdAt.getTime()) && createdAt.getTime() <= now.getTime()
    );
  });

  const topSubscriptions: AnalyticsSubscriptionOpportunity[] =
    activeSubscriptions
      .map(subscription => {
        const monthlyEquivalent =
          toNum(subscription.cost) *
          getMonthlyFactor(subscription.billingCycle);

        return {
          id: subscription.id,
          name: subscription.name,
          currency: subscription.currency,
          billingCycle: subscription.billingCycle,
          amount: roundMoney(toNum(subscription.cost)),
          monthlyEquivalent: roundMoney(monthlyEquivalent),
          projectedSavings: roundMoney(monthlyEquivalent * horizonMonths),
          nextPaymentDate: String(subscription.nextPaymentDate).slice(0, 10),
        };
      })
      .sort((a, b) => b.monthlyEquivalent - a.monthlyEquivalent)
      .slice(0, 3);

  const monthlyRecurringSpend = activeSubscriptions.reduce(
    (sum, subscription) =>
      sum +
      toNum(subscription.cost) * getMonthlyFactor(subscription.billingCycle),
    0,
  );

  return {
    horizonMonths,
    monthlyRecurringSpend: roundMoney(monthlyRecurringSpend),
    projectedSavings: roundMoney(monthlyRecurringSpend * horizonMonths),
    activeSubscriptions: activeSubscriptions.length,
    topSubscriptions,
  };
}

export function buildAnalyticsInsights(
  { expenses, subscriptions = [], categories = [], now }: LocalFinanceInput,
  horizonMonths = 6,
): AnalyticsInsights {
  const effectiveNow = now ?? new Date();
  const visibleExpenses = filterVisibleExpenses(expenses, effectiveNow);
  const normalizedHorizonMonths = normalizeHorizonMonths(horizonMonths);

  const weeklyCurrentStart = startOfWeek(effectiveNow);
  const weeklyComparableDays = daysInRangeInclusive(
    weeklyCurrentStart,
    effectiveNow,
  );
  const weeklyPreviousStart = addDays(weeklyCurrentStart, -7);
  const weeklyPreviousEnd = endOfDay(
    addDays(weeklyPreviousStart, weeklyComparableDays - 1),
  );

  const monthlyCurrentStart = startOfMonth(effectiveNow);
  const previousMonthStart = startOfMonth(
    new Date(effectiveNow.getFullYear(), effectiveNow.getMonth() - 1, 1),
  );
  const previousMonthEnd = endOfDay(
    new Date(
      previousMonthStart.getFullYear(),
      previousMonthStart.getMonth(),
      Math.min(effectiveNow.getDate(), getDaysInMonth(previousMonthStart)),
    ),
  );

  const weeklySpend = buildSpendInsight(
    visibleExpenses,
    weeklyCurrentStart,
    effectiveNow,
    weeklyPreviousStart,
    weeklyPreviousEnd,
  );
  const monthlySpendBase = buildSpendInsight(
    visibleExpenses,
    monthlyCurrentStart,
    effectiveNow,
    previousMonthStart,
    previousMonthEnd,
  );
  const monthlyExpenses = filterExpensesByPeriod(
    visibleExpenses,
    monthlyCurrentStart,
    effectiveNow,
  );
  const trackedMonthDays = daysInRangeInclusive(
    monthlyCurrentStart,
    effectiveNow,
  );
  const projectedTotal =
    trackedMonthDays > 0
      ? (monthlySpendBase.totalSpent / trackedMonthDays) *
        getDaysInMonth(effectiveNow)
      : monthlySpendBase.totalSpent;

  return {
    referenceDate: formatDateLocal(effectiveNow),
    weeklySpend,
    monthlySpend: {
      ...monthlySpendBase,
      projectedTotal: roundMoney(projectedTotal),
    },
    topCategory: buildTopCategoryImpact(monthlyExpenses, categories),
    subscriptionSavings: buildSubscriptionSavings(
      subscriptions,
      normalizedHorizonMonths,
      effectiveNow,
    ),
  };
}

// ─── History ─────────────────────────────────────────────────────────────────

function buildHistorySummary(
  expenses: Expense[],
  subscriptions: Subscription[],
): HistorySummary {
  const totalExpenses = expenses.reduce(
    (sum, expense) => sum + toNum(expense.cost),
    0,
  );
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
      expense => expense.cost,
      expense => expense.currency,
    ),
    subscriptionTotalsByCurrency: aggregateCurrencyTotals(
      subscriptions,
      subscription => subscription.cost,
      subscription => subscription.currency,
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
        new Date(b.nextPaymentDate).getTime() -
        new Date(a.nextPaymentDate).getTime(),
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
  const subscriptionMap = new Map(
    subscriptions.map(subscription => [subscription.id, subscription]),
  );

  return upcoming
    .map(item => {
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

// ─── Report Snapshot ─────────────────────────────────────────────────────────

function getReportWindow(periodType: ReportPeriodType, now: Date) {
  const referenceDate = endOfDay(now);
  const start =
    periodType === 'monthly'
      ? startOfMonth(referenceDate)
      : startOfWeek(referenceDate);

  return {
    start,
    end: referenceDate,
    trackedDays: daysInRangeInclusive(start, referenceDate),
  };
}

export function buildReportSnapshot(
  {
    user,
    expenses,
    incomes = [],
    subscriptions = [],
    categories = [],
    savingsGoals = [],
    now,
  }: LocalFinanceInput,
  periodType: ReportPeriodType = 'weekly',
  horizonMonths = 6,
): ReportSnapshot {
  const effectiveNow = now ?? new Date();
  const reportWindow = getReportWindow(periodType, effectiveNow);
  const visibleExpenses = filterVisibleExpenses(expenses, effectiveNow);
  const visibleIncomes = filterVisibleIncomes(incomes, effectiveNow);
  const scopedExpenses = filterExpensesByPeriod(
    visibleExpenses,
    reportWindow.start,
    reportWindow.end,
  );
  const scopedIncomes = filterIncomesByPeriod(
    visibleIncomes,
    reportWindow.start,
    reportWindow.end,
  );
  const totalSpent = scopedExpenses.reduce(
    (sum, expense) => sum + toNum(expense.cost),
    0,
  );
  const totalIncome = scopedIncomes.reduce(
    (sum, income) => sum + toNum(income.amount),
    0,
  );
  const net = totalIncome - totalSpent;
  const plan = buildBudgetSummary({
    user,
    expenses,
    subscriptions,
    now: effectiveNow,
  });
  const categoryBudgets = buildCategoryBudgetOverview({
    user,
    expenses,
    categories,
    now: effectiveNow,
  });
  const insights = buildAnalyticsInsights(
    {
      user,
      expenses,
      subscriptions,
      categories,
      now: effectiveNow,
    },
    horizonMonths,
  );
  const categoryBreakdown = buildCategoryBreakdownFromExpenses(
    scopedExpenses,
    categories,
  );
  const totalSaved = savingsGoals.reduce(
    (sum, goal) => sum + toNum(goal.currentAmount),
    0,
  );
  const totalTarget = savingsGoals.reduce(
    (sum, goal) => sum + toNum(goal.targetAmount),
    0,
  );
  const nextGoal =
    [...savingsGoals]
      .filter(goal => {
        if (!goal.targetDate) {
          return false;
        }
        const targetDate = new Date(goal.targetDate);
        return (
          !Number.isNaN(targetDate.getTime()) &&
          targetDate.getTime() >= reportWindow.end.getTime()
        );
      })
      .sort((a, b) =>
        String(a.targetDate).localeCompare(String(b.targetDate)),
      )[0] ?? null;
  const suggestedSavingsMove = Math.max(
    0,
    roundMoney(
      Math.min(Math.max(net, 0), Math.max(toNum(plan.safeToSpend), 0)) * 0.2,
    ),
  );

  return {
    generatedAt: new Date().toISOString(),
    report: {
      type: periodType,
      label: periodType === 'monthly' ? 'Monthly' : 'Weekly',
      referenceDate: formatDateLocal(effectiveNow),
      start: formatDateLocal(reportWindow.start),
      end: formatDateLocal(reportWindow.end),
      trackedDays: reportWindow.trackedDays,
    },
    summary: {
      totalIncome: roundMoney(totalIncome),
      incomeCount: scopedIncomes.length,
      averageIncome:
        scopedIncomes.length > 0
          ? roundMoney(totalIncome / scopedIncomes.length)
          : 0,
      totalSpent: roundMoney(totalSpent),
      expenseCount: scopedExpenses.length,
      averagePerDay: roundMoney(totalSpent / reportWindow.trackedDays),
      net: roundMoney(net),
      savingsRate:
        totalIncome > 0 ? roundPercent((net / totalIncome) * 100) : null,
    },
    plan,
    categoryBudgets: {
      overBudgetCount: categoryBudgets.overBudgetCount,
      watchCount: categoryBudgets.watchCount,
    },
    categories: categoryBreakdown,
    insights,
    savings: {
      goalCount: savingsGoals.length,
      totalSaved: roundMoney(totalSaved),
      totalTarget: roundMoney(totalTarget),
      progressPercent:
        totalTarget > 0 ? roundPercent((totalSaved / totalTarget) * 100) : null,
      nextGoal: nextGoal
        ? {
            id: nextGoal.id,
            title: nextGoal.title,
            targetDate: nextGoal.targetDate
              ? String(nextGoal.targetDate).slice(0, 10)
              : null,
            currentAmount: roundMoney(toNum(nextGoal.currentAmount)),
            targetAmount: roundMoney(toNum(nextGoal.targetAmount)),
          }
        : null,
    },
    highlights: {
      suggestedSavingsMove,
    },
  };
}

// ─── Re-exports (backward compatibility) ─────────────────────────────────────

export { sortExpensesDesc, filterExpensesList } from './localFinance.filters';
export {
  calculateDailyBudget,
  calculateWeeklyBudget,
  buildBudgetSummary,
  buildIncomeSummary,
  buildTodaySummary,
  buildDailyTotals,
  buildCategoryBreakdown,
  buildCategoryBudgetOverview,
  buildWeeklySummary,
} from './localFinance.budget';
