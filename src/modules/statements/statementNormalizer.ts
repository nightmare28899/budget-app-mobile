import type { StatementPaymentStatus } from '../../types/index';
import type {
    StatementCardSummary,
    StatementImportCreateResponse,
    StatementImportDetail,
    StatementImportListItem,
    StatementImportListResponse,
    StatementPaymentSummary,
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
        closingBalance: toNum(data.closingBalance),
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

export function normalizeStatementDetail(value: unknown): StatementImportDetail {
    const data = toApiRecord(value);
    const rows = toApiArray(data.rows);
    const warningCodes = new Set<string>();
    for (const row of rows) {
        for (const code of toApiArray(toApiRecord(row).warningCodes)) {
            if (typeof code === 'string' && code) {
                warningCodes.add(code);
            }
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
    };
}
