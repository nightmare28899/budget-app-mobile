import type { PaymentMethodValue } from '../../types/index';

export type CsvEncoding = 'UTF8' | 'UTF8_BOM' | 'UTF16' | 'LATIN1';

export type CsvField =
    | 'date'
    | 'title'
    | 'amount'
    | 'debit'
    | 'credit'
    | 'currency'
    | 'category'
    | 'note'
    | 'merchant';

/** Display and matching order of the importable fields. */
export const CSV_FIELDS: readonly CsvField[] = [
    'date',
    'title',
    'amount',
    'debit',
    'credit',
    'currency',
    'category',
    'note',
    'merchant',
];

export type DateOrder = 'DMY' | 'MDY' | 'YMD';
export type DecimalSeparator = 'DOT' | 'COMMA';
export type SignConvention = 'POSITIVE_IS_EXPENSE' | 'NEGATIVE_IS_EXPENSE';
export type AbortReason = 'TOO_MANY_FAILURES' | 'SESSION_CHANGED';
export type JobRowState = 'PENDING' | 'ACCEPTED' | 'CONFIRMED' | 'FAILED';
export type RowStatus = 'VALID' | 'WARNING' | 'ERROR' | 'SKIPPED_INCOME';

export type RowIssue =
    | 'MISSING_DATE'
    | 'INVALID_DATE'
    | 'MISSING_AMOUNT'
    | 'INVALID_AMOUNT'
    | 'ZERO_AMOUNT'
    | 'AMOUNT_TOO_LARGE'
    | 'MISSING_TITLE'
    | 'FUTURE_DATE'
    | 'INVALID_CURRENCY'
    | 'UNKNOWN_CATEGORY'
    | 'TEXT_TRUNCATED';

const ERROR_ISSUES: ReadonlySet<RowIssue> = new Set<RowIssue>([
    'MISSING_DATE',
    'INVALID_DATE',
    'MISSING_AMOUNT',
    'INVALID_AMOUNT',
    'ZERO_AMOUNT',
    'AMOUNT_TOO_LARGE',
]);

export function isErrorIssue(issue: RowIssue): boolean {
    return ERROR_ISSUES.has(issue);
}

export const CSV_IMPORT_LIMITS = {
    BATCH_SIZE: 50,
    MAX_CATEGORY_CELL: 100,
    MAX_CONSECUTIVE_FAILURES: 5,
    MAX_FILE_BYTES: 10_485_760,
    MAX_MERCHANT: 100,
    MAX_NOTE: 500,
    MAX_ROWS: 5000,
    MAX_TITLE: 120,
    PREVIEW_ROWS: 50,
} as const;

export type DecodedCsv = { text: string; encoding: CsvEncoding };
export type CsvParseResult = { rows: string[][]; unterminatedQuote: boolean };
export type DateFormatGuess = { order: DateOrder; ambiguous: boolean };
export type DecimalDetection = { separator: DecimalSeparator; ambiguous: boolean };
export type DetectedFormat = {
    decimal: DecimalDetection;
    date: DateFormatGuess;
    sign: SignConvention;
};

/** Field to zero-based column index; a column feeds at most one field. */
export type ColumnMapping = Partial<Record<CsvField, number>>;

/** Calendar day as `YYYY-MM-DD`, which sorts and compares as text. */
export type DayString = string;

export type ImportCategory = { id: string; name: string };

export type ExpenseDraft = {
    title: string;
    cost: number;
    currency: string;
    date: DayString;
    merchantName: string | null;
    note: string | null;
    paymentMethod: PaymentMethodValue | null;
    categoryId: string | null;
};

export type ImportOptions = {
    decimal: DecimalSeparator;
    dateOrder: DateOrder;
    sign: SignConvention;
    defaultCurrency: string;
    defaultCategoryId: string | null;
    defaultPaymentMethod: PaymentMethodValue | null;
    categories: ImportCategory[];
    /** Today as `YYYY-MM-DD`, used to flag future dates. */
    today: DayString;
    fallbackTitle: string;
};

export type ImportRow = {
    line: number;
    status: RowStatus;
    issues: RowIssue[];
    draft: ExpenseDraft | null;
    duplicate: boolean;
};

export type ImportCounts = {
    total: number;
    valid: number;
    warning: number;
    error: number;
    skippedIncome: number;
    duplicates: number;
};

export type CsvAnalysis = { rows: ImportRow[]; counts: ImportCounts };

export type CsvAnalysisResult =
    | { kind: 'ok'; analysis: CsvAnalysis }
    | { kind: 'tooManyRows'; rows: number }
    | { kind: 'noRows' };

export type ExistingExpense = {
    date: string;
    cost: number;
    title: string;
    currency: string;
};

export type AcceptResult =
    | { kind: 'accepted'; handle: string }
    | { kind: 'rejected'; reason: string }
    /** The request got no HTTP response (timeout, network drop): the server may or may not have stored the row. */
    | { kind: 'unknown'; reason: string };

export type Settlement =
    | { kind: 'confirmed' }
    | { kind: 'queued' }
    | { kind: 'failed'; reason: string | null };

export interface ImportSink {
    /** May throw {@link ImportSessionChanged} to stop the whole run. */
    accept(draft: ExpenseDraft): Promise<AcceptResult>;
    settle(handles: string[]): Promise<Record<string, Settlement>>;
}

export class ImportSessionChanged extends Error {
    constructor() {
        super('session changed during import');
        this.name = 'ImportSessionChanged';
        Object.setPrototypeOf(this, ImportSessionChanged.prototype);
    }
}

/** Thrown to stop a run for good; the runner never swallows it. */
export class ImportCancelled extends Error {
    constructor() {
        super('import cancelled');
        this.name = 'ImportCancelled';
        Object.setPrototypeOf(this, ImportCancelled.prototype);
    }
}

export type JobRow = {
    line: number;
    draft: ExpenseDraft;
    state: JobRowState;
    handle: string | null;
    error: string | null;
    /** Failed with an unknown outcome: the row may already exist remotely, so it is never re-sent blindly. */
    ambiguous?: true;
};

export type ImportJob = { rows: JobRow[] };

export type JobFailure = { line: number; title: string; error: string | null; ambiguous?: true };

export type ImportProgress = { done: number; total: number; settling: boolean };

export type ImportReport = {
    total: number;
    confirmed: number;
    queued: number;
    failed: number;
    notAttempted: number;
    failures: JobFailure[];
    hasUnfinished: boolean;
};

export type RunResult = { job: ImportJob; abort: AbortReason | null };
