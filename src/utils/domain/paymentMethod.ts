import { TranslationKey } from '../../i18n/index';
import { PaymentMethodValue } from '../../types/index';

export type PaymentMethodOption = {
    id: PaymentMethodValue;
    labelKey: TranslationKey;
    fallback: string;
    icon: string;
};

export const PAYMENT_METHOD_OPTIONS: PaymentMethodOption[] = [
    {
        id: 'CASH',
        labelKey: 'paymentMethod.cash',
        fallback: 'Cash',
        icon: 'cash-outline',
    },
    {
        id: 'CREDIT_CARD',
        labelKey: 'paymentMethod.creditCard',
        fallback: 'Credit card',
        icon: 'card-outline',
    },
    {
        id: 'DEBIT_CARD',
        labelKey: 'paymentMethod.debitCard',
        fallback: 'Debit card',
        icon: 'card-outline',
    },
    {
        id: 'TRANSFER',
        labelKey: 'paymentMethod.transfer',
        fallback: 'Transfer',
        icon: 'swap-horizontal-outline',
    },
];

export const PAYMENT_METHOD_FALLBACK_ICON = 'wallet-outline';

export function normalizePaymentMethod(value?: string | null): PaymentMethodValue | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }

    const normalized = value.trim().toUpperCase();
    if (normalized === 'CARD') {
        return 'CREDIT_CARD';
    }

    return PAYMENT_METHOD_OPTIONS.find((option) => option.id === normalized)?.id;
}

export function getPaymentMethodOption(value?: string | null): PaymentMethodOption | undefined {
    const normalized = normalizePaymentMethod(value);
    if (!normalized) {
        return undefined;
    }

    return PAYMENT_METHOD_OPTIONS.find((option) => option.id === normalized);
}

export function isCreditCardPaymentMethod(value?: string | null): boolean {
    return normalizePaymentMethod(value) === 'CREDIT_CARD';
}
