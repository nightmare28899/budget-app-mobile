import { parseCsvDate } from './csvDates';
import { parseCsvNumber } from './csvNumbers';
import { cleanCsvText, wasTruncated } from './csvSanitizer';
import { normalizeHeader } from './headerMapper';
import {
    CSV_IMPORT_LIMITS,
    ColumnMapping,
    CsvField,
    ImportOptions,
    ImportRow,
    RowIssue,
    isErrorIssue,
} from './csvTypes';

const CURRENCY = /^[A-Z]{3}$/;
const MAX_COST = 9_999_999.99;

function cell(mapping: ColumnMapping, cells: string[], field: CsvField): string {
    const index = mapping[field];
    return index === undefined ? '' : cells[index] ?? '';
}

/** Round half to even, like Kotlin's Math.rint. */
function rint(value: number): number {
    const floor = Math.floor(value);
    const diff = value - floor;
    if (diff < 0.5) {
        return floor;
    }
    if (diff > 0.5) {
        return floor + 1;
    }
    return floor % 2 === 0 ? floor : floor + 1;
}

type Amount = { cost: number | null; skippedIncome: boolean };

function readAmount(
    mapping: ColumnMapping,
    cells: string[],
    o: ImportOptions,
    issues: RowIssue[],
): Amount {
    const debitRaw = cell(mapping, cells, 'debit').trim();
    const creditRaw = cell(mapping, cells, 'credit').trim();
    const amountRaw = cell(mapping, cells, 'amount').trim();
    const split = mapping.amount === undefined && (mapping.debit !== undefined || mapping.credit !== undefined);

    if (split) {
        const debit = debitRaw ? parseCsvNumber(debitRaw, o.decimal) : null;
        const credit = creditRaw ? parseCsvNumber(creditRaw, o.decimal) : null;
        if (debitRaw && debit === null) {
            issues.push('INVALID_AMOUNT');
        } else if (creditRaw && credit === null && (debit === null || debit === 0)) {
            issues.push('INVALID_AMOUNT');
        } else if (debit !== null && debit !== 0) {
            return { cost: Math.abs(debit), skippedIncome: false };
        } else if (credit !== null && credit !== 0) {
            return { cost: null, skippedIncome: true };
        } else if (!debitRaw && !creditRaw) {
            issues.push('MISSING_AMOUNT');
        } else {
            issues.push('ZERO_AMOUNT');
        }
        return { cost: null, skippedIncome: false };
    }

    if (!amountRaw) {
        issues.push('MISSING_AMOUNT');
        return { cost: null, skippedIncome: false };
    }
    const value = parseCsvNumber(amountRaw, o.decimal);
    if (value === null) {
        issues.push('INVALID_AMOUNT');
    } else if (value === 0) {
        issues.push('ZERO_AMOUNT');
    } else if (o.sign === 'POSITIVE_IS_EXPENSE') {
        return value > 0
            ? { cost: value, skippedIncome: false }
            : { cost: null, skippedIncome: true };
    } else {
        return value < 0
            ? { cost: -value, skippedIncome: false }
            : { cost: null, skippedIncome: true };
    }
    return { cost: null, skippedIncome: false };
}

const withoutDraft = (line: number, status: ImportRow['status'], issues: RowIssue[]): ImportRow => ({
    line,
    status,
    issues,
    draft: null,
    duplicate: false,
});

export function validateRow(
    line: number,
    cells: string[],
    mapping: ColumnMapping,
    o: ImportOptions,
): ImportRow {
    const issues: RowIssue[] = [];

    const rawDate = cell(mapping, cells, 'date').trim();
    let date: string | null = null;
    if (!rawDate) {
        issues.push('MISSING_DATE');
    } else {
        date = parseCsvDate(rawDate, o.dateOrder);
        if (date === null) {
            issues.push('INVALID_DATE');
        }
    }

    const amount = readAmount(mapping, cells, o, issues);
    let cost = amount.cost;
    if (cost !== null) {
        const cents = rint(cost * 100) / 100;
        if (cents === 0) {
            issues.push('ZERO_AMOUNT');
            cost = null;
        } else if (cents > MAX_COST) {
            issues.push('AMOUNT_TOO_LARGE');
            cost = null;
        } else {
            cost = cents;
        }
    }

    if (issues.some(isErrorIssue)) {
        return withoutDraft(line, 'ERROR', issues);
    }
    if (amount.skippedIncome) {
        return withoutDraft(line, 'SKIPPED_INCOME', []);
    }
    if (date === null) {
        return withoutDraft(line, 'ERROR', ['INVALID_DATE']);
    }
    if (cost === null) {
        return withoutDraft(line, 'ERROR', ['INVALID_AMOUNT']);
    }

    const warnings: RowIssue[] = [];
    let truncated = false;
    const text = (field: CsvField, max: number): string => {
        const raw = cell(mapping, cells, field);
        if (wasTruncated(raw, max)) {
            truncated = true;
        }
        return cleanCsvText(raw, max);
    };

    const merchant = text('merchant', CSV_IMPORT_LIMITS.MAX_MERCHANT) || null;
    let title = text('title', CSV_IMPORT_LIMITS.MAX_TITLE);
    if (!title) {
        title = merchant ?? o.fallbackTitle;
        warnings.push('MISSING_TITLE');
    }
    const note = text('note', CSV_IMPORT_LIMITS.MAX_NOTE) || null;

    const currencyRaw = cell(mapping, cells, 'currency').trim().toUpperCase();
    let currency = o.defaultCurrency;
    if (currencyRaw) {
        if (CURRENCY.test(currencyRaw)) {
            currency = currencyRaw;
        } else {
            warnings.push('INVALID_CURRENCY');
        }
    }

    const categoryRaw = cleanCsvText(cell(mapping, cells, 'category'), CSV_IMPORT_LIMITS.MAX_CATEGORY_CELL);
    let categoryId = o.defaultCategoryId;
    if (categoryRaw) {
        const key = normalizeHeader(categoryRaw);
        const match = o.categories.find((c) => normalizeHeader(c.name) === key);
        if (match) {
            categoryId = match.id;
        } else {
            warnings.push('UNKNOWN_CATEGORY');
        }
    }

    if (date > o.today) {
        warnings.push('FUTURE_DATE');
    }
    if (truncated) {
        warnings.push('TEXT_TRUNCATED');
    }

    return {
        line,
        status: warnings.length === 0 ? 'VALID' : 'WARNING',
        issues: warnings,
        draft: {
            title,
            cost,
            currency,
            date,
            merchantName: merchant,
            note,
            paymentMethod: o.defaultPaymentMethod,
            categoryId,
        },
        duplicate: false,
    };
}
