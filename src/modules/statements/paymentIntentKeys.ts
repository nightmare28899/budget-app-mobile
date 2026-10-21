import { generateIdempotencyKey } from './statementPayments';
import type { StatementErrorKind } from './statementErrors';

type PaymentValue = { amount: number; currency: string; paidAt: string; note?: string };
export function paymentFingerprint(value: PaymentValue, paymentId?: string, reason?: string): string {
    return JSON.stringify([paymentId ? `correct:${paymentId}` : 'create', Math.round(value.amount * 100),
        value.currency.toUpperCase(), value.paidAt, value.note?.trim() ?? '', paymentId ? reason?.trim() ?? '' : '']);
}

/** One intent survives uncertain outcomes, including stale-version retries and lost successful responses. */
export class PaymentIntentKeys {
    private fingerprint: string | null = null;
    private key: string | null = null;
    constructor(private generate: () => string = generateIdempotencyKey) {}
    keyFor(fingerprint: string): string {
        if (this.key && this.fingerprint === fingerprint) { return this.key; }
        this.fingerprint = fingerprint;
        this.key = this.generate();
        return this.key;
    }
    reset() { this.key = null; this.fingerprint = null; }
    onSuccess() { this.reset(); }
    onFailure(kind: StatementErrorKind) { if (kind === 'idempotency') { this.reset(); } }
}
