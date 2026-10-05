import { FinancingPlan, FinancingPlanType } from '../../types/index';
import { toNum } from '../core/number';

type TranslateFn = (
    key: any,
    values?: Record<string, string | number>,
) => string;

function toNullableNumber(value: unknown): number | null {
    return value === null || value === undefined || value === ''
        ? null
        : toNum(value);
}

export function normalizeFinancingPlan(value: unknown): FinancingPlan | null {
    if (!value || typeof value !== 'object') {
        return null;
    }
    const raw = value as Record<string, unknown>;
    const type: FinancingPlanType | null =
        raw.type === 'NO_INTEREST' || raw.type === 'INTEREST_BEARING'
            ? raw.type
            : null;
    if (!type) {
        return null;
    }

    return {
        type,
        installmentNumber: toNullableNumber(raw.installmentNumber),
        installmentCount: toNullableNumber(raw.installmentCount),
        installmentAmount: toNullableNumber(raw.installmentAmount),
        originalAmount: toNullableNumber(raw.originalAmount),
        remainingAmount: toNullableNumber(raw.remainingAmount),
        purchaseDate: typeof raw.purchaseDate === 'string' ? raw.purchaseDate : null,
    };
}

/** "MSI · 7/12", "Con intereses · 7/12" or just "MSI" / "A meses" when counts are missing. */
export function buildFinancingPlanLabel(
    plan: FinancingPlan | null | undefined,
    t: TranslateFn,
): string | null {
    if (!plan) {
        return null;
    }
    const hasPosition =
        (plan.installmentNumber ?? 0) > 0 && (plan.installmentCount ?? 0) > 0;
    const base =
        plan.type === 'NO_INTEREST'
            ? t('financingPlan.noInterest')
            : t(hasPosition ? 'financingPlan.interestBearing' : 'financingPlan.interestBearingShort');

    return hasPosition
        ? t('financingPlan.withPosition', {
            label: base,
            current: plan.installmentNumber as number,
            count: plan.installmentCount as number,
        })
        : base;
}

/** "$1,083.25/mes" or null when there is no installment amount. */
export function buildFinancingPlanAmountLabel(
    plan: FinancingPlan | null | undefined,
    formatAmount: (amount: number) => string,
    t: TranslateFn,
): string | null {
    if (!plan || plan.installmentAmount == null) {
        return null;
    }
    return t('financingPlan.perMonth', { amount: formatAmount(plan.installmentAmount) });
}
