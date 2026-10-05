import type {
    StatementPayment,
    StatementPaymentSummary,
} from '../../types/statementImports';

export type PaymentHistoryState = 'active' | 'corrected' | 'voided';

/** A payment superseded by a correction is "corrected"; voided ones that were not superseded are "voided". */
export function classifyPaymentHistory(payments: StatementPayment[]): Record<string, PaymentHistoryState> {
    const superseded = new Set(
        payments.flatMap(payment => (payment.supersedesId ? [payment.supersedesId] : [])),
    );
    const result: Record<string, PaymentHistoryState> = {};
    for (const payment of payments) {
        result[payment.id] = superseded.has(payment.id)
            ? 'corrected'
            : payment.voidedAt
                ? 'voided'
                : 'active';
    }
    return result;
}

/** RFC 4122 v4. Idempotency keys only need uniqueness, so Math.random is the fallback. */
export function generateIdempotencyKey(): string {
    const cryptoRef = (globalThis as { crypto?: { getRandomValues?: (a: Uint8Array) => Uint8Array } }).crypto;
    const bytes = new Uint8Array(16);
    if (cryptoRef?.getRandomValues) {
        cryptoRef.getRandomValues(bytes);
    } else {
        for (let i = 0; i < 16; i += 1) {
            bytes[i] = Math.floor(Math.random() * 256);
        }
    }
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0'));
    return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex
        .slice(8, 10)
        .join('')}-${hex.slice(10).join('')}`;
}

function pad(value: number): string {
    return String(value).padStart(2, '0');
}

/**
 * paidAt for a user-picked local calendar day: noon UTC of that day, capped so it
 * never lands after the end of today in UTC (the API rejects future dates).
 */
export function toPaidAtIso(localDay: Date, now: Date = new Date()): string {
    const picked = `${localDay.getFullYear()}-${pad(localDay.getMonth() + 1)}-${pad(localDay.getDate())}`;
    const utcToday = `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())}`;
    return `${picked > utcToday ? utcToday : picked}T12:00:00.000Z`;
}

export type PaymentFormInput = {
    amountText: string;
    currency: string;
    note: string;
    reason?: string;
    requireReason: boolean;
};

export function isPaymentFormValid(input: PaymentFormInput, amount: number | null): boolean {
    return (
        amount != null
        && amount >= 0.01
        && /^[A-Z]{3}$/.test(input.currency)
        && (!input.requireReason || Boolean(input.reason?.trim()))
    );
}

/** Suggested amount for a new payment: what is left of the no-interest target, else the statement. */
export function suggestedPaymentAmount(summary: StatementPaymentSummary): number | null {
    const candidate = summary.remainingNoInterest ?? summary.remainingStatement;
    return candidate != null && candidate > 0 ? candidate : null;
}
