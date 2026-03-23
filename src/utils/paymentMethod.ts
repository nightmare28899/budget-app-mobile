import { TranslationKey } from '../i18n';

export type PaymentMethodOption = {
    id: 'CASH' | 'CARD';
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
        id: 'CARD',
        labelKey: 'paymentMethod.card',
        fallback: 'Card',
        icon: 'card-outline',
    },
];

export const PAYMENT_METHOD_FALLBACK_ICON = 'wallet-outline';

export function getPaymentMethodOption(value?: string | null): PaymentMethodOption | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }

    const normalized = value.trim().toUpperCase();
    return PAYMENT_METHOD_OPTIONS.find((option) => option.id === normalized);
}
