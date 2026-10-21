import { PaymentIntentKeys, paymentFingerprint } from '../../src/modules/statements/paymentIntentKeys';

describe('payment intent retries', () => {
    const value = { amount: 10, currency: 'MXN', paidAt: '2026-10-21T12:00:00.000Z', note: ' note ' };
    it('retains keys through network, stale-version and server failures', () => {
        let n = 0;
        const keys = new PaymentIntentKeys(() => String(++n));
        const fp = paymentFingerprint(value);
        const key = keys.keyFor(fp);
        for (const kind of ['network', 'staleVersion', 'other'] as const) {
            keys.onFailure(kind);
            expect(keys.keyFor(fp)).toBe(key);
        }
        keys.onFailure('idempotency');
        expect(keys.keyFor(fp)).not.toBe(key);
    });
    it('resets after success, close, and changed intent', () => {
        let n = 0;
        const keys = new PaymentIntentKeys(() => String(++n));
        const fp = paymentFingerprint(value);
        const first = keys.keyFor(fp);
        expect(keys.keyFor(paymentFingerprint({ ...value, amount: 11 }))).not.toBe(first);
        keys.reset();
        const reopened = keys.keyFor(fp);
        keys.onSuccess();
        expect(keys.keyFor(fp)).not.toBe(reopened);
    });
    it('normalizes whitespace and separates correction targets and reasons', () => {
        expect(paymentFingerprint(value)).toBe(paymentFingerprint({ ...value, note: 'note' }));
        expect(paymentFingerprint(value, 'a', 'typo')).not.toBe(paymentFingerprint(value, 'b', 'typo'));
        expect(paymentFingerprint(value, 'a', 'typo')).not.toBe(paymentFingerprint(value, 'a', 'other'));
    });
});
