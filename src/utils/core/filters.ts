const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function sanitizeDateFilterInput(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 8);

    if (digits.length <= 4) {
        return digits;
    }

    if (digits.length <= 6) {
        return `${digits.slice(0, 4)}-${digits.slice(4)}`;
    }

    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

export function isValidDateFilter(value: string): boolean {
    return DATE_PATTERN.test(value);
}

export function dateOnly(value: unknown): string {
    if (typeof value === 'string') {
        if (DATE_PATTERN.test(value.slice(0, 10))) {
            return value.slice(0, 10);
        }

        const parsed = new Date(value);
        if (!Number.isNaN(parsed.getTime())) {
            return parsed.toISOString().slice(0, 10);
        }
    }

    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return value.toISOString().slice(0, 10);
    }

    return '';
}
