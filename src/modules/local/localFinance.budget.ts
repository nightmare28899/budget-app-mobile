import {
  BudgetSummary,
  Category,
  CategoryBudgetOverview,
  CategoryBudgetStatus,
  CategoryBudgetStatusTone,
  CategoryBreakdown,
  DailyTotal,
  Expense,
  Income,
  IncomeSummary,
  SavingsGoal,
  Subscription,
  TodaySummary,
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
  resolvePeriodRange,
  toSubscriptionManagerItems,
} from '../subscriptions/subscriptionManager';
import { toNum } from '../../utils/core/number';
import { daysInRangeInclusive, endOfDay } from './localFinance.dates';
import {
  filterExpensesByPeriod,
  filterIncomesByPeriod,
  filterVisibleExpenses,
  filterVisibleIncomes,
  sortExpensesDesc,
} from './localFinance.filters';

export type LocalFinanceInput = {
  user: User | null;
  expenses: Expense[];
  incomes?: Income[];
  subscriptions?: Subscription[];
  categories?: Category[];
  savingsGoals?: SavingsGoal[];
  now?: Date;
};

export function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function roundPercent(value: number) {
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
