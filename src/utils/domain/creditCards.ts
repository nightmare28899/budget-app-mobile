import { CreditCard } from '../../types/index';
import { toNum } from '../core/number';
import { toApiRecord } from '../platform/api';

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

export function normalizeCreditCard(card: unknown): CreditCard {
    const normalizedCard = toApiRecord(card);

    return {
        id: String(normalizedCard.id ?? ''),
        name: typeof normalizedCard.name === 'string' ? normalizedCard.name : '',
        bank: typeof normalizedCard.bank === 'string' ? normalizedCard.bank : '',
        brand: typeof normalizedCard.brand === 'string' ? normalizedCard.brand : '',
        last4: typeof normalizedCard.last4 === 'string' ? normalizedCard.last4 : '',
        color: typeof normalizedCard.color === 'string' ? normalizedCard.color : null,
        creditLimit:
            normalizedCard.creditLimit == null
                ? null
                : toNum(normalizedCard.creditLimit),
        closingDay:
            normalizedCard.closingDay == null
                ? null
                : toNum(normalizedCard.closingDay),
        paymentDueDay:
            normalizedCard.paymentDueDay == null
                ? null
                : toNum(normalizedCard.paymentDueDay),
        currency:
            typeof normalizedCard.currency === 'string' && normalizedCard.currency
                ? normalizedCard.currency
                : undefined,
        isActive: normalizedCard.isActive !== false,
        createdAt:
            typeof normalizedCard.createdAt === 'string'
                ? normalizedCard.createdAt
                : new Date().toISOString(),
        updatedAt:
            typeof normalizedCard.updatedAt === 'string'
                ? normalizedCard.updatedAt
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

export const CREDIT_CARD_HAS_STATEMENTS_CODE = 'CREDIT_CARD_HAS_STATEMENTS';
export const CREDIT_CARD_HAS_STATEMENTS_MESSAGE = 'creditCardHasStatements';

/**
 * Returns the statement count when DELETE /credit-cards/:id/permanent was
 * rejected because the card still has imported statements, otherwise null.
 */
export function getCreditCardHasStatementsCount(error: unknown): number | null {
    const response = (error as { response?: { status?: unknown; data?: unknown } } | null)
        ?.response;
    if (!response || response.status !== 409) {
        return null;
    }

    const data = response.data as
        | { code?: unknown; message?: unknown; statementCount?: unknown }
        | undefined;
    if (
        data?.code !== CREDIT_CARD_HAS_STATEMENTS_CODE &&
        data?.message !== CREDIT_CARD_HAS_STATEMENTS_MESSAGE
    ) {
        return null;
    }

    const count = Number(data?.statementCount);
    return Number.isFinite(count) && count >= 0 ? count : 0;
}
