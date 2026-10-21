import { dateOnly } from '../../utils/core/filters';
import { detectDateOrder } from './csvDates';
import { detectDecimal, parseCsvNumber } from './csvNumbers';
import { validateRow } from './csvRowValidator';
import {
    CSV_IMPORT_LIMITS,
    ColumnMapping,
    CsvAnalysisResult,
    CsvField,
    DateOrder,
    DayString,
    DetectedFormat,
    ExistingExpense,
    ImportCounts,
    ImportOptions,
    ImportRow,
} from './csvTypes';

const isImportable = (row: ImportRow) =>
    row.draft !== null && (row.status === 'VALID' || row.status === 'WARNING');

const dataRows = (records: string[][], hasHeader: boolean) => (hasHeader ? records.slice(1) : records);

export function countRows(rows: ImportRow[]): ImportCounts {
    const count = (status: ImportRow['status']) => rows.filter((r) => r.status === status).length;
    return {
        total: rows.length,
        valid: count('VALID'),
        warning: count('WARNING'),
        error: count('ERROR'),
        skippedIncome: count('SKIPPED_INCOME'),
        duplicates: rows.filter((r) => isImportable(r) && r.duplicate).length,
    };
}

export function importableCount(counts: ImportCounts): number {
    return counts.valid + counts.warning;
}

export function analyzeCsv(
    records: string[][],
    hasHeader: boolean,
    mapping: ColumnMapping,
    options: ImportOptions,
): CsvAnalysisResult {
    const data = dataRows(records, hasHeader);
    if (data.length === 0) {
        return { kind: 'noRows' };
    }
    if (data.length > CSV_IMPORT_LIMITS.MAX_ROWS) {
        return { kind: 'tooManyRows', rows: data.length };
    }
    const offset = hasHeader ? 2 : 1;
    const rows = data.map((cells, i) => validateRow(i + offset, cells, mapping, options));
    return { kind: 'ok', analysis: { rows, counts: countRows(rows) } };
}

export function detectFormat(
    records: string[][],
    hasHeader: boolean,
    mapping: ColumnMapping,
    sampleSize = 500,
    preferredDate: DateOrder = 'DMY',
): DetectedFormat {
    const data = dataRows(records, hasHeader).slice(0, sampleSize);
    const column = (field: CsvField): string[] => {
        const index = mapping[field];
        if (index === undefined) {
            return [];
        }
        return data.flatMap((row) => (index < row.length ? [row[index]] : []));
    };
    const decimal = detectDecimal([...column('amount'), ...column('debit'), ...column('credit')]);
    const values = column('amount')
        .map((v) => parseCsvNumber(v, decimal.separator))
        .filter((v): v is number => v !== null);
    const negatives = values.filter((v) => v < 0).length;
    const positives = values.filter((v) => v > 0).length;
    return {
        decimal,
        date: detectDateOrder(column('date'), preferredDate),
        sign: negatives > positives ? 'NEGATIVE_IS_EXPENSE' : 'POSITIVE_IS_EXPENSE',
    };
}

export function selectForImport(rows: ImportRow[], skipDuplicates: boolean): ImportRow[] {
    return rows.filter((r) => isImportable(r) && !(skipDuplicates && r.duplicate));
}

function normalizeTitle(title: string): string {
    return title.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function duplicateKey(day: DayString, cost: number, title: string, currency: string): string {
    return `${day}|${Math.round(100 * cost)}|${normalizeTitle(title)}|${currency.toUpperCase()}`;
}

/** Flags importable rows that match an existing expense by day, amount, title and currency. */
export function markDuplicates(rows: ImportRow[], existing: ExistingExpense[]): ImportRow[] {
    if (existing.length === 0) {
        return rows.map((row) => ({ ...row, duplicate: false }));
    }
    const keys = new Set(
        existing.map((e) => duplicateKey(dateOnly(e.date), e.cost, e.title, e.currency)),
    );
    return rows.map((row) => {
        const draft = row.draft;
        if (!isImportable(row) || draft === null) {
            return { ...row, duplicate: false };
        }
        return {
            ...row,
            duplicate: keys.has(duplicateKey(draft.date, draft.cost, draft.title, draft.currency)),
        };
    });
}

/** First and last day among the importable rows; null when none. */
export function dateRange(rows: ImportRow[]): [DayString, DayString] | null {
    const days = rows.flatMap((r) => (isImportable(r) && r.draft ? [r.draft.date] : [])).sort();
    return days.length === 0 ? null : [days[0], days[days.length - 1]];
}
