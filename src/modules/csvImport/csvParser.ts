import type { CsvParseResult } from './csvTypes';

const SNIFF_CHARS = 65536;
const SNIFF_RECORDS = 20;
const CANDIDATES = [',', ';', '\t', '|'];

export function parseCsv(text: string, delimiter: string): CsvParseResult {
    const rows: string[][] = [];
    let record: string[] = [];
    let field = '';
    let inQuotes = false;
    let fieldWasQuoted = false;

    const endField = () => {
        record.push(field);
        field = '';
        fieldWasQuoted = false;
    };
    const endRecord = () => {
        endField();
        const blank = record.length === 1 && record[0].trim() === '';
        if (!blank) {
            rows.push(record);
        }
        record = [];
    };

    const n = text.length;
    for (let i = 0; i < n; i++) {
        const c = text[i];
        if (inQuotes) {
            if (c === '"') {
                if (i + 1 < n && text[i + 1] === '"') {
                    field += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                field += c;
            }
        } else if (c === '"' && field.length === 0 && !fieldWasQuoted) {
            inQuotes = true;
            fieldWasQuoted = true;
        } else if (c === delimiter) {
            endField();
        } else if (c === '\r') {
            endRecord();
            if (i + 1 < n && text[i + 1] === '\n') {
                i++;
            }
        } else if (c === '\n') {
            endRecord();
        } else {
            field += c;
        }
    }
    const unterminatedQuote = inQuotes;
    if (field.length > 0 || record.length > 0 || fieldWasQuoted) {
        endRecord();
    }
    return { rows, unterminatedQuote };
}

/** Picks the delimiter whose first records agree most on a column count of at least two. */
export function sniffDelimiter(text: string): string {
    const sample = text.length > SNIFF_CHARS ? text.slice(0, SNIFF_CHARS) : text;
    let best = ',';
    let bestScore = 0;
    for (const candidate of CANDIDATES) {
        const rows = parseCsv(sample, candidate).rows.slice(0, SNIFF_RECORDS);
        if (rows.length === 0) {
            continue;
        }
        const counts = new Map<number, number>();
        for (const row of rows) {
            counts.set(row.length, (counts.get(row.length) ?? 0) + 1);
        }
        let modalSize = -1;
        let modalCount = 0;
        let modalWeight = -1;
        counts.forEach((count, size) => {
            const weight = count * 1000 + size;
            if (weight > modalWeight) {
                modalWeight = weight;
                modalSize = size;
                modalCount = count;
            }
        });
        if (modalSize >= 2) {
            const score = modalCount * 1000 + modalSize;
            if (score > bestScore) {
                bestScore = score;
                best = candidate;
            }
        }
    }
    return best;
}
