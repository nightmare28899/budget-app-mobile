import type { DecimalDetection, DecimalSeparator } from './csvTypes';

const MINUS_SIGN = '−';
const CODE_PREFIX = /^[A-Za-z]{2,4}\s*/;
const CODE_SUFFIX = /\s*[A-Za-z]{2,4}$/;
const DIGIT = /^\p{Nd}$/u;
const CURRENCY_SYMBOL = /^\p{Sc}$/u;
const IGNORABLE_SPACES = new Set(["'", '’', ' ', ' ', ' ']);

function isIgnorable(char: string): boolean {
    return /^\s$/.test(char) || IGNORABLE_SPACES.has(char) || CURRENCY_SYMBOL.test(char);
}

/** Keeps digits, separators and sign characters; null when something else (letters, symbols) is in the way. */
function core(raw: string): string | null {
    let out = '';
    for (const char of raw) {
        if (DIGIT.test(char) || '.,-+()'.includes(char)) {
            out += char;
        } else if (char === MINUS_SIGN) {
            out += '-';
        } else if (!isIgnorable(char)) {
            return null;
        }
    }
    return out;
}

function stripCurrencyCode(text: string): string {
    if (!/\p{Nd}/u.test(text)) {
        return text;
    }
    return text.replace(CODE_PREFIX, '').replace(CODE_SUFFIX, '');
}

const count = (text: string, char: string) => text.split(char).length - 1;

export function parseCsvNumber(raw: string, decimal: DecimalSeparator): number | null {
    let s = core(stripCurrencyCode(raw.trim()));
    if (s === null) {
        return null;
    }
    let negative = false;
    if (s.startsWith('(') && s.endsWith(')')) {
        negative = true;
        s = s.slice(1, -1);
    }
    if (s.endsWith('-')) {
        negative = true;
        s = s.slice(0, -1);
    }
    if (s.startsWith('-')) {
        negative = true;
        s = s.slice(1);
    } else if (s.startsWith('+')) {
        s = s.slice(1);
    }
    if (s.length === 0 || /[^\p{Nd}.,]/u.test(s)) {
        return null;
    }
    const decimalChar = decimal === 'DOT' ? '.' : ',';
    const grouping = decimal === 'DOT' ? ',' : '.';
    let t = s.split(grouping).join('');
    if (count(t, decimalChar) > 1) {
        return null;
    }
    if (decimal === 'COMMA') {
        t = t.replace(',', '.');
    }
    if (!/^\d*\.?\d*$/.test(t) || !/\d/.test(t)) {
        return null;
    }
    const value = Number(t);
    if (!Number.isFinite(value)) {
        return null;
    }
    return negative ? -value : value;
}

export function detectDecimal(samples: string[]): DecimalDetection {
    let dot = 0;
    let comma = 0;
    let ambiguousSamples = 0;
    for (const sample of samples) {
        const cored = core(stripCurrencyCode(sample.trim()));
        if (cored === null) {
            continue;
        }
        const s = cored.replace(/[^\p{Nd}.,]/gu, '');
        const lastDot = s.lastIndexOf('.');
        const lastComma = s.lastIndexOf(',');
        const dots = count(s, '.');
        const commas = count(s, ',');
        if (dots > 0 && commas > 0) {
            if (lastDot > lastComma) {
                dot++;
            } else {
                comma++;
            }
        } else if (dots > 1) {
            comma++;
        } else if (commas > 1) {
            dot++;
        } else if (dots === 1) {
            if (s.length - lastDot - 1 !== 3 || lastDot <= 0) {
                dot++;
            } else {
                ambiguousSamples++;
            }
        } else if (commas === 1) {
            if (s.length - lastComma - 1 !== 3 || lastComma <= 0) {
                comma++;
            } else {
                ambiguousSamples++;
            }
        }
    }
    if (dot > 0 && comma > 0) {
        return { separator: comma > dot ? 'COMMA' : 'DOT', ambiguous: true };
    }
    if (comma > 0) {
        return { separator: 'COMMA', ambiguous: false };
    }
    if (dot > 0) {
        return { separator: 'DOT', ambiguous: false };
    }
    return { separator: 'DOT', ambiguous: ambiguousSamples > 0 };
}
