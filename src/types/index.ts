export interface User {
  id: string;
  email: string;
  name: string;
  role?: string;
  isPremium?: boolean | null;
  avatarUrl?: string | null;
  dailyBudget?: number;
  budgetAmount?: number;
  budgetPeriod?: BudgetPeriod;
  budgetPeriodStart?: string | null;
  budgetPeriodEnd?: string | null;
  currency?: string;
  weeklyReportEnabled?: boolean;
  monthlyReportEnabled?: boolean;
  avatarUri?: string | null;
  isActive?: boolean;
  deletedAt?: string | null;
  createdAt?: string;
}

export type PaymentMethodValue =
  | 'CASH'
  | 'CREDIT_CARD'
  | 'DEBIT_CARD'
  | 'TRANSFER';

export type InstallmentFrequency = 'MONTHLY';

export interface CreditCard {
  id: string;
  name: string;
  bank: string;
  brand: string;
  last4: string;
  color?: string | null;
  creditLimit?: number | null;
  closingDay?: number | null;
  paymentDueDay?: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type BudgetPeriod = 'daily' | 'weekly' | 'monthly' | 'annual' | 'period';

export interface Category {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  budgetAmount?: number | null;
  userId: string;
}

export type CategoryBudgetStatusTone =
  | 'no_budget'
  | 'on_track'
  | 'watch'
  | 'off_track';

export interface CategoryBudgetStatus {
  categoryId: string;
  name: string;
  icon: string;
  color: string;
  budgetAmount: number;
  spent: number;
  remaining: number;
  percentage: number;
  expenseCount: number;
  status: CategoryBudgetStatusTone;
}

export interface CategoryBudgetOverview {
  period: { type: BudgetPeriod; start: string | null; end: string | null };
  totalBudgeted: number;
  totalSpentBudgeted: number;
  totalRemaining: number;
  categoriesWithBudget: number;
  overBudgetCount: number;
  watchCount: number;
  items: CategoryBudgetStatus[];
}

export interface Expense {
  id: string;
  title: string;
  cost: number;
  currency: string;
  isInstallment?: boolean;
  installmentGroupId?: string | null;
  installmentCount?: number | null;
  installmentIndex?: number | null;
  installmentTotalAmount?: number | null;
  installmentFrequency?: InstallmentFrequency | null;
  installmentPurchaseDate?: string | null;
  installmentFirstPaymentDate?: string | null;
  isSubscription?: boolean;
  imageUrl?: string;
  imagePresignedUrl?: string;
  note?: string;
  paymentMethod?: PaymentMethodValue;
  creditCardId?: string | null;
  creditCard?: CreditCard | null;
  date: string;
  categoryId?: string;
  category?: Category;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Income {
  id: string;
  title: string;
  amount: number;
  currency: string;
  note?: string | null;
  date: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExpensesFilters {
  from?: string;
  to?: string;
  q?: string;
  categoryId?: string;
}

export interface ExpensesPagination {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ExpensesListParams extends ExpensesFilters {
  page?: number;
  limit?: number;
}

export interface ExpensesListResponse {
  expenses: Expense[];
  pagination: ExpensesPagination;
  total: number;
  currencyBreakdown?: Array<{
    currency: string;
    total: number;
  }>;
}

export type SubscriptionBillingCycle = 'MONTHLY' | 'YEARLY' | 'WEEKLY';

export interface Subscription {
  id: string;
  name: string;
  cost: number;
  paymentMethod?: PaymentMethodValue;
  creditCardId?: string | null;
  creditCard?: CreditCard | null;
  currency: string;
  billingCycle: SubscriptionBillingCycle;
  nextPaymentDate: string;
  reminderDays: number;
  isActive: boolean;
  logoUrl?: string | null;
  hexColor?: string | null;
  userId?: string;
  chargeDate: string;
  color: string;
  icon: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionProjection {
  message: string;
  activeCount: number;
  totalMonthlyCost: number;
  currency: string | null;
  currencyBreakdown: Array<{
    currency: string;
    monthlyCost: number;
  }>;
}

export interface CreateSubscriptionPayload {
  name: string;
  cost: number;
  paymentMethod?: PaymentMethodValue;
  creditCardId?: string | null;
  billingCycle: SubscriptionBillingCycle;
  nextPaymentDate: string;
  currency?: string;
  reminderDays?: number;
  isActive?: boolean;
  logoUrl?: string;
  hexColor?: string;
}

export type UpdateSubscriptionPayload = Partial<CreateSubscriptionPayload>;

export interface TodaySummary {
  expenses: Expense[];
  total: number;
  currency?: string | null;
  currencyBreakdown?: Array<{
    currency: string;
    total: number;
  }>;
  budgetAmount: number;
  budgetPeriod: BudgetPeriod;
  budgetPeriodStart?: string | null;
  budgetPeriodEnd?: string | null;
  spentInBudgetPeriod: number;
  dailyBudget: number;
  remaining: number;
  percentage: number;
}

export interface DailyTotal {
  date: string;
  total: number;
}

export interface CategoryBreakdown {
  name: string;
  icon: string;
  color: string;
  total: number;
  count: number;
  percentage: number;
}

export interface WeeklySummary {
  period: { type: BudgetPeriod; start: string | null; end: string | null };
  totalSpent: number;
  budgetAmount: number;
  weeklyBudget: number;
  remaining: number;
  expenseCount: number;
  dailyAverage: number;
}

export interface BudgetSummary {
  period: { type: BudgetPeriod; start: string | null; end: string | null };
  totalSpent: number;
  budgetAmount: number;
  reservedSubscriptions?: number;
  safeToSpend?: number;
  remaining: number;
  expenseCount: number;
  dailyAverage: number;
  weeklyBudget: number;
}

export interface IncomeSummary {
  period: { type: BudgetPeriod; start: string | null; end: string | null };
  totalIncome: number;
  totalExpenses: number;
  net: number;
  incomeCount: number;
  averageIncome: number;
  savingsRate: number | null;
}

export interface AnalyticsSpendInsight {
  start: string;
  end: string;
  totalSpent: number;
  expenseCount: number;
  averagePerDay: number;
  previousStart: string;
  previousEnd: string;
  previousTotalSpent: number;
  changeAmount: number;
  changePercent: number | null;
}

export interface AnalyticsCategoryImpact {
  name: string;
  icon: string;
  color: string;
  total: number;
  percentage: number;
}

export interface AnalyticsSubscriptionOpportunity {
  id: string;
  name: string;
  currency: string;
  billingCycle: SubscriptionBillingCycle | 'DAILY';
  amount: number;
  monthlyEquivalent: number;
  projectedSavings: number;
  nextPaymentDate: string;
}

export interface AnalyticsSubscriptionSavings {
  horizonMonths: number;
  monthlyRecurringSpend: number;
  projectedSavings: number;
  activeSubscriptions: number;
  topSubscriptions: AnalyticsSubscriptionOpportunity[];
}

export interface AnalyticsInsights {
  referenceDate: string;
  weeklySpend: AnalyticsSpendInsight;
  monthlySpend: AnalyticsSpendInsight & {
    projectedTotal: number;
  };
  topCategory: AnalyticsCategoryImpact | null;
  subscriptionSavings: AnalyticsSubscriptionSavings;
}

export type ReportPeriodType = 'weekly' | 'monthly';

export interface ReportWindowSnapshot {
  type: ReportPeriodType;
  label: string;
  referenceDate: string;
  start: string;
  end: string;
  trackedDays: number;
}

export interface ReportSummarySnapshot {
  totalIncome: number;
  incomeCount: number;
  averageIncome: number;
  totalSpent: number;
  expenseCount: number;
  averagePerDay: number;
  net: number;
  savingsRate: number | null;
}

export interface ReportSavingsSnapshot {
  goalCount: number;
  totalSaved: number;
  totalTarget: number;
  progressPercent: number | null;
  nextGoal: {
    id: string;
    title: string;
    targetDate: string | null;
    currentAmount: number;
    targetAmount: number;
  } | null;
}

export interface ReportSnapshot {
  generatedAt: string;
  report: ReportWindowSnapshot;
  summary: ReportSummarySnapshot;
  plan: BudgetSummary;
  categoryBudgets: {
    overBudgetCount: number;
    watchCount: number;
  };
  categories: CategoryBreakdown[];
  insights: AnalyticsInsights;
  savings: ReportSavingsSnapshot;
  highlights: {
    suggestedSavingsMove: number;
  };
}

export type ReportHistorySource = 'manual' | 'email';

export interface ReportHistoryItem {
  id: string;
  periodType: ReportPeriodType;
  source: ReportHistorySource;
  referenceDate: string;
  start: string;
  end: string;
  createdAt: string;
  summary: ReportSummarySnapshot;
}

export interface UpcomingSubscriptionCharge {
  id?: string;
  subscriptionId?: string;
  name: string;
  amount: number;
  currency?: string;
  daysRemaining: number;
  paymentMethod?: PaymentMethodValue;
  creditCardId?: string | null;
  creditCard?: CreditCard | null;
  chargeDate?: string | null;
  nextPaymentDate?: string | null;
}

export type SavingsTransactionType = 'DEPOSIT' | 'WITHDRAW';

export interface SavingsTransaction {
  id: string;
  amount: number;
  type: SavingsTransactionType;
  goalId: string;
  createdAt: string;
}

export interface SavingsGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string | null;
  icon?: string | null;
  color?: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
  transactions?: SavingsTransaction[];
}

export interface CreateSavingsGoalPayload {
  title: string;
  targetAmount: number;
  targetDate?: string;
  icon?: string;
  color?: string;
}

export type UpdateSavingsGoalPayload = Partial<CreateSavingsGoalPayload>;

export interface AddSavingsFundsPayload {
  amount: number;
}

export interface WithdrawSavingsFundsPayload {
  amount: number;
}

export interface SavingsGoalTransactionResponse {
  transaction: SavingsTransaction;
  goal: SavingsGoal;
}

export type SavingsFundsResponse = SavingsGoalTransactionResponse;

export interface DeleteSavingsGoalResponse {
  success: boolean;
}

export interface HistorySummary {
  expenseCount: number;
  subscriptionCount: number;
  totalExpenses: number;
  totalSubscriptions: number;
  total: number;
  expenseCurrency?: string | null;
  expenseTotalsByCurrency?: Array<{
    currency: string;
    total: number;
  }>;
  subscriptionTotalsByCurrency?: Array<{
    currency: string;
    total: number;
  }>;
}

export interface HistoryPayload {
  user: User | null;
  summary: HistorySummary;
  expenses: Expense[];
  subscriptions: Subscription[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse extends AuthTokens {
  user: User;
}

export interface RegisterResponse extends AuthResponse {
  message?: string;
}

export interface CreateExpensePayload {
  title: string;
  cost: number;
  currency: string;
  isInstallment?: boolean;
  installmentCount?: number;
  installmentFrequency?: InstallmentFrequency;
  installmentPurchaseDate?: string;
  installmentFirstPaymentDate?: string;
  paymentMethod?: PaymentMethodValue;
  creditCardId?: string | null;
  note?: string;
  date?: string;
  categoryId?: string;
}

export type UpdateExpensePayload = Partial<CreateExpensePayload>;

export interface CreateIncomePayload {
  title: string;
  amount: number;
  currency?: string;
  note?: string;
  date?: string;
}

export type UpdateIncomePayload = Partial<CreateIncomePayload>;

export interface IncomeListResponse {
  incomes: Income[];
  total: number;
  count: number;
  currencyBreakdown: Array<{
    currency: string;
    total: number;
  }>;
}

export interface CreateCreditCardPayload {
  name: string;
  bank: string;
  brand: string;
  last4: string;
  color?: string | null;
  creditLimit?: number | null;
  closingDay?: number | null;
  paymentDueDay?: number | null;
  isActive?: boolean;
}

export type UpdateCreditCardPayload = Partial<CreateCreditCardPayload>;

export interface CreditCardCycleSnapshot {
  start: string;
  end: string;
  spend: number;
  expenseCount: number;
}

export interface CreditCardCreditStatus {
  limit: number | null;
  availableCredit: number | null;
  utilizationPercent: number | null;
}

export interface CreditCardScheduleSnapshot {
  nextClosingDate: string | null;
  daysUntilClosing: number | null;
  nextPaymentDueDate: string | null;
  daysUntilPaymentDue: number | null;
}

export interface CreditCardRecurringSnapshot {
  activeCount: number;
  monthlyRecurringSpend: number;
  nextChargeDate: string | null;
}

export interface CreditCardOverviewFlags {
  missingLimit: boolean;
  highUtilization: boolean;
  overLimit: boolean;
  paymentDueSoon: boolean;
  closingSoon: boolean;
}

export interface CreditCardOverviewCard extends CreditCard {
  currentCycle: CreditCardCycleSnapshot;
  creditStatus: CreditCardCreditStatus;
  schedule: CreditCardScheduleSnapshot;
  subscriptions: CreditCardRecurringSnapshot;
  flags: CreditCardOverviewFlags;
}

export interface CreditCardPortfolioOverview {
  trackedCards: number;
  activeCards: number;
  cardsWithLimit: number;
  totalCreditLimit: number;
  totalCurrentCycleSpend: number;
  totalAvailableCredit: number;
  utilizationPercent: number | null;
  paymentDueSoonCount: number;
  highUtilizationCount: number;
  linkedSubscriptionsCount: number;
  monthlyRecurringSpend: number;
}

export interface CreditCardsOverviewResponse {
  referenceDate: string;
  portfolio: CreditCardPortfolioOverview;
  cards: CreditCardOverviewCard[];
}
