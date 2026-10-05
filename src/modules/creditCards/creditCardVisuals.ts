export type CardThemeKey = 'banamex' | 'bbva' | 'rappi' | 'default';

export type CardIdentity = {
    id: string;
    name: string;
    bank: string;
    color?: string | null;
};

export type CardTheme = {
    key: CardThemeKey;
    /** Solid face color (no gradient library available). */
    background: string;
    /** Slightly darker tone used for the face accent strip. */
    accent: string;
    /** Face border color. */
    border: string;
    /** Utilization bar fill. */
    bar: string;
    /** Vivid brand tone for small accents (list strips) on dark surfaces. */
    brand: string;
};

const FALLBACK_COLORS = ['#047857', '#0369A1', '#B45309', '#6B21A8', '#334155'] as const;

const CARD_THEMES: Record<Exclude<CardThemeKey, 'default'>, CardTheme> = {
    banamex: {
        key: 'banamex',
        background: '#BE123C',
        accent: '#881337',
        border: 'rgba(255, 255, 255, 0.2)',
        bar: '#10B981',
        brand: '#E11D48',
    },
    bbva: {
        key: 'bbva',
        background: '#0369A1',
        accent: '#075985',
        border: 'rgba(34, 211, 238, 0.3)',
        bar: '#38BDF8',
        brand: '#0284C7',
    },
    rappi: {
        key: 'rappi',
        background: '#161F30',
        accent: '#1E1B4B',
        border: 'rgba(139, 92, 246, 0.3)',
        bar: '#8B5CF6',
        brand: '#8B5CF6',
    },
};

export function normalizeCardIdentity(value: string): string {
    return value
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/\b(?:mastercard|visa)\b/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
        .replace(/\s+/g, ' ');
}

function isBudgetDemo(card: CardIdentity): boolean {
    return normalizeCardIdentity(card.name).startsWith('budget demo')
        || normalizeCardIdentity(card.bank).startsWith('budget demo');
}

export function themeKeyFor(card: CardIdentity): CardThemeKey {
    if (isBudgetDemo(card)) {
        return 'default';
    }

    const identity = normalizeCardIdentity(`${card.bank} ${card.name}`);
    if (/\bbanamex\b/.test(identity)) {
        return 'banamex';
    }
    if (/\bbbva\b/.test(identity)) {
        return 'bbva';
    }
    if (/\brappi(?:card)?\b/.test(identity)) {
        return 'rappi';
    }
    return 'default';
}

/** Stored color, otherwise a deterministic pick from the card id. */
export function creditCardFallbackColor(card: Pick<CardIdentity, 'id' | 'color'>): string {
    if (card.color) {
        return card.color;
    }

    let hash = 0;
    for (let index = 0; index < card.id.length; index += 1) {
        hash = (hash * 31 + card.id.charCodeAt(index)) >>> 0;
    }
    return FALLBACK_COLORS[hash % FALLBACK_COLORS.length];
}

export function creditCardTheme(card: CardIdentity): CardTheme {
    const key = themeKeyFor(card);
    if (key !== 'default') {
        return CARD_THEMES[key];
    }

    const background = creditCardFallbackColor(card);
    return {
        key: 'default',
        background,
        accent: background,
        border: 'rgba(255, 255, 255, 0.1)',
        bar: '#10B981',
        brand: background,
    };
}
