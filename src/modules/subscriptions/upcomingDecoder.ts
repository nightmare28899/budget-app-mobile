import type { UpcomingSubscriptionCharge } from '../../types/index';
import { toNum } from '../../utils/core/number';
import { normalizeCreditCard } from '../../utils/domain/creditCards';
import { normalizePaymentMethod } from '../../utils/domain/paymentMethod';
import { isApiRecord } from '../../utils/platform/api';

export function decodeUpcomingCharges(value: unknown): UpcomingSubscriptionCharge[] {
    if (isApiRecord(value)) {
        for (const key of ['upcoming', 'data', 'items', 'results']) {
            if (value[key] !== undefined) { return decodeUpcomingCharges(value[key]); }
        }
        return [];
    }
    if (!Array.isArray(value)) { return []; }
    return value.filter(isApiRecord).map(item => ({
        id: item.id != null ? String(item.id) : undefined,
        subscriptionId: item.subscriptionId != null ? String(item.subscriptionId) : undefined,
        name: typeof item.name === 'string' ? item.name : '',
        amount: toNum(item.amount),
        currency: typeof item.currency === 'string' ? item.currency : undefined,
        daysRemaining: toNum(item.daysRemaining),
        paymentMethod: normalizePaymentMethod(typeof item.paymentMethod === 'string' ? item.paymentMethod : undefined),
        creditCardId: typeof item.creditCardId === 'string' ? item.creditCardId : null,
        creditCard: isApiRecord(item.creditCard) ? normalizeCreditCard(item.creditCard) : null,
        chargeDate: typeof item.chargeDate === 'string' ? item.chargeDate : null,
        nextPaymentDate: typeof item.nextPaymentDate === 'string' ? item.nextPaymentDate : null,
        hexColor: typeof item.hexColor === 'string' ? item.hexColor : null,
    }));
}
