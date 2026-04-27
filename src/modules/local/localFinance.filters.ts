import { Expense, Income } from '../../types/index';
import { dateOnly } from '../../utils/core/filters';

export function filterExpensesByPeriod(expenses: Expense[], start: Date, end: Date) {
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

export function filterVisibleExpenses(expenses: Expense[], now = new Date()) {
  const todayKey = dateOnly(now);

  return expenses.filter(expense => {
    const expenseDate = dateOnly(expense.date);
    return !!expenseDate && expenseDate <= todayKey;
  });
}

export function filterIncomesByPeriod(incomes: Income[], start: Date, end: Date) {
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

export function filterVisibleIncomes(incomes: Income[], now = new Date()) {
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
