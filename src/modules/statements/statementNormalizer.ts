import type { StatementPaymentStatus } from '../../types/index';
import type {
    StatementCardSummary,
    StatementImportCreateResponse,
    StatementImportDetail,
    StatementImportListItem,
    StatementImportListResponse,
    StatementConfirmResult,
    StatementMatchedExpense,
    StatementPayment,
    StatementPaymentMutationResult,
    StatementPaymentSource,
    StatementPaymentSummary,
    StatementRevertResult,
    StatementRow,
    StatementRowDecision,
    StatementRowKind,
    StatementRowSection,
    StatementPaymentTargetKind,
    StatementPaymentTargetSummary,
    StatementReconciliationStatus,
    StatementReconciliationSummary,
} from '../../types/statementImports';
import { toNum } from '../../utils/core/number';
import { toApiArray, toApiRecord } from '../../utils/platform/api';
import { toStatementImportStatus } from './statementStatus';

function toNullableNumber(value: unknown): number | null {
    return value == null || value === '' ? null : toNum(value);
}

function toNullableString(value: unknown): string | null {
    return typeof value === 'string' && value ? value : null;
}

function toPaymentStatus(value: unknown): StatementPaymentStatus {
    return value === 'PAID' || value === 'PARTIAL' ? value : 'UNPAID';
}

function toPositiveInt(value: unknown, fallback: number): number {
    const parsed = Math.trunc(toNum(value));
    return parsed >= 1 ? parsed : fallback;
}

function normalizePaymentSummary(value: unknown): StatementPaymentSummary {
    const summary = toApiRecord(value);
    return {
        currency: toNullableString(summary.currency),
        closingBalance: toNullableNumber(summary.closingBalance),
        paidTotal: toNum(summary.paidTotal),
        paymentStatus: toPaymentStatus(summary.paymentStatus),
        isPaid: summary.isPaid === true,
        remainingStatement: toNullableNumber(summary.remainingStatement),
        noInterestTarget: toNullableNumber(summary.noInterestTarget),
        remainingNoInterest: toNullableNumber(summary.remainingNoInterest),
        currentPaymentDue: toNullableNumber(summary.currentPaymentDue),
        dueDate: toNullableString(summary.dueDate),
        overpaid: toNum(summary.overpaid),
    };
}

export function normalizeStatementListItem(value: unknown): StatementImportListItem {
    const item = toApiRecord(value);
    const reconciliation = toApiRecord(item.reconciliation);
    const paymentSummary = normalizePaymentSummary(item.paymentSummary);

    return {
        id: String(item.id ?? ''),
        creditCardId: toNullableString(item.creditCardId),
        sourceFileName: toNullableString(item.sourceFileName),
        status: toStatementImportStatus(item.status),
        periodStart: toNullableString(item.periodStart),
        periodEnd: toNullableString(item.periodEnd),
        version: toNum(item.version),
        warningCount: toNum(item.warningCount),
        isPaid: item.isPaid === true,
        paymentStatus: toPaymentStatus(item.paymentStatus ?? paymentSummary.paymentStatus),
        paymentSummary,
        closingBalance:
            toNullableNumber(reconciliation.closingBalance) ?? paymentSummary.closingBalance,
        currency: toNullableString(reconciliation.currency) ?? paymentSummary.currency,
        createdAt: toNullableString(item.createdAt),
        updatedAt: toNullableString(item.updatedAt),
    };
}

export function normalizeStatementListResponse(value: unknown): StatementImportListResponse {
    const data = toApiRecord(value);
    const items = toApiArray(data.items).map(normalizeStatementListItem);
    return {
        items,
        page: toPositiveInt(data.page, 1),
        limit: toPositiveInt(data.limit, items.length || 20),
        total: toNum(data.total),
        totalPages: toPositiveInt(data.totalPages, 1),
    };
}

export function normalizeStatementCreateResponse(value: unknown): StatementImportCreateResponse {
    const data = toApiRecord(value);
    return {
        id: String(data.id ?? ''),
        status: toStatementImportStatus(data.status),
        version: toNum(data.version),
        warningCount: toNum(data.warningCount),
        failureCode: toNullableString(data.failureCode),
        failureMessage: toNullableString(data.failureMessage),
        duplicate: data.duplicate === true,
    };
}

function toReconciliationStatus(value: unknown): StatementReconciliationStatus {
    return value === 'PASSED' || value === 'FAILED' ? value : 'PENDING';
}

function normalizeReconciliation(value: unknown): StatementReconciliationSummary | null {
    if (value == null || typeof value !== 'object') {
        return null;
    }
    const data = toApiRecord(value);
    return {
        currency: String(data.currency ?? ''),
        openingBalance: toNum(data.openingBalance),
        chargesTotal: toNum(data.chargesTotal),
        paymentsTotal: toNum(data.paymentsTotal),
        creditsTotal: toNum(data.creditsTotal),
        closingBalance: toNum(data.closingBalance),
        difference: toNum(data.difference),
        status: toReconciliationStatus(data.status),
        message: toNullableString(data.message),
    };
}

function toTargetKind(value: unknown): StatementPaymentTargetKind {
    return value === 'MINIMUM'
        || value === 'MINIMUM_PLUS_INSTALLMENTS'
        || value === 'NO_INTEREST'
        ? value
        : 'OTHER';
}

function normalizeTarget(value: unknown): StatementPaymentTargetSummary {
    const data = toApiRecord(value);
    return {
        id: String(data.id ?? ''),
        kind: toTargetKind(data.kind),
        label: String(data.label ?? ''),
        amount: toNum(data.amount),
        currency: String(data.currency ?? ''),
        dueDate: toNullableString(data.dueDate),
    };
}

function normalizeCard(value: unknown): StatementCardSummary | null {
    if (value == null || typeof value !== 'object') {
        return null;
    }
    const data = toApiRecord(value);
    return {
        id: String(data.id ?? ''),
        name: String(data.name ?? ''),
        bank: String(data.bank ?? ''),
        brand: String(data.brand ?? ''),
        last4: String(data.last4 ?? ''),
        currency: String(data.currency ?? ''),
    };
}

const ROW_DECISIONS: readonly StatementRowDecision[] = [
    'PENDING',
    'INCLUDE_EXPENSE',
    'EXCLUDE',
    'INFO_ONLY',
];
const ROW_KINDS: readonly StatementRowKind[] = [
    'CHARGE',
    'PAYMENT',
    'CREDIT',
    'INTEREST',
    'TAX',
    'REFINANCED_PRINCIPAL',
    'CFDI',
    'UNKNOWN',
];
const ROW_SECTIONS: readonly StatementRowSection[] = [
    'RECONCILIATION',
    'PAYMENT_TARGET',
    'CURRENT_CHARGES',
    'FINANCING_PLAN',
    'CFDI',
    'OTHER',
];

function pickEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
    return typeof value === 'string' && (allowed as readonly string[]).includes(value)
        ? (value as T)
        : fallback;
}

function normalizeMatchedExpense(value: unknown): StatementMatchedExpense | null {
    if (value == null || typeof value !== 'object') {
        return null;
    }
    const data = toApiRecord(value);
    return {
        id: String(data.id ?? ''),
        title: String(data.title ?? ''),
        cost: toNum(data.cost),
        date: toNullableString(data.date),
    };
}

export function normalizeStatementRow(value: unknown): StatementRow {
    const row = toApiRecord(value);
    const category = row.category && typeof row.category === 'object' ? toApiRecord(row.category) : null;
    const card =
        row.linkedCreditCard && typeof row.linkedCreditCard === 'object'
            ? toApiRecord(row.linkedCreditCard)
            : null;
    const kind = pickEnum(row.kind, ROW_KINDS, 'UNKNOWN');
    const currency = typeof row.currency === 'string' && row.currency ? row.currency : 'MXN';

    return {
        id: String(row.id ?? ''),
        section: pickEnum(row.section, ROW_SECTIONS, 'OTHER'),
        position: toNum(row.position),
        transactionDate: toNullableString(row.transactionDate),
        parsedTransactionDate: toNullableString(row.parsedTransactionDate),
        description: String(row.description ?? ''),
        merchantName: toNullableString(row.merchantName),
        amount: toNum(row.amount),
        parsedAmount: row.parsedAmount == null ? toNum(row.amount) : toNum(row.parsedAmount),
        currency,
        parsedCurrency: toNullableString(row.parsedCurrency) ?? currency,
        kind,
        parsedKind: pickEnum(row.parsedKind, ROW_KINDS, kind),
        decision: pickEnum(row.decision, ROW_DECISIONS, 'PENDING'),
        categoryId: toNullableString(row.categoryId),
        category: category
            ? {
                id: String(category.id ?? ''),
                name: String(category.name ?? ''),
                icon: toNullableString(category.icon),
                color: toNullableString(category.color),
            }
            : null,
        linkedCreditCardId: toNullableString(row.linkedCreditCardId),
        linkedCreditCard: card
            ? {
                id: String(card.id ?? ''),
                name: String(card.name ?? ''),
                bank: String(card.bank ?? ''),
                last4: String(card.last4 ?? ''),
            }
            : null,
        warningCodes: toApiArray(row.warningCodes).filter(
            (code): code is string => typeof code === 'string' && code.length > 0,
        ),
        decisionNote: toNullableString(row.decisionNote),
        isAdjusted: row.isAdjusted === true,
        matchedExpenseId: toNullableString(row.matchedExpenseId),
        matchedExpense: normalizeMatchedExpense(row.matchedExpense),
    };
}

export function normalizeStatementPayment(value: unknown): StatementPayment {
    const data = toApiRecord(value);
    return {
        id: String(data.id ?? ''),
        amount: toNum(data.amount),
        currency: String(data.currency ?? ''),
        paidAt: String(data.paidAt ?? ''),
        note: toNullableString(data.note),
        source: pickEnum<StatementPaymentSource>(
            data.source,
            ['MANUAL', 'LEGACY_BACKFILL', 'CORRECTION'],
            'MANUAL',
        ),
        supersedesId: toNullableString(data.supersedesId),
        voidedAt: toNullableString(data.voidedAt),
        voidReason: toNullableString(data.voidReason),
        createdAt: toNullableString(data.createdAt),
    };
}

export function normalizeStatementPaymentMutation(value: unknown): StatementPaymentMutationResult {
    const data = toApiRecord(value);
    return {
        paymentVersion: toNum(data.paymentVersion),
        summary: normalizePaymentSummary(data.summary),
        history: toApiArray(data.history).map(normalizeStatementPayment),
    };
}

export function normalizeStatementConfirm(value: unknown): StatementConfirmResult {
    const data = toApiRecord(value);
    return {
        statement: normalizeStatementDetail(data.import),
        createdExpenseCount: toNum(data.createdExpenseCount),
        alreadyConfirmed: data.alreadyConfirmed === true,
        sourceDeletionPending: data.sourceDeletionPending === true,
    };
}

export function normalizeStatementRevert(value: unknown): StatementRevertResult {
    const data = toApiRecord(value);
    return {
        statement: normalizeStatementDetail(data.import),
        deletedExpenseCount: toNum(data.deletedExpenseCount),
        alreadyReverted: data.alreadyReverted === true,
    };
}

export function normalizeStatementDetail(value: unknown): StatementImportDetail {
    const data = toApiRecord(value);
    const rows = toApiArray(data.rows).map(normalizeStatementRow);
    const warningCodes = new Set<string>();
    for (const row of rows) {
        for (const code of row.warningCodes) {
            warningCodes.add(code);
        }
    }

    const base = normalizeStatementListItem(value);
    const reconciliation = normalizeReconciliation(data.reconciliation);

    return {
        ...base,
        closingBalance: reconciliation?.closingBalance ?? base.closingBalance,
        currency: reconciliation?.currency || base.currency,
        sourceMimeType: toNullableString(data.sourceMimeType),
        sourceSizeBytes: toNullableNumber(data.sourceSizeBytes),
        failureCode: toNullableString(data.failureCode),
        failureMessage: toNullableString(data.failureMessage),
        creditCard: normalizeCard(data.creditCard),
        reconciliation,
        paymentTargets: toApiArray(data.paymentTargets).map(normalizeTarget),
        rowCount: rows.length,
        adjustmentCount: toNum(data.adjustmentCount),
        warningCodes: Array.from(warningCodes),
        paymentVersion: toNum(data.paymentVersion),
        rows,
        paymentHistory: toApiArray(data.paymentHistory).map(normalizeStatementPayment),
    };
}
