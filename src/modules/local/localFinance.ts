import {
  AnalyticsCategoryImpact,
  AnalyticsInsights,
  AnalyticsSpendInsight,
  AnalyticsSubscriptionOpportunity,
  AnalyticsSubscriptionSavings,
  BudgetSummary,
  Category,
  CategoryBudgetOverview,
  CategoryBudgetStatus,
  CategoryBudgetStatusTone,
  CategoryBreakdown,
  DailyTotal,
  Expense,
  HistoryPayload,
  HistorySummary,
  Income,
  IncomeSummary,
  ReportPeriodType,
  ReportSnapshot,
  SavingsGoal,
  TodaySummary,
  Subscription,
  User,
  WeeklySummary,
} from '../../types/index';
import { normalizeBudgetPeriod } from '../../utils/domain/budget';
import {
  aggregateCurrencyTotals,
  normalizeCurrency,
} from '../../utils/domain/currency';
import { dateOnly } from '../../utils/core/filters';
import {
  calculateReservedFundsForPeriod,
  listUpcomingSubscriptions,
  resolvePeriodRange,
  toSubscriptionManagerItems,
} from '../subscriptions/subscriptionManager';
import { toNum } from '../../utils/core/number';

type LocalFinanceInput = {
  user: User | null;
  expenses: Expense[];
  incomes?: Income[];
  subscriptions?: Subscription[];
  categories?: Category[];
  savingsGoals?: SavingsGoal[];
  now?: Date;
};

function daysInRangeInclusive(start: Date, end: Date) {
  const startUtc = Date.UTC(
    start.getFullYear(),
    start.getMonth(),
    start.getDate(),
  );
  const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  const diff = Math.round((endUtc - startUtc) / (24 * 60 * 60 * 1000));
  return Math.max(diff + 1, 1);
}

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

function startOfWeek(date: Date) {
  const next = startOfDay(date);
  const dayOfWeek = next.getDay();
  next.setDate(next.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  return next;
}

function startOfMonth(date: Date) {
  return startOfDay(new Date(date.getFullYear(), date.getMonth(), 1));
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getDaysInMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function roundPercent(value: number) {
  return Math.round(value * 10) / 10;
}

function getCategoryBudgetTone(
  spent: number,
  budgetAmount: number,
): CategoryBudgetStatusTone {
  if (budgetAmount <= 0) {
    return 'no_budget';
  }

  if (spent > budgetAmount) {
    return 'off_track';
  }

  if (spent >= budgetAmount * 0.8) {
    return 'watch';
  }

  return 'on_track';
}

function getCategoryBudgetSortWeight(status: CategoryBudgetStatusTone) {
  switch (status) {
    case 'off_track':
      return 0;
    case 'watch':
      return 1;
    case 'on_track':
      return 2;
    case 'no_budget':
    default:
      return 3;
  }
}

function normalizeHorizonMonths(raw?: number) {
  return Math.min(24, Math.max(1, Math.floor(raw || 6)));
}

function formatDateLocal(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getBudgetPeriod(user: User | null) {
  return normalizeBudgetPeriod(user?.budgetPeriod, 'monthly');
}

function getBudgetAmount(user: User | null) {
  return toNum(user?.budgetAmount);
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

  return expenses.filter(expense => {
    const parsed = new Date(expense.date);
    if (Number.isNaN(parsed.getTime())) {
      return false;
    }

    return parsed >= startTime && parsed <= endTime;
  });
}

function filterVisibleExpenses(expenses: Expense[], now = new Date()) {
  const todayKey = dateOnly(now);

  return expenses.filter(expense => {
    const expenseDate = dateOnly(expense.date);
    return !!expenseDate && expenseDate <= todayKey;
  });
}

function filterIncomesByPeriod(incomes: Income[], start: Date, end: Date) {
  const startTime = new Date(start);
  startTime.setHours(0, 0, 0, 0);
  const endTime = new Date(end);
  endTime.setHours(23, 59, 59, 999);

  return incomes.filter(income => {
    const parsed = new Date(income.date);
    if (Number.isNaN(parsed.getTime())) {
      return false;
    }

    return parsed >= startTime && parsed <= endTime;
  });
}

function filterVisibleIncomes(incomes: Income[], now = new Date()) {
  const todayKey = dateOnly(now);

  return incomes.filter(income => {
    const incomeDate = dateOnly(income.date);
    return !!incomeDate && incomeDate <= todayKey;
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
    filterVisibleExpenses(expenses).filter(expense => {
      const expenseDate = dateOnly(expense.date);
      if (from && expenseDate < from) {
        return false;
      }

      if (to && expenseDate > to) {
        return false;
      }

      if (
        categoryId &&
        categoryId !== (expense.categoryId ?? expense.category?.id)
      ) {
        return false;
      }

      if (!q) {
        return true;
      }

      const haystack = [expense.title, expense.note, expense.category?.name]
        .map(item => String(item ?? '').toLowerCase())
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
  const expensesInPeriod = filterExpensesByPeriod(
    visibleExpenses,
    range.start,
    range.end,
  );
  const totalSpent = expensesInPeriod.reduce(
    (sum, expense) => sum + toNum(expense.cost),
    0,
  );
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

export function buildIncomeSummary({
  user,
  expenses,
  incomes = [],
  now,
}: LocalFinanceInput): IncomeSummary {
  const effectiveNow = now ?? new Date();
  const { periodType, range } = getCurrentPeriod({
    user,
    expenses,
    incomes,
    now: effectiveNow,
  });
  const trackedEnd =
    endOfDay(effectiveNow) < range.end ? endOfDay(effectiveNow) : range.end;
  const visibleExpenses = filterVisibleExpenses(expenses, effectiveNow);
  const visibleIncomes = filterVisibleIncomes(incomes, effectiveNow);
  const expensesInPeriod = filterExpensesByPeriod(
    visibleExpenses,
    range.start,
    trackedEnd,
  );
  const incomesInPeriod = filterIncomesByPeriod(
    visibleIncomes,
    range.start,
    trackedEnd,
  );
  const totalIncome = incomesInPeriod.reduce(
    (sum, income) => sum + toNum(income.amount),
    0,
  );
  const totalExpenses = expensesInPeriod.reduce(
    (sum, expense) => sum + toNum(expense.cost),
    0,
  );
  const net = totalIncome - totalExpenses;

  return {
    period: {
      type: periodType,
      start: range.start.toISOString().slice(0, 10),
      end: trackedEnd.toISOString().slice(0, 10),
    },
    totalIncome: roundMoney(totalIncome),
    totalExpenses: roundMoney(totalExpenses),
    net: roundMoney(net),
    incomeCount: incomesInPeriod.length,
    averageIncome:
      incomesInPeriod.length > 0
        ? roundMoney(totalIncome / incomesInPeriod.length)
        : 0,
    savingsRate:
      totalIncome > 0 ? roundPercent((net / totalIncome) * 100) : null,
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
    expenses.filter(expense => dateOnly(expense.date) === todayKey),
  );
  const todayTotal = todayExpenses.reduce(
    (sum, expense) => sum + toNum(expense.cost),
    0,
  );
  const budgetSummary = buildBudgetSummary({
    user,
    expenses,
    subscriptions,
    now: effectiveNow,
  });

  return {
    expenses: todayExpenses,
    total: todayTotal,
    currency: normalizeCurrency(todayExpenses[0]?.currency ?? user?.currency),
    currencyBreakdown: aggregateCurrencyTotals(
      todayExpenses,
      expense => expense.cost,
      expense => expense.currency,
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

  return Array.from(totalsByDay.entries()).map(([date, total]) => ({
    date,
    total,
  }));
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
  const scopedExpenses = filterExpensesByPeriod(
    visibleExpenses,
    range.start,
    range.end,
  );
  const totals = new Map<string, CategoryBreakdown>();

  for (const expense of scopedExpenses) {
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
      total,
      count: (current?.count ?? 0) + 1,
      percentage: 0,
    });
  }

  const values = Array.from(totals.values()).sort((a, b) => b.total - a.total);
  const grandTotal = values.reduce((sum, item) => sum + item.total, 0);

  return values.map(item => ({
    ...item,
    percentage: grandTotal > 0 ? (item.total / grandTotal) * 100 : 0,
  }));
}

export function buildCategoryBudgetOverview({
  user,
  expenses,
  categories = [],
  now,
}: LocalFinanceInput): CategoryBudgetOverview {
  const effectiveNow = now ?? new Date();
  const { periodType, range } = getCurrentPeriod({
    user,
    expenses,
    categories,
    now: effectiveNow,
  });
  const visibleExpenses = filterVisibleExpenses(expenses, effectiveNow);
  const scopedExpenses = filterExpensesByPeriod(
    visibleExpenses,
    range.start,
    range.end,
  );
  const totals = new Map<string, { spent: number; expenseCount: number }>();

  for (const expense of scopedExpenses) {
    const categoryId = expense.categoryId ?? expense.category?.id;
    if (!categoryId) {
      continue;
    }

    const current = totals.get(categoryId);
    totals.set(categoryId, {
      spent: (current?.spent ?? 0) + toNum(expense.cost),
      expenseCount: (current?.expenseCount ?? 0) + 1,
    });
  }

  const items: CategoryBudgetStatus[] = categories
    .map(category => {
      const spent = totals.get(category.id)?.spent ?? 0;
      const expenseCount = totals.get(category.id)?.expenseCount ?? 0;
      const budgetAmount = roundMoney(toNum(category.budgetAmount));

      return {
        categoryId: category.id,
        name: category.name,
        icon: category.icon ?? 'cube-outline',
        color: category.color ?? '#95A5A6',
        budgetAmount,
        spent: roundMoney(spent),
        remaining: budgetAmount > 0 ? roundMoney(budgetAmount - spent) : 0,
        percentage:
          budgetAmount > 0 ? roundPercent((spent / budgetAmount) * 100) : 0,
        expenseCount,
        status: getCategoryBudgetTone(spent, budgetAmount),
      };
    })
    .sort((left, right) => {
      const toneDiff =
        getCategoryBudgetSortWeight(left.status) -
        getCategoryBudgetSortWeight(right.status);
      if (toneDiff !== 0) {
        return toneDiff;
      }

      if (left.budgetAmount !== right.budgetAmount) {
        return right.budgetAmount - left.budgetAmount;
      }

      if (left.spent !== right.spent) {
        return right.spent - left.spent;
      }

      return left.name.localeCompare(right.name);
    });

  const budgetedItems = items.filter(item => item.budgetAmount > 0);

  return {
    period: {
      type: periodType,
      start: range.start.toISOString().slice(0, 10),
      end: range.end.toISOString().slice(0, 10),
    },
    totalBudgeted: roundMoney(
      budgetedItems.reduce((sum, item) => sum + item.budgetAmount, 0),
    ),
    totalSpentBudgeted: roundMoney(
      budgetedItems.reduce((sum, item) => sum + item.spent, 0),
    ),
    totalRemaining: roundMoney(
      budgetedItems.reduce((sum, item) => sum + item.remaining, 0),
    ),
    categoriesWithBudget: budgetedItems.length,
    overBudgetCount: budgetedItems.filter(item => item.status === 'off_track')
      .length,
    watchCount: budgetedItems.filter(item => item.status === 'watch').length,
    items,
  };
}

export function buildWeeklySummary({
  user,
  expenses,
  now,
}: LocalFinanceInput): WeeklySummary {
  const effectiveNow = now ?? new Date();
  const range = resolvePeriodRange(
    'weekly',
    undefined,
    undefined,
    effectiveNow,
  );
  const visibleExpenses = filterVisibleExpenses(expenses, effectiveNow);
  const weeklyExpenses = filterExpensesByPeriod(
    visibleExpenses,
    range.start,
    range.end,
  );
  const totalSpent = weeklyExpenses.reduce(
    (sum, expense) => sum + toNum(expense.cost),
    0,
  );
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
    percentage:
      grandTotal > 0 ? roundPercent((item.total / grandTotal) * 100) : 0,
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
