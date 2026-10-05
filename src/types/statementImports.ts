import type { StatementPaymentStatus } from './index';

export type StatementImportStatus =
  | 'UPLOADED'
  | 'PARSED'
  | 'NEEDS_REVIEW'
  | 'CONFIRMED'
  | 'REVERTED'
  | 'FAILED';

export type StatementReconciliationStatus = 'PENDING' | 'PASSED' | 'FAILED';

export type StatementPaymentTargetKind =
  | 'MINIMUM'
  | 'MINIMUM_PLUS_INSTALLMENTS'
  | 'NO_INTEREST'
  | 'OTHER';

export interface StatementPaymentSummary {
  currency: string | null;
  closingBalance: number | null;
  paidTotal: number;
  paymentStatus: StatementPaymentStatus;
  isPaid: boolean;
  remainingStatement: number | null;
  noInterestTarget: number | null;
  currentPaymentDue: number | null;
  dueDate: string | null;
  overpaid: number;
}

export interface StatementImportListItem {
  id: string;
  creditCardId: string | null;
  sourceFileName: string | null;
  status: StatementImportStatus;
  periodStart: string | null;
  periodEnd: string | null;
  version: number;
  warningCount: number;
  isPaid: boolean;
  paymentStatus: StatementPaymentStatus;
  paymentSummary: StatementPaymentSummary;
  closingBalance: number | null;
  currency: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface StatementImportListResponse {
  items: StatementImportListItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface StatementImportCreateResponse {
  id: string;
  status: StatementImportStatus;
  version: number;
  warningCount: number;
  failureCode: string | null;
  failureMessage: string | null;
  duplicate: boolean;
}

export interface StatementReconciliationSummary {
  currency: string;
  closingBalance: number;
  status: StatementReconciliationStatus;
  message: string | null;
}

export interface StatementPaymentTargetSummary {
  id: string;
  kind: StatementPaymentTargetKind;
  label: string;
  amount: number;
  currency: string;
  dueDate: string | null;
}

export interface StatementCardSummary {
  id: string;
  name: string;
  bank: string;
  brand: string;
  last4: string;
  currency: string;
}

/** Read-only detail used by the Phase B summary screen (rows are only counted). */
export interface StatementImportDetail extends StatementImportListItem {
  sourceMimeType: string | null;
  sourceSizeBytes: number | null;
  failureCode: string | null;
  failureMessage: string | null;
  creditCard: StatementCardSummary | null;
  reconciliation: StatementReconciliationSummary | null;
  paymentTargets: StatementPaymentTargetSummary[];
  rowCount: number;
  adjustmentCount: number;
  warningCodes: string[];
}

export interface StatementImportsQuery {
  status?: StatementImportStatus;
  creditCardId?: string;
  page?: number;
  limit?: number;
}

export interface StatementUploadFile {
  uri: string;
  name: string;
  type: string;
}
