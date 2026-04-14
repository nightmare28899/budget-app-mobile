import { PremiumFeature } from '../../types/premium';

export type ApiRecord = Record<string, unknown>;
export type ApiError = Error & {
    response?: {
        status?: number;
        data?: unknown;
    };
};
export type MultipartFileValue = Blob & {
    uri: string;
    name: string;
    type: string;
};

export function isApiRecord(value: unknown): value is ApiRecord {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function toApiRecord(value: unknown): ApiRecord {
    return isApiRecord(value) ? value : {};
}

export function toApiArray(value: unknown): unknown[] {
    return Array.isArray(value) ? value : [];
}

export function createApiError(
    status: number,
    payload: unknown,
    message = `Request failed with status ${status}`,
): ApiError {
    const error = new Error(message) as ApiError;
    error.response = {
        status,
        data: payload,
    };
    return error;
}

export function toMultipartFileValue(file: {
    uri: string;
    name: string;
    type: string;
}): MultipartFileValue {
    return file as unknown as MultipartFileValue;
}

export function getApiErrorData(error: unknown): unknown {
    if (!isApiRecord(error)) {
        return undefined;
    }

    const response = error.response;
    if (!isApiRecord(response)) {
        return undefined;
    }

    return response.data;
}

export function getErrorMessage(error: unknown): string | null {
    if (error instanceof Error) {
        const message = error.message.trim();
        return message ? message : null;
    }

    if (typeof error === 'string') {
        const message = error.trim();
        return message ? message : null;
    }

    if (!isApiRecord(error) || typeof error.message !== 'string') {
        return null;
    }

    const message = error.message.trim();
    return message ? message : null;
}

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
