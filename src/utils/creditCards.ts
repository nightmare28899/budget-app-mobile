import { CreditCard } from '../types';
import { toNum } from './number';

export const CREDIT_CARD_BRAND_OPTIONS = [
    'VISA',
    'MASTERCARD',
    'AMEX',
    'DISCOVER',
    'OTHER',
] as const;

export const CREDIT_CARD_COLOR_OPTIONS = [
    '#6D28D9',
    '#2563EB',
    '#059669',
    '#DC2626',
    '#EA580C',
    '#111827',
] as const;

export function normalizeCreditCard(card: any): CreditCard {
    return {
        id: String(card?.id ?? ''),
        name: typeof card?.name === 'string' ? card.name : '',
        bank: typeof card?.bank === 'string' ? card.bank : '',
        brand: typeof card?.brand === 'string' ? card.brand : '',
        last4: typeof card?.last4 === 'string' ? card.last4 : '',
        color: typeof card?.color === 'string' ? card.color : null,
        creditLimit:
            card?.creditLimit == null
                ? null
                : toNum(card.creditLimit),
        closingDay:
            card?.closingDay == null
                ? null
                : toNum(card.closingDay),
        paymentDueDay:
            card?.paymentDueDay == null
                ? null
                : toNum(card.paymentDueDay),
        isActive: card?.isActive !== false,
        createdAt:
            typeof card?.createdAt === 'string'
                ? card.createdAt
                : new Date().toISOString(),
        updatedAt:
            typeof card?.updatedAt === 'string'
                ? card.updatedAt
                : new Date().toISOString(),
    };
}

export function formatCreditCardLabel(
    card?: Pick<CreditCard, 'name' | 'bank' | 'last4'> | null,
): string | null {
    if (!card) {
        return null;
    }

    const primary = (card.name || card.bank || '').trim();
    const last4 = (card.last4 || '').trim();

    if (!primary && !last4) {
        return null;
    }

    if (!primary) {
        return `•••• ${last4}`;
    }

    if (!last4) {
        return primary;
    }

    return `${primary} - ${last4}`;
}

export function formatCreditCardSummary(
    card?: Pick<CreditCard, 'brand' | 'bank' | 'last4'> | null,
): string | null {
    if (!card) {
        return null;
    }

    const parts = [card.brand, card.bank, card.last4 ? `•••• ${card.last4}` : '']
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter(Boolean);

    return parts.length ? parts.join(' • ') : null;
}
