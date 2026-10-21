const BULLETS = '••••';

/** Bank (or the card name when the bank is empty), as printed on the top line of the card art. */
export function cardBankLine(name: string, bank: string): string {
    return bank.trim() || name.trim();
}

/** Card name without the bank prefix; null when it adds nothing beyond the bank. */
export function cardTitle(name: string, bank: string): string | null {
    const n = name.trim();
    const b = bank.trim();
    if (!n) {
        return null;
    }
    if (!b) {
        return n;
    }
    if (n.toLowerCase() === b.toLowerCase()) {
        return null;
    }
    if (
        n.toLowerCase().startsWith(b.toLowerCase())
        && n.length > b.length
        && !/[\p{L}\p{N}]/u.test(n[b.length])
    ) {
        const rest = n.substring(b.length).replace(/^[\s\-·•:]+|[\s\-·•:]+$/g, '');
        return rest || null;
    }
    return n;
}

/** "mastercard" is drawn as a word mark; other networks as upper-case text; null for unknown. */
export function cardBrandMark(brand: string): string | null {
    const b = brand.trim();
    if (!b || b.toUpperCase() === 'OTHER') {
        return null;
    }
    if (b.toUpperCase() === 'MASTERCARD') {
        return 'mastercard';
    }
    return b.toUpperCase();
}

function lastFour(value: string | null | undefined): string {
    return (value ?? '').replace(/\D/g, '').slice(-4).padStart(4, '•');
}

export function cardNumberMask(last4: string | null | undefined): string {
    return `${BULLETS} ${BULLETS} ${BULLETS} ${lastFour(last4)}`;
}

export function cardNumberShort(last4: string | null | undefined): string {
    return `${BULLETS} ${lastFour(last4)}`;
}
