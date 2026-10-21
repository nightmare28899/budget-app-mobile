import { parseCsv, sniffDelimiter } from '../../../src/modules/csvImport/csvParser';

const parse = (text: string, delimiter = ',') => parseCsv(text, delimiter).rows;

describe('parseCsv', () => {
    it('parses simple rows', () => {
        expect(parse('a,b\n1,2')).toEqual([['a', 'b'], ['1', '2']]);
    });

    it('handles crlf, lf and cr line endings', () => {
        const expected = [['a', 'b'], ['1', '2']];
        expect(parse('a,b\r\n1,2\r\n')).toEqual(expected);
        expect(parse('a,b\n1,2\n')).toEqual(expected);
        expect(parse('a,b\r1,2\r')).toEqual(expected);
    });

    it('keeps embedded delimiters, newlines and escaped quotes in quoted fields', () => {
        expect(parse('"x,y",z')).toEqual([['x,y', 'z']]);
        expect(parse('"l1\nl2",z')).toEqual([['l1\nl2', 'z']]);
        expect(parse('"say ""hi""",z')).toEqual([['say "hi"', 'z']]);
    });

    it('preserves empty fields', () => {
        expect(parse(',b,')).toEqual([['', 'b', '']]);
    });

    it('skips blank lines', () => {
        expect(parse('a\n\n\nb\n')).toEqual([['a'], ['b']]);
    });

    it('treats a quote inside an unquoted field as literal', () => {
        expect(parse('5" pipe,x')).toEqual([['5" pipe', 'x']]);
    });

    it('keeps ragged rows as is', () => {
        expect(parse('a,b,c\n1')).toEqual([['a', 'b', 'c'], ['1']]);
    });

    it('supports semicolon and tab delimiters', () => {
        expect(parse('a;"b;c"', ';')).toEqual([['a', 'b;c']]);
        expect(parse('a\tb', '\t')).toEqual([['a', 'b']]);
    });

    it('flags an unterminated quote and consumes the rest', () => {
        const result = parseCsv('a,"b\nc,d', ',');
        expect(result.unterminatedQuote).toBe(true);
        expect(result.rows).toEqual([['a', 'b\nc,d']]);
    });

    it('does not flag well formed input', () => {
        expect(parseCsv('a,"b"\n', ',').unterminatedQuote).toBe(false);
    });

    it('appends text after a closing quote literally', () => {
        expect(parse('"a"bc,z')).toEqual([['abc', 'z']]);
    });

    it('skips whitespace-only records but keeps spaces inside cells', () => {
        expect(parse(' a ,b\n   \n')).toEqual([[' a ', 'b']]);
    });
});

describe('sniffDelimiter', () => {
    it('sniffs comma, semicolon and tab', () => {
        expect(sniffDelimiter('a,b,c\n1,2,3\n4,5,6')).toBe(',');
        expect(sniffDelimiter('a;b;c\n1,5;2;3\n4,5;5;6')).toBe(';');
        expect(sniffDelimiter('a\tb\tc\n1\t2\t3')).toBe('\t');
    });

    it('ignores delimiters inside quotes', () => {
        expect(sniffDelimiter('a;b\n"1,2,3,4";x\n"5,6,7";y')).toBe(';');
    });

    it('defaults to comma for a single column', () => {
        expect(sniffDelimiter('a\nb\nc')).toBe(',');
    });
});
