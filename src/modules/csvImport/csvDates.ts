import type { DateFormatGuess, DateOrder, DayString } from './csvTypes';

const NUMERIC = /^(\d{1,4})[-/.](\d{1,2})[-/.](\d{1,4})(?:$|[T\s].*)/;
const COMPACT = /^(\d{4})(\d{2})(\d{2})(?:$|[T\s].*)/;
const NUMERIC_WITH_TIME = /^\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}[T\s].*/;

const ENGLISH_MONTHS = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december',
];
const SPANISH_MONTHS = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

const MONTHS: Record<string, number> = (() => {
    const map: Record<string, number> = {};
    for (const names of [ENGLISH_MONTHS, SPANISH_MONTHS]) {
        names.forEach((name, index) => {
            map[name] = index + 1;
            map[name.slice(0, 3)] = index + 1;
        });
    }
    map.sept = 9;
    map.setiembre = 9;
    map.set = 9;
    return map;
})();

const CANDIDATES: DateOrder[] = ['YMD', 'DMY', 'MDY'];

function fold(text: string): string {
    return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function year(text: string): number | null {
    if (!/^\d+$/.test(text)) {
        return null;
    }
    const value = parseInt(text, 10);
    if (text.length === 2) {
        return value <= 69 ? value + 2000 : value + 1900;
    }
    return text.length === 4 ? value : null;
}

function isLeap(y: number): boolean {
    return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

function daysInMonth(y: number, m: number): number {
    if (m === 2) {
        return isLeap(y) ? 29 : 28;
    }
    return [4, 6, 9, 11].includes(m) ? 30 : 31;
}

const pad = (value: number, width: number) => String(value).padStart(width, '0');

function make(y: number | null, m: number, d: number): DayString | null {
    if (y === null || y < 1900 || y > 2200) {
        return null;
    }
    if (!Number.isInteger(m) || !Number.isInteger(d) || m < 1 || m > 12 || d < 1 || d > daysInMonth(y, m)) {
        return null;
    }
    return `${pad(y, 4)}-${pad(m, 2)}-${pad(d, 2)}`;
}

function isTextual(raw: string): boolean {
    return /\p{L}/u.test(raw) && !NUMERIC_WITH_TIME.test(raw);
}

/** "15 de marzo de 2024", "Mar 15, 2024", "15-Mar-24" and similar. */
function parseTextual(text: string): DayString | null {
    const tokens = fold(text)
        .split(/[^a-z0-9]+/)
        .filter((t) => t.length > 0 && t !== 'de' && t !== 'del');
    let month: number | null = null;
    const numbers: string[] = [];
    for (const token of tokens) {
        const named = MONTHS[token];
        if (named !== undefined && month === null) {
            month = named;
        } else if (/^\d+$/.test(token)) {
            numbers.push(token);
        } else if (token.length <= 2 && /^[a-z]+$/.test(token)) {
            // ordinal suffixes such as "st" or "th" are tolerated
        } else if (named === undefined) {
            return null;
        }
    }
    if (month === null) {
        return null;
    }
    let yearIndex = numbers.findIndex((n) => n.length === 4);
    if (yearIndex < 0) {
        if (numbers.length > 1 && numbers[1].length === 2) {
            yearIndex = 1;
        } else {
            return null;
        }
    }
    const dayIndex = numbers.findIndex((n, i) => i !== yearIndex && n.length <= 2);
    if (dayIndex < 0) {
        return null;
    }
    return make(year(numbers[yearIndex]), month, parseInt(numbers[dayIndex], 10));
}

export function parseCsvDate(raw: string, order: DateOrder): DayString | null {
    const text = raw.trim();
    if (text.length === 0) {
        return null;
    }
    const numeric = NUMERIC.exec(text);
    if (numeric) {
        const [, a, b, c] = numeric;
        if (a.length === 4) {
            return make(parseInt(a, 10), parseInt(b, 10), parseInt(c, 10));
        }
        switch (order) {
            case 'DMY':
                return make(year(c), parseInt(b, 10), parseInt(a, 10));
            case 'MDY':
                return make(year(c), parseInt(a, 10), parseInt(b, 10));
            default:
                return null;
        }
    }
    const compact = COMPACT.exec(text);
    if (compact) {
        return make(parseInt(compact[1], 10), parseInt(compact[2], 10), parseInt(compact[3], 10));
    }
    return parseTextual(text);
}

export function detectDateOrder(samples: string[], preferred: DateOrder = 'DMY'): DateFormatGuess {
    const values = samples.map((s) => s.trim()).filter((s) => s.length > 0);
    if (values.length === 0) {
        return { order: preferred, ambiguous: false };
    }
    const full = CANDIDATES.filter((order) => values.every((v) => parseCsvDate(v, order) !== null));
    const numericOnly = values.filter((v) => !isTextual(v));
    if (full.length > 0) {
        if (full.length === 1) {
            return { order: full[0], ambiguous: false };
        }
        if (numericOnly.length === 0) {
            return { order: preferred, ambiguous: false };
        }
        if (full.includes('YMD')) {
            const allYearFirst = numericOnly.every((v) => {
                const match = NUMERIC.exec(v);
                return (match !== null && match[1].length === 4) || COMPACT.test(v);
            });
            if (allYearFirst) {
                return { order: 'YMD', ambiguous: false };
            }
        }
        return { order: full.includes(preferred) ? preferred : full[0], ambiguous: true };
    }
    let best: DateOrder = preferred;
    let bestCount = -1;
    for (const order of CANDIDATES) {
        const count = values.filter((v) => parseCsvDate(v, order) !== null).length;
        if (count > bestCount) {
            bestCount = count;
            best = order;
        }
    }
    return { order: best, ambiguous: false };
}
