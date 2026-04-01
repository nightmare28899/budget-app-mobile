import { PremiumFeature } from '../types/premium';

function normalizeMessage(value: unknown): string | null {
    if (typeof value === 'string' && value.trim()) {
        return value;
    }

    if (Array.isArray(value)) {
        const messages = value
            .map((item) => (typeof item === 'string' ? item.trim() : ''))
            .filter(Boolean);

        return messages.length ? messages.join('\n') : null;
    }

    return null;
}

export function isLikelyJsonParseError(value: unknown): boolean {
    const message =
        typeof value === 'string'
            ? value
            : typeof (value as { message?: unknown })?.message === 'string'
                ? (value as { message: string }).message
                : null;

    if (!message) {
        return false;
    }

    const normalized = message.trim();
    return (
        /unexpected token/i.test(normalized) ||
        /not valid json/i.test(normalized) ||
        /^null$/i.test(normalized)
    );
}

function sanitizeMessage(message: string | null): string | null {
    if (!message) {
        return null;
    }

    const normalized = message.trim();
    if (!normalized) {
        return null;
    }

    if (isLikelyJsonParseError(normalized)) {
        return null;
    }

    return normalized;
}

export function extractApiMessage(payload: unknown): string | null {
    if (typeof payload === 'string') {
        return sanitizeMessage(payload);
    }

    if (!payload || typeof payload !== 'object') {
        return null;
    }

    const data = payload as Record<string, unknown>;

    return (
        sanitizeMessage(normalizeMessage(data.message)) ??
        sanitizeMessage(normalizeMessage(data.error)) ??
        sanitizeMessage(normalizeMessage(data.detail)) ??
        sanitizeMessage(normalizeMessage(data.title))
    );
}

function normalizePremiumFeature(value: unknown): PremiumFeature | null {
    if (typeof value !== 'string') {
        return null;
    }

    const normalized = value.trim().toLowerCase();
    if (!normalized) {
        return null;
    }

    if (
        normalized === 'credit_cards'
        || normalized === 'credit-card'
        || normalized === 'credit-cards'
        || normalized === 'creditcards'
        || normalized === 'credit_cards_catalog'
        || normalized === 'credit-card-catalog'
        || normalized === 'cards'
    ) {
        return 'credit_cards';
    }

    if (
        normalized === 'installments'
        || normalized === 'installment'
        || normalized === 'multiple_payments'
        || normalized === 'multi_payment'
        || normalized === 'months_based_expense'
        || normalized === 'months-based-expense'
    ) {
        return 'installments';
    }

    if (normalized.includes('card')) {
        return 'credit_cards';
    }

    if (
        normalized.includes('installment')
        || normalized.includes('month')
        || normalized.includes('payment')
    ) {
        return 'installments';
    }

    return null;
}

export type PremiumRequiredError = {
    code: 'PREMIUM_REQUIRED';
    message: string | null;
    feature: PremiumFeature;
    isPremium: boolean;
};

export function extractPremiumRequiredError(
    payload: unknown,
): PremiumRequiredError | null {
    if (!payload || typeof payload !== 'object') {
        return null;
    }

    const data = payload as Record<string, unknown>;
    if (data.code !== 'PREMIUM_REQUIRED') {
        return null;
    }

    const feature = normalizePremiumFeature(data.feature) ?? 'credit_cards';

    return {
        code: 'PREMIUM_REQUIRED',
        message: extractApiMessage(payload),
        feature,
        isPremium: data.isPremium === true,
    };
}
