export const toNum = (value: unknown): number => {
    if (typeof value === 'number') {
        if (Number.isFinite(value)) {
            return value;
        }
        warnInvalid(value);
        return 0;
    }

    if (value === null || value === undefined || value === '') {
        return 0;
    }

    // Prisma Decimal values arrive as strings (e.g. "12.50") or objects with toString().
    const text = typeof value === 'string' ? value.trim() : String(value);
    if (!text) {
        return 0;
    }

    const parsed = Number(text);
    if (Number.isFinite(parsed)) {
        return parsed;
    }

    warnInvalid(value);
    return 0;
};

function warnInvalid(value: unknown): void {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn('[toNum] Invalid numeric value, falling back to 0:', value);
    }
}
