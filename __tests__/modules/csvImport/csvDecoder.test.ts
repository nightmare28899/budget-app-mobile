/* eslint-disable no-bitwise -- byte-level helpers */
import { decodeCsv, readBounded } from '../../../src/modules/csvImport/csvDecoder';
import { CSV_IMPORT_LIMITS } from '../../../src/modules/csvImport/csvTypes';

const utf8 = (text: string): number[] => {
    const bytes: number[] = [];
    for (const char of text) {
        const cp = char.codePointAt(0) as number;
        if (cp < 0x80) bytes.push(cp);
        else if (cp < 0x800) bytes.push(0xc0 | (cp >> 6), 0x80 | (cp & 0x3f));
        else if (cp < 0x10000) bytes.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
        else bytes.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3f), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
    }
    return bytes;
};
const latin1 = (text: string): number[] => Array.from(text, (char) => char.charCodeAt(0));
const utf16 = (text: string, littleEndian: boolean): number[] =>
    Array.from(text).flatMap((char) => {
        const code = char.charCodeAt(0);
        return littleEndian ? [code & 0xff, code >> 8] : [code >> 8, code & 0xff];
    });
const u8 = (bytes: number[]) => Uint8Array.from(bytes);

describe('decodeCsv', () => {
    it('decodes utf8 without bom', () => {
        const decoded = decodeCsv(u8(utf8('descripción,€')));
        expect(decoded.text).toBe('descripción,€');
        expect(decoded.encoding).toBe('UTF8');
    });

    it('strips the utf8 bom', () => {
        const decoded = decodeCsv(u8([0xef, 0xbb, 0xbf, ...utf8('fecha,monto')]));
        expect(decoded.text).toBe('fecha,monto');
        expect(decoded.encoding).toBe('UTF8_BOM');
    });

    it('falls back to windows-1252 for invalid utf8', () => {
        const decoded = decodeCsv(u8(latin1('Descripción,Año')));
        expect(decoded.text).toBe('Descripción,Año');
        expect(decoded.encoding).toBe('LATIN1');
    });

    it('maps windows-1252 specific characters', () => {
        const decoded = decodeCsv(u8([0x80, 0x2c, 0x93, 0x41, 0x94]));
        expect(decoded.text).toBe('€,“A”');
        expect(decoded.encoding).toBe('LATIN1');
    });

    it('decodes utf16 le and be with a bom', () => {
        const le = [0xff, 0xfe, ...utf16('a;b', true)];
        const be = [0xfe, 0xff, ...utf16('a;b', false)];
        expect(decodeCsv(u8(le)).text).toBe('a;b');
        expect(decodeCsv(u8(be)).text).toBe('a;b');
        expect(decodeCsv(u8(le)).encoding).toBe('UTF16');
    });

    it('decodes astral characters in utf8', () => {
        expect(decodeCsv(u8(utf8('a😀b'))).text).toBe('a😀b');
    });

    it('rejects overlong and truncated utf8 sequences as latin1', () => {
        expect(decodeCsv(u8([0xc0, 0x80])).encoding).toBe('LATIN1');
        expect(decodeCsv(u8([0xe2, 0x82])).encoding).toBe('LATIN1');
    });
});

describe('readBounded', () => {
    it('accepts up to the limit', () => {
        expect(readBounded(new Uint8Array(100), 100)).not.toBeNull();
    });

    it('rejects larger input', () => {
        expect(readBounded(new Uint8Array(101), 100)).toBeNull();
    });
});

describe('limits', () => {
    it('keeps the documented constants', () => {
        expect(CSV_IMPORT_LIMITS.MAX_FILE_BYTES).toBe(10 * 1024 * 1024);
        expect(CSV_IMPORT_LIMITS.MAX_ROWS).toBe(5000);
    });
});
