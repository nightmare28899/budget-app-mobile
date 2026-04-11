import { BudgetPeriod, User } from '../types';
import { normalizeBudgetPeriod } from './budget';
import { DEFAULT_CURRENCY, normalizeCurrency } from './currency';
import { toNum } from './number';

type LegacyBudgetSource = {
  budgetAmount?: unknown;
  dailyBudget?: unknown;
};

export function resolveBudgetAmount(
  source?: LegacyBudgetSource | null,
): number {
  return toNum(source?.budgetAmount ?? source?.dailyBudget);
}

function normalizeBudgetDate(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function normalizeCurrencyValue(
  sourceCurrency: unknown,
  fallbackCurrency?: string,
): string {
  return normalizeCurrency(
    typeof sourceCurrency === 'string' ? sourceCurrency : fallbackCurrency,
    DEFAULT_CURRENCY,
  );
}

function resolveBudgetPeriod(
  sourceBudgetPeriod: unknown,
  fallbackBudgetPeriod?: BudgetPeriod,
): BudgetPeriod {
  return normalizeBudgetPeriod(sourceBudgetPeriod ?? fallbackBudgetPeriod, 'daily');
}

export function normalizeUserRecord(
  data: unknown,
  fallback?: Partial<User> | null,
): User {
  const source =
    data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
  const budgetSource =
    source.budgetAmount !== undefined || source.dailyBudget !== undefined
      ? source
      : fallback;

  return {
    ...(fallback ?? {}),
    ...source,
    id: String(source.id ?? fallback?.id ?? ''),
    email: String(source.email ?? fallback?.email ?? ''),
    name: String(source.name ?? fallback?.name ?? ''),
    budgetAmount: resolveBudgetAmount(budgetSource),
    budgetPeriod: resolveBudgetPeriod(
      source.budgetPeriod,
      fallback?.budgetPeriod,
    ),
    budgetPeriodStart: normalizeBudgetDate(
      source.budgetPeriodStart ?? fallback?.budgetPeriodStart,
    ),
    budgetPeriodEnd: normalizeBudgetDate(
      source.budgetPeriodEnd ?? fallback?.budgetPeriodEnd,
    ),
    currency: normalizeCurrencyValue(source.currency, fallback?.currency),
    weeklyReportEnabled:
      source.weeklyReportEnabled !== undefined
        ? source.weeklyReportEnabled === true
        : fallback?.weeklyReportEnabled === true,
    monthlyReportEnabled:
      source.monthlyReportEnabled !== undefined
        ? source.monthlyReportEnabled === true
        : fallback?.monthlyReportEnabled === true,
  };
}
