import { parseDateOnly } from '../../modules/creditCards/cardPaymentSchedule';
import { CreditCard } from '../../types/index';

export function formatCardShortDate(
    date: string | null | undefined,
    locale: 'es-MX' | 'en-US',
): string | null {
    const parsed = date ? parseDateOnly(date) : null;
    if (!parsed) {
        return null;
    }

    return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(parsed);
}

/** Avoids "BBVA BBVA" when the card name repeats the bank. */
export function formatCardDisplayName(card: Pick<CreditCard, 'name' | 'bank'>): string {
    const bank = card.bank.trim();
    const name = card.name.trim();
    if (!name) {
        return bank;
    }
    if (!bank) {
        return name;
    }

    const lowerBank = bank.toLowerCase();
    const lowerName = name.toLowerCase();
    if (lowerBank.includes(lowerName)) {
        return bank;
    }
    if (lowerName.includes(lowerBank)) {
        return name;
    }
    return `${bank} ${name}`;
}
