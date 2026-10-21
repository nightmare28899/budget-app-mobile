export interface BackupCategory {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  budgetAmount: number | null;
}
export interface BackupCreditCard {
  id: string;
  name: string;
  bank: string;
  brand: string;
  last4: string;
  color: string | null;
  creditLimit: number | null;
  closingDay: number | null;
  paymentDueDay: number | null;
  currency: string | null;
  isActive: boolean;
  createdAtMillis: number;
  updatedAtMillis: number;
}
export interface BackupSubscription {
  id: string;
  name: string;
  cost: number;
  currency: string;
  billingCycle: string;
  nextPaymentEpochDay: number;
  anchorEpochDay: number;
  reminderDays: number;
  isActive: boolean;
  paymentMethod: string | null;
  categoryId: string | null;
  hexColor: string | null;
  logoUrl: string | null;
  createdAtMillis: number;
  updatedAtMillis: number;
  creditCardId: string | null;
}
export interface BackupExpense {
  id: string;
  title: string;
  cost: number;
  currency: string;
  dateMillis: number;
  merchantName: string | null;
  locationLabel: string | null;
  note: string | null;
  paymentMethod: string | null;
  creditCardId: string | null;
  categoryId: string | null;
  isInstallment: boolean;
  installmentGroupId: string | null;
  installmentCount: number | null;
  installmentIndex: number | null;
  installmentTotalAmount: number | null;
  createdAtMillis: number;
  updatedAtMillis: number;
  subscriptionId: string | null;
}
export interface BackupIncome {
  id: string;
  title: string;
  amount: number;
  currency: string;
  dateMillis: number;
  note: string | null;
  createdAtMillis: number;
  updatedAtMillis: number;
}
export interface BackupSavingsGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  targetEpochDay: number | null;
  icon: string | null;
  color: string | null;
  createdAtMillis: number;
  updatedAtMillis: number;
}
export interface BackupSavingsTransaction {
  id: string;
  goalId: string;
  amount: number;
  type: string;
  createdAtMillis: number;
}
export interface BackupSettings {
  themeMode: string | null;
  language: string | null;
  currency: string | null;
  budgetAmount: number | null;
  budgetPeriod: string | null;
  budgetPeriodStart: string | null;
  budgetPeriodEnd: string | null;
  guestName: string | null;
  dynamicColor: boolean | null;
  reminderLeadDays: number | null;
}
export const defaults = {
  BackupCategory: {
    id: '',
    name: '',
    icon: null,
    color: null,
    budgetAmount: null,
  },
  BackupCreditCard: {
    id: '',
    name: '',
    bank: '',
    brand: '',
    last4: '',
    color: null,
    creditLimit: null,
    closingDay: null,
    paymentDueDay: null,
    currency: null,
    isActive: true,
    createdAtMillis: 0,
    updatedAtMillis: 0,
  },
  BackupSubscription: {
    id: '',
    name: '',
    cost: 0.0,
    currency: '',
    billingCycle: '',
    nextPaymentEpochDay: 0,
    anchorEpochDay: 0,
    reminderDays: 0,
    isActive: true,
    paymentMethod: null,
    categoryId: null,
    hexColor: null,
    logoUrl: null,
    createdAtMillis: 0,
    updatedAtMillis: 0,
    creditCardId: null,
  },
  BackupExpense: {
    id: '',
    title: '',
    cost: 0.0,
    currency: '',
    dateMillis: 0,
    merchantName: null,
    locationLabel: null,
    note: null,
    paymentMethod: null,
    creditCardId: null,
    categoryId: null,
    isInstallment: false,
    installmentGroupId: null,
    installmentCount: null,
    installmentIndex: null,
    installmentTotalAmount: null,
    createdAtMillis: 0,
    updatedAtMillis: 0,
    subscriptionId: null,
  },
  BackupIncome: {
    id: '',
    title: '',
    amount: 0.0,
    currency: '',
    dateMillis: 0,
    note: null,
    createdAtMillis: 0,
    updatedAtMillis: 0,
  },
  BackupSavingsGoal: {
    id: '',
    title: '',
    targetAmount: 0.0,
    currentAmount: 0.0,
    targetEpochDay: null,
    icon: null,
    color: null,
    createdAtMillis: 0,
    updatedAtMillis: 0,
  },
  BackupSavingsTransaction: {
    id: '',
    goalId: '',
    amount: 0.0,
    type: '',
    createdAtMillis: 0,
  },
  BackupSettings: {
    themeMode: null,
    language: null,
    currency: null,
    budgetAmount: null,
    budgetPeriod: null,
    budgetPeriodStart: null,
    budgetPeriodEnd: null,
    guestName: null,
    dynamicColor: null,
    reminderLeadDays: null,
  },
};
export const doubleFields = new Set([
  'budgetAmount',
  'creditLimit',
  'cost',
  'installmentTotalAmount',
  'amount',
  'targetAmount',
  'currentAmount',
]);
export const entities = [
  'categories',
  'creditCards',
  'subscriptions',
  'expenses',
  'incomes',
  'savingsGoals',
  'savingsTransactions',
] as const;
export type BackupEntity = (typeof entities)[number];
export interface BackupPayload {
  categories: BackupCategory[];
  creditCards: BackupCreditCard[];
  subscriptions: BackupSubscription[];
  expenses: BackupExpense[];
  incomes: BackupIncome[];
  savingsGoals: BackupSavingsGoal[];
  savingsTransactions: BackupSavingsTransaction[];
  settings: BackupSettings | null;
}
export type BackupError = {
  kind: string;
  entity?: BackupEntity;
  id?: string;
  reason?: string;
  maxBytes?: number;
  max?: number;
  found?: number;
  supported?: number;
};
export interface BackupFile {
  schemaVersion: number;
  appVersion: string;
  createdAtMillis: number;
  payload: BackupPayload;
}
export interface BackupLimits {
  maxFileBytes: number;
  maxRows: number;
}
export const DEFAULT_LIMITS: BackupLimits = {
  maxFileBytes: 26214400,
  maxRows: 200000,
};
export const BACKUP_FORMAT = 'budgetapp-backup';
export const BACKUP_SCHEMA_VERSION = 1;
export const emptyPayload = (): BackupPayload => ({
  categories: [],
  creditCards: [],
  subscriptions: [],
  expenses: [],
  incomes: [],
  savingsGoals: [],
  savingsTransactions: [],
  settings: null,
});
