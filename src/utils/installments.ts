import { Expense, InstallmentFrequency } from '../types';

export const DEFAULT_INSTALLMENT_FREQUENCY: InstallmentFrequency = 'MONTHLY';

export function normalizeInstallmentFrequency(
    value?: string | null,
    fallback: InstallmentFrequency = DEFAULT_INSTALLMENT_FREQUENCY,
): InstallmentFrequency {
    return value === 'MONTHLY' ? 'MONTHLY' : fallback;
}

export function isInstallmentExpense(
    expense?: Partial<Expense> | null,
): boolean {
    return expense?.isInstallment === true && Number(expense?.installmentCount ?? 0) > 1;
}

export function splitAmountAcrossInstallments(
    totalAmount: number,
    installmentCount: number,
): number[] {
    const safeCount = Math.max(0, Math.trunc(installmentCount));
    if (!Number.isFinite(totalAmount) || totalAmount <= 0 || safeCount <= 1) {
        return [];
    }

    const totalCents = Math.round(totalAmount * 100);
    const baseAmountCents = Math.floor(totalCents / safeCount);
    const lastAmountCents = totalCents - (baseAmountCents * (safeCount - 1));

    return Array.from({ length: safeCount }, (_, index) =>
        (index === safeCount - 1 ? lastAmountCents : baseAmountCents) / 100,
    );
}

export function getInstallmentBreakdown(
    totalAmount: number,
    installmentCount: number,
) {
    const amounts = splitAmountAcrossInstallments(totalAmount, installmentCount);
    const installmentAmount = amounts[0] ?? 0;
    const finalInstallmentAmount = amounts[amounts.length - 1] ?? installmentAmount;

    return {
        amounts,
        installmentAmount,
        finalInstallmentAmount,
        hasAdjustedFinal:
            amounts.length > 1
            && Math.abs(finalInstallmentAmount - installmentAmount) >= 0.01,
    };
}

export function getInstallmentProgress(expense?: Partial<Expense> | null) {
    const total = Math.max(0, Number(expense?.installmentCount ?? 0));
    const current = Math.min(
        total,
        Math.max(1, Number(expense?.installmentIndex ?? 1)),
    );

    return {
        currentInstallment: total > 0 ? current : null,
        installmentCount: total > 0 ? total : null,
        remainingInstallments: total > 0 ? Math.max(total - current, 0) : null,
    };
}
