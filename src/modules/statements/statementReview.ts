import type {
    StatementRow,
    StatementRowDecision,
    StatementRowKind,
    StatementRowPatch,
} from '../../types/statementImports';
import { parseDateOnly } from '../creditCards/cardPaymentSchedule';

/** The API rejects more than 200 rows per PATCH. */
export const MAX_STATEMENT_ROWS_PER_SAVE = 200;

/** Draft edits for a row: the patch without its id. */
export type StatementRowDraft = Omit<StatementRowPatch, 'id'>;
export type StatementRowDrafts = Record<string, StatementRowDraft>;

export const STATEMENT_ROW_DECISIONS: StatementRowDecision[] = [
    'INCLUDE_EXPENSE',
    'EXCLUDE',
    'INFO_ONLY',
];

export const STATEMENT_ROW_FILTERS = [
    'ALL',
    'PENDING',
    'MISSING_CATEGORY',
    'READY',
    'ADJUSTED',
    'MATCHED',
] as const;
export type StatementRowFilter = (typeof STATEMENT_ROW_FILTERS)[number];

const EXPENSE_KINDS: ReadonlySet<StatementRowKind> = new Set(['CHARGE', 'INTEREST', 'TAX']);

/** Mirrors the backend: CFDI section rows and non-charge kinds can never become expenses. */
export function canIncludeAsExpense(row: Pick<StatementRow, 'section' | 'kind'>): boolean {
    return row.section !== 'CFDI' && EXPENSE_KINDS.has(row.kind);
}

const toCents = (value: number) => Math.round(value * 100);

function sameInstant(left: string | null, right: string | null): boolean {
    if (!left && !right) {
        return true;
    }
    if (!left || !right) {
        return false;
    }
    return new Date(left).getTime() === new Date(right).getTime();
}

/** Same rule as the backend's hasAccountingAdjustment: date, amount, currency or kind changed. */
export function hasAccountingAdjustment(row: StatementRow): boolean {
    return (
        !sameInstant(row.transactionDate, row.parsedTransactionDate)
        || toCents(row.amount) !== toCents(row.parsedAmount)
        || row.currency !== row.parsedCurrency
        || row.kind !== row.parsedKind
    );
}

/** Row as it would look once the draft is saved. */
export function applyRowDraft(row: StatementRow, draft: StatementRowDraft | undefined): StatementRow {
    if (!draft) {
        return row;
    }
    const merged: StatementRow = { ...row };
    if (draft.decision !== undefined) merged.decision = draft.decision;
    if (draft.transactionDate !== undefined) merged.transactionDate = draft.transactionDate;
    if (draft.description !== undefined) merged.description = draft.description;
    if (draft.merchantName !== undefined) merged.merchantName = draft.merchantName;
    if (draft.amount !== undefined) merged.amount = draft.amount;
    if (draft.categoryId !== undefined) {
        merged.categoryId = draft.categoryId;
        if (draft.categoryId !== row.categoryId) merged.category = null;
    }
    if (draft.linkedCreditCardId !== undefined) {
        merged.linkedCreditCardId = draft.linkedCreditCardId;
        if (draft.linkedCreditCardId !== row.linkedCreditCardId) merged.linkedCreditCard = null;
    }
    if (draft.decisionNote !== undefined) merged.decisionNote = draft.decisionNote;
    // The server drops a stale match once the user overrides INFO_ONLY.
    if (draft.decision !== undefined && draft.decision !== 'INFO_ONLY' && merged.matchedExpenseId) {
        merged.matchedExpenseId = null;
        merged.matchedExpense = null;
    }
    merged.isAdjusted = hasAccountingAdjustment(merged);
    return merged;
}

function isSameAsRow(row: StatementRow, key: keyof StatementRowDraft, value: unknown): boolean {
    switch (key) {
        case 'amount':
            return typeof value === 'number' && toCents(value) === toCents(row.amount);
        case 'transactionDate':
            return typeof value === 'string' && sameInstant(value, row.transactionDate);
        case 'decisionNote':
            return (value || null) === (row.decisionNote || null);
        case 'merchantName':
            return (value ?? null) === (row.merchantName ?? null);
        default:
            return (row as unknown as Record<string, unknown>)[key] === value;
    }
}

/** Merge an edit into the drafts, dropping fields equal to the stored row so no-ops don't save. */
export function mergeRowDraft(
    drafts: StatementRowDrafts,
    row: StatementRow,
    patch: StatementRowDraft,
): StatementRowDrafts {
    const next: StatementRowDraft = { ...drafts[row.id], ...patch };
    const cleaned: Record<string, unknown> = {};
    (Object.keys(next) as Array<keyof StatementRowDraft>).forEach(key => {
        if (!isSameAsRow(row, key, next[key])) {
            cleaned[key] = next[key];
        }
    });
    const rest = { ...drafts };
    delete rest[row.id];
    return Object.keys(cleaned).length > 0
        ? { ...rest, [row.id]: cleaned as StatementRowDraft }
        : rest;
}

/** Builds the PATCH rows array; the version travels separately. Only whitelisted fields. */
export function buildRowPatches(drafts: StatementRowDrafts): StatementRowPatch[] {
    return Object.entries(drafts)
        .filter(([, draft]) => Object.keys(draft).length > 0)
        .map(([id, draft]) => {
            const patch: StatementRowPatch = { id };
            if (draft.decision !== undefined) patch.decision = draft.decision;
            if (draft.transactionDate !== undefined) patch.transactionDate = draft.transactionDate;
            if (draft.description !== undefined) patch.description = draft.description.trim();
            if (draft.merchantName !== undefined) patch.merchantName = draft.merchantName?.trim() ?? null;
            if (draft.amount !== undefined) patch.amount = Math.round(draft.amount * 100) / 100;
            if (draft.categoryId !== undefined) patch.categoryId = draft.categoryId;
            if (draft.linkedCreditCardId !== undefined) patch.linkedCreditCardId = draft.linkedCreditCardId;
            if (draft.decisionNote !== undefined) patch.decisionNote = draft.decisionNote?.trim() || null;
            return patch;
        });
}

/** Value to send for a calendar day: noon UTC so every timezone reads the same day. */
export function toRowDateIso(localDate: Date): string {
    const month = String(localDate.getMonth() + 1).padStart(2, '0');
    const day = String(localDate.getDate()).padStart(2, '0');
    return `${localDate.getFullYear()}-${month}-${day}T12:00:00.000Z`;
}

/** Local calendar day of a stored row date (first 10 chars, never via UTC conversion). */
export function rowDateToLocal(value: string | null): Date | null {
    return value ? parseDateOnly(value) : null;
}

export function isIncludedRowValid(row: StatementRow, hasDefaultCard: boolean): boolean {
    return (
        canIncludeAsExpense(row)
        && Boolean(row.transactionDate)
        && Boolean(row.categoryId)
        && (Boolean(row.linkedCreditCardId) || hasDefaultCard)
        && Number.isFinite(row.amount)
        && row.amount > 0
        && /^[A-Z]{3}$/.test(row.currency)
    );
}

export function isRegisteredMatch(row: StatementRow): boolean {
    return Boolean(row.matchedExpenseId) && row.decision === 'INFO_ONLY';
}

export function filterStatementRows(rows: StatementRow[], filter: StatementRowFilter): StatementRow[] {
    switch (filter) {
        case 'PENDING':
            return rows.filter(row => row.decision === 'PENDING');
        case 'MISSING_CATEGORY':
            return rows.filter(
                row =>
                    canIncludeAsExpense(row)
                    && !row.categoryId
                    && (row.decision === 'PENDING' || row.decision === 'INCLUDE_EXPENSE'),
            );
        case 'READY':
            return rows.filter(row => row.decision === 'INCLUDE_EXPENSE');
        case 'ADJUSTED':
            return rows.filter(row => row.isAdjusted);
        case 'MATCHED':
            return rows.filter(row => Boolean(row.matchedExpenseId));
        default:
            return rows;
    }
}

export type StatementConfirmBlocker =
    | { code: 'reconciliation' }
    | { code: 'pending'; count: number }
    | { code: 'noExpenses' }
    | { code: 'invalidRows'; count: number }
    | { code: 'missingNotes'; count: number }
    | { code: 'unsaved'; count: number };

export type ReviewBlockerInput = {
    rows: StatementRow[];
    reconciliationPassed: boolean;
    hasDefaultCard: boolean;
    unsavedCount: number;
};

/** Everything the backend's confirm would reject, computed up front from the draft-applied rows. */
export function computeConfirmBlockers(input: ReviewBlockerInput): StatementConfirmBlocker[] {
    const { rows } = input;
    const pending = rows.filter(row => row.decision === 'PENDING').length;
    const included = rows.filter(row => row.decision === 'INCLUDE_EXPENSE');
    const invalid = included.filter(row => !isIncludedRowValid(row, input.hasDefaultCard)).length;
    const missingNotes = rows.filter(row => row.isAdjusted && !row.decisionNote?.trim()).length;
    const matched = rows.filter(isRegisteredMatch).length;

    const blockers: StatementConfirmBlocker[] = [];
    if (!input.reconciliationPassed) blockers.push({ code: 'reconciliation' });
    if (pending > 0) blockers.push({ code: 'pending', count: pending });
    if (included.length === 0 && matched === 0) blockers.push({ code: 'noExpenses' });
    if (invalid > 0) blockers.push({ code: 'invalidRows', count: invalid });
    if (missingNotes > 0) blockers.push({ code: 'missingNotes', count: missingNotes });
    if (input.unsavedCount > 0) blockers.push({ code: 'unsaved', count: input.unsavedCount });
    return blockers;
}

/** Parses user-typed money ("1,234.5", "1.234,50") to a positive 2-decimal number, else null. */
export function parseMoneyInput(text: string): number | null {
    let normalized = text.trim().replace(/\s/g, '');
    if (!normalized) {
        return null;
    }
    const lastComma = normalized.lastIndexOf(',');
    const lastDot = normalized.lastIndexOf('.');
    if (lastComma > lastDot) {
        normalized = normalized.replace(/\./g, '').replace(',', '.');
    } else {
        normalized = normalized.replace(/,/g, '');
    }
    if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
        return null;
    }
    const value = Number(normalized);
    return value >= 0.01 ? value : null;
}
