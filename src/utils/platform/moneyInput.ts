export const MAX_COST_INTEGER_DIGITS = 7;
export const MAX_COST_DECIMALS = 2;
export const MAX_COST_VALUE = 9_999_999.99;
export const MAX_COST_LABEL = MAX_COST_VALUE.toFixed(2);

export function sanitizeMoneyInput(value: string): string {
    if (!value) {
        return '';
    }

    const cleaned = value.replace(',', '.').replace(/[^0-9.]/g, '');
    if (!cleaned) {
        return '';
    }

    const normalized = cleaned.startsWith('.') ? `0${cleaned}` : cleaned;
    const [integerRaw = '', ...decimalParts] = normalized.split('.');
    const integerPart = integerRaw.slice(0, MAX_COST_INTEGER_DIGITS);
    const hasDot = normalized.includes('.');

    if (!hasDot) {
        return integerPart;
    }

    const decimalPart = decimalParts.join('').slice(0, MAX_COST_DECIMALS);
    return `${integerPart || '0'}.${decimalPart}`;
}
