import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { errorCodes, isErrorWithCode, pick, types } from '@react-native-documents/picker';
import { categoriesApi } from '../../api/resources/categories';
import { expensesApi } from '../../api/resources/expenses';
import { useAuthStore } from '../../store/authStore';
import { useI18n } from '../shared/useI18n';
import { CURRENCY_OPTIONS, normalizeCurrency } from '../../utils/domain/currency';
import { toLocalDateString } from '../../utils/core/dateOnly';
import { PaymentMethodValue } from '../../types/index';
import { decodeCsv, readBounded } from '../../modules/csvImport/csvDecoder';
import { parseCsv, sniffDelimiter } from '../../modules/csvImport/csvParser';
import {
    analyzeCsv,
    countRows,
    dateRange,
    detectFormat,
    markDuplicates,
    selectForImport,
} from '../../modules/csvImport/csvImportAnalyzer';
import {
    autoMapHeaders,
    isMappingUsable,
    looksLikeHeader,
    withMapping,
} from '../../modules/csvImport/headerMapper';
import {
    createJob,
    ambiguousDateRange,
    jobReport,
    runImport,
    withFailedRetried,
} from '../../modules/csvImport/expenseImportRunner';
import { createExpenseSink } from '../../modules/csvImport/importSink';
import {
    AbortReason,
    CSV_IMPORT_LIMITS,
    ColumnMapping,
    CsvAnalysis,
    CsvEncoding,
    CsvField,
    DateOrder,
    DecimalSeparator,
    ExistingExpense,
    ImportCancelled,
    ImportJob,
    ImportOptions,
    ImportProgress,
    ImportReport,
    SignConvention,
} from '../../modules/csvImport/csvTypes';

export type CsvImportStage = 'PICK' | 'CONFIGURE' | 'IMPORTING' | 'DONE';
export type CsvImportError = 'TOO_LARGE' | 'EMPTY' | 'UNREADABLE' | 'TOO_MANY_ROWS';

/** Payment methods a file can default to; a credit card needs a specific card, which a file cannot name. */
export const IMPORT_PAYMENT_METHODS: PaymentMethodValue[] = ['CASH', 'DEBIT_CARD', 'TRANSFER'];

const MAX_EXISTING_LOOKUP = 5000;

function preferredDateOrder(): DateOrder {
    try {
        const locale = Intl.DateTimeFormat().resolvedOptions().locale;
        return /[-_]US$/i.test(locale) ? 'MDY' : 'DMY';
    } catch {
        return 'DMY';
    }
}

function positionalHeaders(records: string[][]): string[] {
    const width = records.reduce((max, row) => Math.max(max, row.length), 0);
    return Array.from({ length: width }, (_, i) => `#${i + 1}`);
}

type FileState = {
    stage: CsvImportStage;
    busy: boolean;
    error: CsvImportError | null;
    errorRows: number;
    fileName: string | null;
    encoding: CsvEncoding | null;
    delimiter: string;
    unterminatedQuote: boolean;
    records: string[][];
    hasHeader: boolean;
    mapping: ColumnMapping;
};

type FormatState = {
    decimal: DecimalSeparator;
    decimalAmbiguous: boolean;
    dateOrder: DateOrder;
    dateAmbiguous: boolean;
    sign: SignConvention;
};

type DuplicateLookup = {
    existing: ExistingExpense[];
    checked: boolean;
    failed: boolean;
    truncated: boolean;
};

const INITIAL_FILE: FileState = {
    stage: 'PICK',
    busy: false,
    error: null,
    errorRows: 0,
    fileName: null,
    encoding: null,
    delimiter: ',',
    unterminatedQuote: false,
    records: [],
    hasHeader: true,
    mapping: {},
};

const INITIAL_FORMAT: FormatState = {
    decimal: 'DOT',
    decimalAmbiguous: false,
    dateOrder: 'DMY',
    dateAmbiguous: false,
    sign: 'POSITIVE_IS_EXPENSE',
};

const INITIAL_LOOKUP: DuplicateLookup = {
    existing: [],
    checked: false,
    failed: false,
    truncated: false,
};

/** Drives the CSV import wizard: pick a file, match columns and formats, preview the rows, import them. */
export function useCsvImport() {
    const { t } = useI18n();
    const queryClient = useQueryClient();
    const user = useAuthStore((s) => s.user);
    const isAccountMode = useAuthStore((s) => s.isAuthenticated);
    const profileCurrency = normalizeCurrency(user?.currency);

    const { data: categories = [] } = useQuery({
        queryKey: ['categories'],
        queryFn: categoriesApi.getAll,
    });

    const [file, setFile] = useState<FileState>(INITIAL_FILE);
    const [format, setFormat] = useState<FormatState>(INITIAL_FORMAT);
    const [defaultCurrency, setDefaultCurrencyState] = useState(profileCurrency);
    const [defaultCategoryId, setDefaultCategoryId] = useState<string | null>(null);
    const [defaultPayment, setDefaultPayment] = useState<PaymentMethodValue | null>(null);
    const [skipDuplicates, setSkipDuplicates] = useState(true);
    const [lookup, setLookup] = useState<DuplicateLookup>(INITIAL_LOOKUP);
    const [job, setJob] = useState<ImportJob | null>(null);
    const [progress, setProgress] = useState<ImportProgress | null>(null);
    const [report, setReport] = useState<ImportReport | null>(null);
    const [abort, setAbort] = useState<AbortReason | null>(null);

    const cancelled = useRef(false);
    const importing = useRef(false);
    const lookupKey = useRef<string | null>(null);

    useEffect(() => {
        cancelled.current = false;
        return () => {
            cancelled.current = true;
        };
    }, []);

    const currencies = useMemo(
        () => Array.from(new Set<string>([...CURRENCY_OPTIONS.map((o) => o.code), profileCurrency])),
        [profileCurrency],
    );

    const options = useMemo<ImportOptions>(
        () => ({
            decimal: format.decimal,
            dateOrder: format.dateOrder,
            sign: format.sign,
            defaultCurrency,
            defaultCategoryId,
            defaultPaymentMethod: defaultPayment,
            categories: categories.map((c) => ({ id: c.id, name: c.name })),
            today: toLocalDateString(new Date()),
            fallbackTitle: t('csvImport.fallbackTitle'),
        }),
        [format, defaultCurrency, defaultCategoryId, defaultPayment, categories, t],
    );

    const baseResult = useMemo(
        () =>
            file.records.length > 0 && isMappingUsable(file.mapping)
                ? analyzeCsv(file.records, file.hasHeader, file.mapping, options)
                : null,
        [file.records, file.hasHeader, file.mapping, options],
    );

    const baseRows = baseResult?.kind === 'ok' ? baseResult.analysis.rows : null;

    // Existing expenses in the file's date range are loaded once per range to flag duplicates.
    const rangeKey = useMemo(() => {
        const range = baseRows ? dateRange(baseRows) : null;
        return range ? `${range[0]}|${range[1]}` : null;
    }, [baseRows]);
    useEffect(() => {
        if (file.stage !== 'CONFIGURE') {
            return undefined;
        }
        if (!rangeKey) {
            setLookup((prev) => (prev.checked ? prev : { ...prev, checked: true }));
            return undefined;
        }
        if (lookupKey.current === rangeKey) {
            return undefined;
        }
        lookupKey.current = rangeKey;
        const [from, to] = rangeKey.split('|');
        let stale = false;
        expensesApi
            .getAllPages({ from, to })
            .then((response) => {
                if (stale) {
                    return;
                }
                setLookup({
                    existing: response.expenses.map((e) => ({
                        date: e.date, cost: e.cost, title: e.title, currency: e.currency,
                    })),
                    checked: true,
                    failed: false,
                    truncated: response.expenses.length >= MAX_EXISTING_LOOKUP,
                });
            })
            .catch(() => {
                if (stale) {
                    return;
                }
                lookupKey.current = null;
                setLookup({ existing: [], checked: false, failed: true, truncated: false });
            });
        return () => {
            stale = true;
        };
    }, [file.stage, rangeKey]);

    const analysis = useMemo<CsvAnalysis | null>(() => {
        if (!baseRows) {
            return null;
        }
        const rows = markDuplicates(baseRows, lookup.existing);
        return { rows, counts: countRows(rows) };
    }, [baseRows, lookup.existing]);

    const analysisError: { error: CsvImportError; rows: number } | null = useMemo(() => {
        if (baseResult?.kind === 'noRows') {
            return { error: 'EMPTY', rows: 0 };
        }
        if (baseResult?.kind === 'tooManyRows') {
            return { error: 'TOO_MANY_ROWS', rows: baseResult.rows };
        }
        return null;
    }, [baseResult]);

    const rowsToImport = analysis ? selectForImport(analysis.rows, skipDuplicates).length : 0;
    const mappingUsable = isMappingUsable(file.mapping);
    const hasAmountMapping = file.mapping.amount !== undefined;
    const splitColumns =
        !hasAmountMapping && (file.mapping.debit !== undefined || file.mapping.credit !== undefined);
    const canImport = !file.busy && mappingUsable && rowsToImport > 0 && !analysisError;
    const headers = useMemo(
        () =>
            file.records.length === 0
                ? []
                : file.hasHeader ? file.records[0] : positionalHeaders(file.records),
        [file.records, file.hasHeader],
    );

    const detectAndApply = useCallback(
        (records: string[][], hasHeader: boolean, mapping: ColumnMapping) => {
            const detected = detectFormat(records, hasHeader, mapping, 500, preferredDateOrder());
            setFormat({
                decimal: detected.decimal.separator,
                decimalAmbiguous: detected.decimal.ambiguous,
                dateOrder: detected.date.order,
                dateAmbiguous: detected.date.ambiguous,
                sign: detected.sign,
            });
        },
        [],
    );

    const fail = useCallback((error: CsvImportError) => {
        setFile((prev) => ({ ...prev, busy: false, error, errorRows: 0 }));
    }, []);

    const pickFile = useCallback(async () => {
        if (file.busy || importing.current) {
            return;
        }
        let picked;
        try {
            [picked] = await pick({ type: types.allFiles });
        } catch (pickError) {
            if (!(isErrorWithCode(pickError) && pickError.code === errorCodes.OPERATION_CANCELED)) {
                fail('UNREADABLE');
            }
            return;
        }
        setFile((prev) => ({ ...prev, busy: true, error: null }));
        try {
            if (picked.size != null && picked.size > CSV_IMPORT_LIMITS.MAX_FILE_BYTES) {
                fail('TOO_LARGE');
                return;
            }
            const response = await fetch(picked.uri);
            const bytes = readBounded(new Uint8Array(await response.arrayBuffer()));
            if (!bytes) {
                fail('TOO_LARGE');
                return;
            }
            const decoded = decodeCsv(bytes);
            const delimiter = sniffDelimiter(decoded.text);
            const parsed = parseCsv(decoded.text, delimiter);
            if (parsed.rows.length === 0) {
                fail('EMPTY');
                return;
            }
            const headerRow = looksLikeHeader(parsed.rows[0]);
            const mapping = headerRow ? autoMapHeaders(parsed.rows[0]) : {};
            lookupKey.current = null;
            setLookup(INITIAL_LOOKUP);
            setSkipDuplicates(true);
            setJob(null);
            setReport(null);
            setAbort(null);
            setFile({
                stage: 'CONFIGURE',
                busy: false,
                error: null,
                errorRows: 0,
                fileName: picked.name,
                encoding: decoded.encoding,
                delimiter,
                unterminatedQuote: parsed.unterminatedQuote,
                records: parsed.rows,
                hasHeader: headerRow,
                mapping,
            });
            detectAndApply(parsed.rows, headerRow, mapping);
        } catch {
            fail('UNREADABLE');
        }
    }, [detectAndApply, fail, file.busy]);

    const setMapping = useCallback(
        (field: CsvField, column: number | null) => {
            const mapping = withMapping(file.mapping, field, column);
            setFile((prev) => ({ ...prev, mapping }));
            detectAndApply(file.records, file.hasHeader, mapping);
        },
        [detectAndApply, file.hasHeader, file.mapping, file.records],
    );

    const setHasHeader = useCallback(
        (value: boolean) => {
            if (file.records.length === 0) {
                return;
            }
            const mapping = value ? autoMapHeaders(file.records[0]) : file.mapping;
            setFile((prev) => ({ ...prev, hasHeader: value, mapping }));
            detectAndApply(file.records, value, mapping);
        },
        [detectAndApply, file.mapping, file.records],
    );

    const setDecimal = useCallback((decimal: DecimalSeparator) => {
        setFormat((prev) => ({ ...prev, decimal }));
    }, []);
    const setDateOrder = useCallback((dateOrder: DateOrder) => {
        setFormat((prev) => ({ ...prev, dateOrder }));
    }, []);
    const setSign = useCallback((sign: SignConvention) => {
        setFormat((prev) => ({ ...prev, sign }));
    }, []);

    const run = useCallback(
        async (next: ImportJob) => {
            if (importing.current) {
                return;
            }
            importing.current = true;
            const ownerOf = () => {
                const { isAuthenticated, user: current } = useAuthStore.getState();
                return isAuthenticated ? `account:${current?.id ?? ''}` : 'guest';
            };
            const startOwner = ownerOf();
            setFile((prev) => ({ ...prev, stage: 'IMPORTING' }));
            setProgress({ done: 0, total: next.rows.length, settling: false });
            setJob(next);
            setReport(null);
            setAbort(null);
            try {
                const sink = createExpenseSink({
                    create: (payload) => expensesApi.create(payload),
                    isSessionValid: () => ownerOf() === startOwner,
                });
                const result = await runImport(sink, next, {
                    onProgress: (snapshot, p) => {
                        if (!cancelled.current) {
                            setJob(snapshot);
                            setProgress(p);
                        }
                    },
                    isCancelled: () => cancelled.current,
                });
                if (!cancelled.current) {
                    setJob(result.job);
                    setReport(jobReport(result.job));
                    setAbort(result.abort);
                    setProgress(null);
                    setFile((prev) => ({ ...prev, stage: 'DONE' }));
                }
            } catch (runError) {
                if (!(runError instanceof ImportCancelled)) {
                    throw runError;
                }
            } finally {
                importing.current = false;
                ['expenses', 'categories', 'analytics', 'history', 'income-summary'].forEach((key) =>
                    queryClient.invalidateQueries({ queryKey: [key] }),
                );
            }
        },
        [queryClient],
    );

    const startImport = useCallback(() => {
        if (!analysis || !canImport || importing.current) {
            return;
        }
        const rows = selectForImport(analysis.rows, skipDuplicates);
        run(createJob(rows.map((row) => ({ line: row.line, draft: row.draft! }))));
    }, [analysis, canImport, run, skipDuplicates]);

    const resume = useCallback(() => {
        if (job) {
            run(job);
        }
    }, [job, run]);

    const retryFailed = useCallback(async () => {
        if (!job || importing.current) {
            return;
        }
        // Rows whose create got no response may already exist: look them up before re-sending anything.
        const range = ambiguousDateRange(job);
        let existing: ExistingExpense[] | undefined;
        if (range) {
            try {
                const response = await expensesApi.getAllPages({ from: range[0], to: range[1] });
                existing = response.expenses.map((e) => ({
                    date: e.date, cost: e.cost, title: e.title, currency: e.currency,
                }));
            } catch {
                existing = undefined; // lookup failed: ambiguous rows stay failed instead of risking a duplicate
            }
        }
        run(withFailedRetried(job, existing));
    }, [job, run]);

    const reset = useCallback(() => {
        if (importing.current) {
            return;
        }
        lookupKey.current = null;
        setFile(INITIAL_FILE);
        setFormat(INITIAL_FORMAT);
        setLookup(INITIAL_LOOKUP);
        setJob(null);
        setReport(null);
        setAbort(null);
        setProgress(null);
    }, []);

    const error = file.error ?? analysisError?.error ?? null;
    const errorRows = file.error ? file.errorRows : analysisError?.rows ?? 0;

    return {
        stage: file.stage,
        busy: file.busy,
        error,
        errorRows,
        fileName: file.fileName,
        encoding: file.encoding,
        delimiter: file.delimiter,
        unterminatedQuote: file.unterminatedQuote,
        headers,
        hasHeader: file.hasHeader,
        mapping: file.mapping,
        mappingUsable,
        hasAmountMapping,
        splitColumns,
        decimal: format.decimal,
        decimalAmbiguous: format.decimalAmbiguous,
        dateOrder: format.dateOrder,
        dateAmbiguous: format.dateAmbiguous,
        sign: format.sign,
        currencies,
        defaultCurrency,
        categories,
        defaultCategoryId,
        defaultPayment,
        analysis,
        duplicatesCheckFailed: lookup.failed,
        duplicatesCheckTruncated: lookup.truncated,
        skipDuplicates,
        isAccountMode,
        rowsToImport,
        canImport,
        progress,
        job,
        report,
        abort,
        pickFile,
        setMapping,
        setHasHeader,
        setDecimal,
        setDateOrder,
        setSign,
        setDefaultCurrency: setDefaultCurrencyState,
        setDefaultCategory: setDefaultCategoryId,
        setDefaultPayment,
        setSkipDuplicates,
        startImport,
        resume,
        retryFailed,
        reset,
    };
}

export type CsvImportController = ReturnType<typeof useCsvImport>;
