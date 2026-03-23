import { BudgetPeriod } from '../types';
import { TranslationKey } from '../i18n';

export const BUDGET_PERIODS: BudgetPeriod[] = [
    'daily',
    'weekly',
    'monthly',
    'annual',
    'period',
];

export const BUDGET_LABEL_MAP: Record<BudgetPeriod, string> = {
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    annual: 'Annual',
    period: 'Custom Period',
};

export const BUDGET_LABEL_KEY_MAP: Record<BudgetPeriod, TranslationKey> = {
    daily: 'budget.period.daily',
    weekly: 'budget.period.weekly',
    monthly: 'budget.period.monthly',
    annual: 'budget.period.annual',
    period: 'budget.period.period',
};

export function isBudgetPeriod(value: unknown): value is BudgetPeriod {
    return (
        typeof value === 'string' &&
        (BUDGET_PERIODS as string[]).includes(value)
    );
}

export function normalizeBudgetPeriod(
    value: unknown,
    fallback: BudgetPeriod = 'daily',
): BudgetPeriod {
    return isBudgetPeriod(value) ? value : fallback;
}

export function budgetLabelKey(
    period: BudgetPeriod | null | undefined,
): TranslationKey {
    return BUDGET_LABEL_KEY_MAP[normalizeBudgetPeriod(period, 'daily')];
}

export function budgetLabel(
    period: BudgetPeriod | null | undefined,
    translate?: (key: TranslationKey) => string,
): string {
    const normalizedPeriod = normalizeBudgetPeriod(period, 'daily');
    const key = BUDGET_LABEL_KEY_MAP[normalizedPeriod];
    return translate ? translate(key) : BUDGET_LABEL_MAP[normalizedPeriod];
}
