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

export type StatementRowDecision = 'PENDING' | 'INCLUDE_EXPENSE' | 'EXCLUDE' | 'INFO_ONLY';

export type StatementRowKind =
  | 'CHARGE'
  | 'PAYMENT'
  | 'CREDIT'
  | 'INTEREST'
  | 'TAX'
  | 'REFINANCED_PRINCIPAL'
  | 'CFDI'
  | 'UNKNOWN';

export type StatementRowSection =
  | 'RECONCILIATION'
  | 'PAYMENT_TARGET'
  | 'CURRENT_CHARGES'
  | 'FINANCING_PLAN'
  | 'CFDI'
  | 'OTHER';

export type StatementPaymentSource = 'MANUAL' | 'LEGACY_BACKFILL' | 'CORRECTION';

export interface StatementPaymentSummary {
  currency: string | null;
  closingBalance: number | null;
  paidTotal: number;
  paymentStatus: StatementPaymentStatus;
  isPaid: boolean;
  remainingStatement: number | null;
  noInterestTarget: number | null;
  remainingNoInterest: number | null;
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
  openingBalance: number;
  chargesTotal: number;
  paymentsTotal: number;
  creditsTotal: number;
  closingBalance: number;
  difference: number;
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

export interface StatementRowCategory {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
}

export interface StatementRowLinkedCard {
  id: string;
  name: string;
  bank: string;
  last4: string;
}

export interface StatementMatchedExpense {
  id: string;
  title: string;
  cost: number;
  date: string | null;
}

export interface StatementRow {
  id: string;
  section: StatementRowSection;
  position: number;
  /** ISO instant as sent by the API; read the calendar day with parseDateOnly. */
  transactionDate: string | null;
  parsedTransactionDate: string | null;
  description: string;
  merchantName: string | null;
  amount: number;
  parsedAmount: number;
  currency: string;
  parsedCurrency: string;
  kind: StatementRowKind;
  parsedKind: StatementRowKind;
  decision: StatementRowDecision;
  categoryId: string | null;
  category: StatementRowCategory | null;
  linkedCreditCardId: string | null;
  linkedCreditCard: StatementRowLinkedCard | null;
  warningCodes: string[];
  decisionNote: string | null;
  isAdjusted: boolean;
  matchedExpenseId: string | null;
  matchedExpense: StatementMatchedExpense | null;
}

export interface StatementPayment {
  id: string;
  amount: number;
  currency: string;
  paidAt: string;
  note: string | null;
  source: StatementPaymentSource;
  supersedesId: string | null;
  voidedAt: string | null;
  voidReason: string | null;
  createdAt: string | null;
}

export interface StatementPaymentMutationResult {
  paymentVersion: number;
  summary: StatementPaymentSummary;
  history: StatementPayment[];
}

export interface StatementConfirmResult {
  statement: StatementImportDetail;
  createdExpenseCount: number;
  alreadyConfirmed: boolean;
  sourceDeletionPending: boolean;
}

export interface StatementRevertResult {
  statement: StatementImportDetail;
  deletedExpenseCount: number;
  alreadyReverted: boolean;
}

/** Fields accepted by PATCH /statement-imports/:id/rows (whitelisted, never add others). */
export interface StatementRowPatch {
  id: string;
  decision?: StatementRowDecision;
  transactionDate?: string;
  description?: string;
  merchantName?: string | null;
  amount?: number;
  categoryId?: string | null;
  linkedCreditCardId?: string | null;
  decisionNote?: string | null;
}

export interface StatementPaymentWritePayload {
  amount: number;
  currency: string;
  paidAt: string;
  note?: string;
  expectedVersion: number;
  idempotencyKey: string;
}

export type StatementCorrectPaymentPayload = StatementPaymentWritePayload & { reason: string };

export interface StatementVoidPaymentPayload {
  expectedVersion: number;
  reason: string;
}

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
  paymentVersion: number;
  rows: StatementRow[];
  paymentHistory: StatementPayment[];
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
