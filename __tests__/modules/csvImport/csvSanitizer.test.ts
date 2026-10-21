import { cleanCsvText, wasTruncated } from '../../../src/modules/csvImport/csvSanitizer';

describe('cleanCsvText', () => {
    it('trims and collapses whitespace including newlines and tabs', () => {
        expect(cleanCsvText('  a \n b\t\tc  ', 50)).toBe('a b c');
    });

    it('removes control, bidi and zero width characters', () => {
        expect(cleanCsvText('a\u0000b\u0007c', 50)).toBe('abc');
        expect(cleanCsvText('a‮b⁦c‏', 50)).toBe('abc');
        expect(cleanCsvText('a​b﻿c­', 50)).toBe('abc');
        expect(cleanCsvText('a\u0085b', 50).replace(' ', '')).toBe('ab');
    });

    it('caps length by code points without splitting surrogates', () => {
        expect(cleanCsvText('abcdef', 3)).toBe('abc');
        expect(cleanCsvText('😀'.repeat(5), 2)).toBe('😀😀');
    });

    it('trims a trailing space left by the cap', () => {
        expect(cleanCsvText('ab cd', 3)).toBe('ab');
    });

    it('reports truncation', () => {
        expect(wasTruncated('abcdef', 3)).toBe(true);
        expect(wasTruncated('abc', 3)).toBe(false);
    });
});
