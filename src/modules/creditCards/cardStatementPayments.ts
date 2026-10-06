import { classifyPaymentHistory } from '../statements/statementPayments';
import type {
    StatementPayment,
    StatementPaymentSummary,
    StatementPaymentTargetSummary,
} from '../../types/statementImports';
import type { StatementPaymentStatus } from '../../types/index';

export type CardPaymentProgressInput = {
    paidTotal: number;
    closingBalance: number | null;
    noInterestTarget: number | null;
    currentPaymentDue: number | null;
    remainingStatement: number;
    paymentStatus: StatementPaymentStatus;
};

export type CardPaymentProgress = {
    paid: number;
    total: number;
    remaining: number;
    /** 0..1 */
    fraction: number;
    isPaid: boolean;
};

const EARLIEST_PAYMENT_MS = Date.UTC(2000, 0, 1);

const toCents = (value: number) => Math.round(value * 100);
const fromCents = (cents: number) => cents / 100;

/** Progress of the latest statement using only what the cards overview already returns. */
export function computeCardPaymentProgress(
    input: CardPaymentProgressInput,
): CardPaymentProgress | null {
    const total = input.noInterestTarget ?? input.closingBalance;
    if (total == null || total <= 0) {
        return null;
    }
    const isPaid = input.paymentStatus === 'PAID';
    const remaining = isPaid
        ? 0
        : Math.max(0, input.currentPaymentDue ?? input.remainingStatement);
    const fraction = isPaid ? 1 : Math.min(1, Math.max(0, input.paidTotal / total));
    return { paid: input.paidTotal, total, remaining, fraction, isPaid };
}

/** Amount by which a new payment would push paid total past the closing balance (0 if none). */
export function overpaidBy(
    amount: number,
    summary: Pick<StatementPaymentSummary, 'closingBalance' | 'paidTotal'>,
): number {
    if (summary.closingBalance == null) {
        return 0;
    }
    const excess = toCents(summary.paidTotal) + toCents(amount) - toCents(summary.closingBalance);
    return excess > 0 ? fromCents(excess) : 0;
}

/** Active (not corrected/voided) payments, newest first. */
export function recentActivePayments(payments: StatementPayment[], limit = 3): StatementPayment[] {
    const states = classifyPaymentHistory(payments);
    return payments
        .filter(payment => states[payment.id] === 'active')
        .sort((a, b) => Date.parse(b.paidAt) - Date.parse(a.paidAt))
        .slice(0, limit);
}

export type PaymentQuickAmount = {
    key: 'noInterest' | 'remaining' | 'minimum';
    amount: number;
};

/** Chips the backend data supports: left of no-interest target, left of statement, left of minimum. */
export function paymentQuickAmounts(
    summary: StatementPaymentSummary,
    targets: StatementPaymentTargetSummary[],
): PaymentQuickAmount[] {
    const minimumTarget = targets.find(
        target => target.kind === 'MINIMUM' || target.kind === 'MINIMUM_PLUS_INSTALLMENTS',
    );
    const candidates: Array<[PaymentQuickAmount['key'], number | null]> = [
        ['noInterest', summary.remainingNoInterest],
        ['remaining', summary.remainingStatement],
        [
            'minimum',
            minimumTarget
                ? fromCents(toCents(minimumTarget.amount) - toCents(summary.paidTotal))
                : null,
        ],
    ];
    const seen = new Set<number>();
    const result: PaymentQuickAmount[] = [];
    for (const [key, amount] of candidates) {
        if (amount == null || amount <= 0 || seen.has(toCents(amount))) {
            continue;
        }
        seen.add(toCents(amount));
        result.push({ key, amount });
    }
    return result;
}

/** Mirrors the API rule: paidAt between 2000-01-01 and the end of today (UTC). */
export function isPaymentDateInRange(paidAtIso: string, now: Date = new Date()): boolean {
    const paidAt = Date.parse(paidAtIso);
    if (!Number.isFinite(paidAt)) {
        return false;
    }
    const endOfToday = new Date(now);
    endOfToday.setUTCHours(23, 59, 59, 999);
    return paidAt >= EARLIEST_PAYMENT_MS && paidAt <= endOfToday.getTime();
}
