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

export type BudgetPeriod =
    | 'daily'
    | 'weekly'
    | 'monthly'
    | 'annual'
    | 'period';

export interface Category {
    id: string;
    name: string;
    icon?: string;
    color?: string;
    userId: string;
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
