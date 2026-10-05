import { CreditCardInstallmentPlan } from '../../types/index';

export type InstallmentPlanTotals = {
    currency: string;
    monthly: number;
    remaining: number;
};

export type InstallmentPlansSummary = {
    count: number;
    totals: InstallmentPlanTotals[];
    statementPeriodEnd: string | null;
};

/** Largest remaining balance first; plans without a remaining amount go last (stable). */
export function sortPlansByRemaining(
    plans: CreditCardInstallmentPlan[],
): CreditCardInstallmentPlan[] {
    return plans
        .map((plan, index) => ({ plan, index }))
        .sort((a, b) => {
            const left = a.plan.remainingAmount;
            const right = b.plan.remainingAmount;
            if (left == null && right == null) {
                return a.index - b.index;
            }
            if (left == null) {
                return 1;
            }
            if (right == null) {
                return -1;
            }
            return right - left || a.index - b.index;
        })
        .map(entry => entry.plan);
}

/** 0..1 progress of "N of M", or null when the position is unknown. */
export function getPlanProgress(plan: CreditCardInstallmentPlan): number | null {
    const { installmentNumber, installmentCount } = plan;
    if (installmentNumber == null || installmentCount == null || installmentCount <= 0) {
        return null;
    }
    return Math.max(0, Math.min(1, installmentNumber / installmentCount));
}

/** Totals grouped by currency so mixed-currency plans are never added together. */
export function summarizeInstallmentPlans(
    plans: CreditCardInstallmentPlan[],
): InstallmentPlansSummary {
    const byCurrency = new Map<string, InstallmentPlanTotals>();
    let statementPeriodEnd: string | null = null;

    for (const plan of plans) {
        const entry = byCurrency.get(plan.currency) ?? {
            currency: plan.currency,
            monthly: 0,
            remaining: 0,
        };
        entry.monthly += plan.installmentAmount ?? 0;
        entry.remaining += plan.remainingAmount ?? 0;
        byCurrency.set(plan.currency, entry);

        if (
            plan.statementPeriodEnd &&
            (!statementPeriodEnd || plan.statementPeriodEnd > statementPeriodEnd)
        ) {
            statementPeriodEnd = plan.statementPeriodEnd;
        }
    }

    return {
        count: plans.length,
        totals: Array.from(byCurrency.values()),
        statementPeriodEnd,
    };
}
