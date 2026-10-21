/* eslint-disable no-bitwise -- byte-level decoding */
import { CSV_IMPORT_LIMITS, DecodedCsv } from './csvTypes';

const CHUNK = 8192;

/** Returns the bytes when they fit in `maxBytes`, null when they are longer. */
export function readBounded(
    bytes: Uint8Array,
    maxBytes: number = CSV_IMPORT_LIMITS.MAX_FILE_BYTES,
): Uint8Array | null {
    return bytes.byteLength > maxBytes ? null : bytes;
}

function fromCodeUnits(units: number[]): string {
    let out = '';
    for (let i = 0; i < units.length; i += CHUNK) {
        out += String.fromCharCode(...units.slice(i, i + CHUNK));
    }
    return out;
}

/**
 * UTF-8 decoder. Strict mode returns null on any malformed, overlong, surrogate or truncated sequence;
 * lenient mode replaces each bad byte with U+FFFD.
 */
function decodeUtf8(bytes: Uint8Array, start: number, strict: boolean): string | null {
    const units: number[] = [];
    let i = start;
    const n = bytes.length;
    while (i < n) {
        const b0 = bytes[i];
        if (b0 < 0x80) {
            units.push(b0);
            i += 1;
            continue;
        }
        let needed: number;
        let codePoint: number;
        let min: number;
        if (b0 >= 0xc2 && b0 <= 0xdf) {
            needed = 1;
            codePoint = b0 & 0x1f;
            min = 0x80;
        } else if (b0 >= 0xe0 && b0 <= 0xef) {
            needed = 2;
            codePoint = b0 & 0x0f;
            min = 0x800;
        } else if (b0 >= 0xf0 && b0 <= 0xf4) {
            needed = 3;
            codePoint = b0 & 0x07;
            min = 0x10000;
        } else {
            if (strict) {
                return null;
            }
            units.push(0xfffd);
            i += 1;
            continue;
        }
        let valid = true;
        for (let k = 1; k <= needed; k++) {
            const bk = bytes[i + k];
            if (bk === undefined || (bk & 0xc0) !== 0x80) {
                valid = false;
                break;
            }
            codePoint = (codePoint << 6) | (bk & 0x3f);
        }
        if (
            valid
            && (codePoint < min || codePoint > 0x10ffff || (codePoint >= 0xd800 && codePoint <= 0xdfff))
        ) {
            valid = false;
        }
        if (!valid) {
            if (strict) {
                return null;
            }
            units.push(0xfffd);
            i += 1;
            continue;
        }
        if (codePoint >= 0x10000) {
            const offset = codePoint - 0x10000;
            units.push(0xd800 + (offset >> 10), 0xdc00 + (offset & 0x3ff));
        } else {
            units.push(codePoint);
        }
        i += needed + 1;
    }
    return fromCodeUnits(units);
}

function decodeUtf16(bytes: Uint8Array, start: number, littleEndian: boolean): string {
    const units: number[] = [];
    for (let i = start; i + 1 < bytes.length; i += 2) {
        units.push(littleEndian ? bytes[i] | (bytes[i + 1] << 8) : (bytes[i] << 8) | bytes[i + 1]);
    }
    return fromCodeUnits(units);
}

// windows-1252 differs from Latin-1 only in 0x80..0x9F; undefined slots map to the control code point.
const WINDOWS_1252_HIGH = [
    0x20ac, 0x81, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021,
    0x02c6, 0x2030, 0x0160, 0x2039, 0x0152, 0x8d, 0x017d, 0x8f,
    0x90, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2013, 0x2014,
    0x02dc, 0x2122, 0x0161, 0x203a, 0x0153, 0x9d, 0x017e, 0x0178,
];

function decodeWindows1252(bytes: Uint8Array): string {
    const units: number[] = [];
    for (let i = 0; i < bytes.length; i++) {
        const b = bytes[i];
        units.push(b >= 0x80 && b <= 0x9f ? WINDOWS_1252_HIGH[b - 0x80] : b);
    }
    return fromCodeUnits(units);
}

export function decodeCsv(bytes: Uint8Array): DecodedCsv {
    if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
        return { text: decodeUtf8(bytes, 3, false) ?? '', encoding: 'UTF8_BOM' };
    }
    if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
        return { text: decodeUtf16(bytes, 2, true), encoding: 'UTF16' };
    }
    if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
        return { text: decodeUtf16(bytes, 2, false), encoding: 'UTF16' };
    }
    const text = decodeUtf8(bytes, 0, true);
    if (text !== null) {
        return { text, encoding: 'UTF8' };
    }
    return { text: decodeWindows1252(bytes), encoding: 'LATIN1' };
}
