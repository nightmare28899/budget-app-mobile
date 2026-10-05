import type { StatementImportStatus } from '../../types/statementImports';

export type StatementTone = 'info' | 'warning' | 'success' | 'neutral' | 'danger';

const STATUS_TONE: Record<StatementImportStatus, StatementTone> = {
    UPLOADED: 'info',
    PARSED: 'info',
    NEEDS_REVIEW: 'warning',
    CONFIRMED: 'success',
    REVERTED: 'neutral',
    FAILED: 'danger',
};

export const STATEMENT_STATUSES = Object.keys(STATUS_TONE) as StatementImportStatus[];

export const STATEMENT_STATUS_FILTERS = [
    'ALL',
    'NEEDS_REVIEW',
    'CONFIRMED',
    'FAILED',
    'REVERTED',
    'UPLOADED',
    'PARSED',
] as const;

export type StatementStatusFilter = (typeof STATEMENT_STATUS_FILTERS)[number];

export function statementStatusTone(status: StatementImportStatus): StatementTone {
    return STATUS_TONE[status];
}

export function toStatementImportStatus(value: unknown): StatementImportStatus {
    return typeof value === 'string' && value in STATUS_TONE
        ? (value as StatementImportStatus)
        : 'UPLOADED';
}
