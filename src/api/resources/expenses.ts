import apiClient from '../client';
import {
    Expense,
    TodaySummary,
    CreateExpensePayload,
    ExpensesListParams,
    ExpensesListResponse,
    ExpensesPagination,
} from '../../types/index';
import { normalizeBudgetPeriod } from '../../utils/domain/budget';
import {
    aggregateCurrencyTotals,
    normalizeCurrency,
    normalizeCurrencyTotals,
} from '../../utils/domain/currency';
import { toNum } from '../../utils/core/number';
import { normalizeCreditCard } from '../../utils/domain/creditCards';
import { normalizePaymentMethod } from '../../utils/domain/paymentMethod';
import {
    normalizeInstallmentFrequency,
    splitAmountAcrossInstallments,
} from '../../utils/domain/installments';
import { dateOnly } from '../../utils/core/filters';
import { isLocalMode } from '../../modules/access/localMode';
import { buildTodaySummary, filterExpensesList } from '../../modules/local/localFinance';
import { ensureGuestDataHydrated, getGuestUserId } from '../../store/guestDataStore';
import { useAuthStore } from '../../store/authStore';

const DEFAULT_EXPENSES_PAGE = 1;
const DEFAULT_EXPENSES_LIMIT = 20;

export type ExpenseUploadImage = {
    uri: string;
    name?: string;
    type?: string;
};

function inferImageMimeType(image: ExpenseUploadImage): string {
    const candidate = (image.name || image.uri.split('/').pop() || '').toLowerCase();

    if (candidate.endsWith('.png')) return 'image/png';
    if (candidate.endsWith('.webp')) return 'image/webp';
    if (candidate.endsWith('.gif')) return 'image/gif';
    if (candidate.endsWith('.heic')) return 'image/heic';
    if (candidate.endsWith('.heif')) return 'image/heif';

    return 'image/jpeg';
}

export function normalizeExpense(expense: any): Expense {
    return {
        ...expense,
        isInstallment: expense?.isInstallment === true,
        installmentGroupId:
            typeof expense?.installmentGroupId === 'string'
                ? expense.installmentGroupId
                : null,
        installmentCount:
            expense?.installmentCount != null
                ? toNum(expense.installmentCount)
                : null,
        installmentIndex:
            expense?.installmentIndex != null
                ? toNum(expense.installmentIndex)
                : null,
        installmentTotalAmount:
            expense?.installmentTotalAmount != null
                ? toNum(expense.installmentTotalAmount)
                : null,
        installmentFrequency:
            expense?.installmentFrequency != null
                ? normalizeInstallmentFrequency(expense.installmentFrequency)
                : null,
        installmentPurchaseDate:
            typeof expense?.installmentPurchaseDate === 'string'
                ? expense.installmentPurchaseDate
                : null,
        installmentFirstPaymentDate:
            typeof expense?.installmentFirstPaymentDate === 'string'
                ? expense.installmentFirstPaymentDate
                : null,
        paymentMethod: normalizePaymentMethod(expense?.paymentMethod),
        creditCardId:
            typeof expense?.creditCardId === 'string' ? expense.creditCardId : null,
        creditCard:
            expense?.creditCard && typeof expense.creditCard === 'object'
                ? normalizeCreditCard(expense.creditCard)
                : null,
        cost: toNum(expense?.cost),
        currency: normalizeCurrency(expense?.currency),
        isSubscription: expense?.isSubscription === true,
    } as Expense;
}

function normalizeTodaySummary(summary: any): TodaySummary {
    const budgetAmount = toNum(summary?.budgetAmount ?? summary?.dailyBudget);
    const spentInBudgetPeriod = toNum(
        summary?.spentInBudgetPeriod ?? summary?.total,
    );

    return {
        ...summary,
        expenses: Array.isArray(summary?.expenses)
            ? summary.expenses.map(normalizeExpense)
            : [],
        total: toNum(summary?.total),
        currency: typeof summary?.currency === 'string' ? summary.currency : null,
        currencyBreakdown: normalizeCurrencyTotals(summary?.currencyBreakdown),
        budgetAmount,
        budgetPeriod: normalizeBudgetPeriod(summary?.budgetPeriod, 'daily'),
        budgetPeriodStart:
            typeof summary?.budgetPeriodStart === 'string'
                ? summary.budgetPeriodStart
                : null,
        budgetPeriodEnd:
            typeof summary?.budgetPeriodEnd === 'string'
                ? summary.budgetPeriodEnd
                : null,
        spentInBudgetPeriod,
        dailyBudget: toNum(summary?.dailyBudget ?? budgetAmount),
        remaining: toNum(summary?.remaining),
        percentage: toNum(summary?.percentage),
    };
}

function normalizeExpensesPagination(
    pagination: any,
    expensesLength: number,
    requestedPage: number,
    requestedLimit: number,
    fallbackCount?: number,
): ExpensesPagination {
    if (!pagination || typeof pagination !== 'object') {
        return {
            page: DEFAULT_EXPENSES_PAGE,
            limit: requestedLimit,
            totalCount: toNum(fallbackCount ?? expensesLength),
            totalPages: 1,
            hasNext: false,
            hasPrev: false,
        };
    }

    const page = Math.max(toNum(pagination.page ?? requestedPage), DEFAULT_EXPENSES_PAGE);
    const limit = Math.max(toNum(pagination.limit ?? requestedLimit), 1);
    const totalCount = Math.max(
        toNum(pagination.totalCount ?? fallbackCount ?? expensesLength),
        0,
    );
    const totalPages = Math.max(
        toNum(
            pagination.totalPages
            ?? (limit > 0 ? Math.ceil(totalCount / limit) : 1),
        ),
        1,
    );

    return {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext:
            typeof pagination.hasNext === 'boolean'
                ? pagination.hasNext
                : page < totalPages,
        hasPrev:
            typeof pagination.hasPrev === 'boolean'
                ? pagination.hasPrev
                : page > DEFAULT_EXPENSES_PAGE,
    };
}

function normalizeExpensesListResponse(
    payload: any,
    requestedPage: number,
    requestedLimit: number,
): ExpensesListResponse {
    const expenses = Array.isArray(payload?.expenses)
        ? payload.expenses.map(normalizeExpense)
        : [];
    const fallbackCount = toNum(payload?.count ?? expenses.length);

    return {
        expenses,
        pagination: normalizeExpensesPagination(
            payload?.pagination,
            expenses.length,
            requestedPage,
            requestedLimit,
            fallbackCount,
        ),
        total: toNum(payload?.total),
        currencyBreakdown: normalizeCurrencyTotals(payload?.currencyBreakdown),
    };
}

function createLocalExpenseId() {
    return `expense_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function toExpenseDateTime(value?: string | null): string {
    const normalized = dateOnly(value || new Date());
    return `${normalized}T12:00:00`;
}

function addMonthsToDate(dateValue: string, monthOffset: number): string {
    const base = new Date(`${dateOnly(dateValue)}T12:00:00`);
    base.setMonth(base.getMonth() + monthOffset);
    return base.toISOString();
}

function buildLocalExpensePayload(
    payload: CreateExpensePayload,
    image?: ExpenseUploadImage | null,
): Expense[] {
    const state = ensureGuestDataHydrated();
    const activeUser = useAuthStore.getState().user;
    const userId = activeUser?.id || getGuestUserId();
    const nowIso = new Date().toISOString();
    const categoryId = payload.categoryId;
    const category = categoryId
        ? state.categories.find((item) => item.id === categoryId)
        : undefined;
    const creditCardId = payload.creditCardId ?? null;
    const creditCard = creditCardId
        ? state.creditCards.find((item) => item.id === creditCardId) ?? null
        : null;
    const normalizedCurrency = normalizeCurrency(
        payload.currency,
        activeUser?.currency,
    );
    const baseExpense = {
        title: payload.title.trim(),
        currency: normalizedCurrency,
        note: payload.note?.trim() || undefined,
        paymentMethod: normalizePaymentMethod(payload.paymentMethod),
        creditCardId,
        creditCard: creditCard ? normalizeCreditCard(creditCard) : null,
        categoryId,
        category,
        userId,
        imageUrl: image?.uri,
        imagePresignedUrl: image?.uri,
        createdAt: nowIso,
        updatedAt: nowIso,
    };

    if (payload.isInstallment && toNum(payload.installmentCount) > 1) {
        const totalAmount = toNum(payload.cost);
        const installmentCount = Math.max(2, Math.trunc(toNum(payload.installmentCount)));
        const amounts = splitAmountAcrossInstallments(totalAmount, installmentCount);
        const purchaseDate = dateOnly(
            payload.installmentPurchaseDate || payload.date || nowIso,
        );
        const firstPaymentDate = dateOnly(
            payload.installmentFirstPaymentDate || payload.date || nowIso,
        );
        const groupId = `installment_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

        return amounts.map((amount, index) =>
            normalizeExpense({
                ...baseExpense,
                id: createLocalExpenseId(),
                cost: amount,
                date: addMonthsToDate(firstPaymentDate, index),
                isInstallment: true,
                installmentGroupId: groupId,
                installmentCount,
                installmentIndex: index + 1,
                installmentTotalAmount: totalAmount,
                installmentFrequency: normalizeInstallmentFrequency(
                    payload.installmentFrequency,
                ),
                installmentPurchaseDate: purchaseDate,
                installmentFirstPaymentDate: firstPaymentDate,
            }),
        );
    }

    return [
        normalizeExpense({
            ...baseExpense,
            id: createLocalExpenseId(),
            cost: toNum(payload.cost),
            date: toExpenseDateTime(payload.date || nowIso),
            isInstallment: false,
        }),
    ];
}

function buildLocalUpdatePayload(
    currentExpense: Expense,
    payload: Partial<CreateExpensePayload>,
): CreateExpensePayload {
    const currentIsInstallment = currentExpense.isInstallment === true;

    return {
        title: payload.title ?? currentExpense.title,
        cost: currentIsInstallment
            ? toNum(payload.cost ?? currentExpense.installmentTotalAmount ?? currentExpense.cost)
            : toNum(payload.cost ?? currentExpense.cost),
        currency: payload.currency ?? currentExpense.currency,
        isInstallment: payload.isInstallment ?? currentIsInstallment,
        installmentCount: payload.installmentCount ?? currentExpense.installmentCount ?? undefined,
        installmentFrequency:
            payload.installmentFrequency
            ?? currentExpense.installmentFrequency
            ?? undefined,
        installmentPurchaseDate:
            payload.installmentPurchaseDate
            ?? currentExpense.installmentPurchaseDate
            ?? dateOnly(currentExpense.date),
        installmentFirstPaymentDate:
            payload.installmentFirstPaymentDate
            ?? currentExpense.installmentFirstPaymentDate
            ?? dateOnly(currentExpense.date),
        paymentMethod:
            payload.paymentMethod !== undefined
                ? payload.paymentMethod
                : currentExpense.paymentMethod,
        creditCardId:
            payload.creditCardId !== undefined
                ? payload.creditCardId
                : currentExpense.creditCardId ?? null,
        note: payload.note !== undefined ? payload.note : currentExpense.note,
        date: payload.date ?? dateOnly(currentExpense.date),
        categoryId:
            payload.categoryId
            ?? currentExpense.categoryId
            ?? currentExpense.category?.id,
    };
}

function getLocalExpenses(params: ExpensesListParams = {}) {
    const state = ensureGuestDataHydrated();
    return filterExpensesList(state.expenses, params);
}

export const expensesApi = {
    getToday: async () => {
        if (isLocalMode()) {
            const state = ensureGuestDataHydrated();
            return buildTodaySummary({
                user: useAuthStore.getState().user,
                expenses: state.expenses,
                subscriptions: state.subscriptions,
            });
        }

        const { data } = await apiClient.get<TodaySummary>('/expenses/today');
        return normalizeTodaySummary(data);
    },

    getAll: async (
        params: ExpensesListParams = {},
        options?: { signal?: AbortSignal },
    ) => {
        if (isLocalMode()) {
            const requestedPage = Math.max(
                toNum(params.page ?? DEFAULT_EXPENSES_PAGE),
                DEFAULT_EXPENSES_PAGE,
            );
            const requestedLimit = Math.max(
                toNum(params.limit ?? DEFAULT_EXPENSES_LIMIT),
                1,
            );
            const filteredExpenses = getLocalExpenses(params);
            const start = (requestedPage - 1) * requestedLimit;
            const pagedExpenses = filteredExpenses.slice(start, start + requestedLimit);
            const total = filteredExpenses.reduce((sum, item) => sum + toNum(item.cost), 0);
            const totalPages = Math.max(
                Math.ceil(filteredExpenses.length / requestedLimit),
                1,
            );

            return {
                expenses: pagedExpenses,
                pagination: {
                    page: requestedPage,
                    limit: requestedLimit,
                    totalCount: filteredExpenses.length,
                    totalPages,
                    hasNext: requestedPage < totalPages,
                    hasPrev: requestedPage > 1,
                },
                total,
                currencyBreakdown: aggregateCurrencyTotals(
                    filteredExpenses,
                    (expense) => expense.cost,
                    (expense) => expense.currency,
                ),
            };
        }

        const requestedPage = Math.max(toNum(params.page ?? DEFAULT_EXPENSES_PAGE), DEFAULT_EXPENSES_PAGE);
        const requestedLimit = Math.max(toNum(params.limit ?? DEFAULT_EXPENSES_LIMIT), 1);
        const queryParams = {
            ...params,
            page: requestedPage,
            limit: requestedLimit,
        };
        const { data } = await apiClient.get('/expenses', {
            params: queryParams,
            signal: options?.signal,
        });

        return normalizeExpensesListResponse(data, requestedPage, requestedLimit);
    },

    getAllPages: async (
        params: Omit<ExpensesListParams, 'page'> = {},
        options?: { signal?: AbortSignal },
    ) => {
        if (isLocalMode()) {
            const expenses = getLocalExpenses(params);
            const limit = Math.max(
                toNum(params.limit ?? Math.max(expenses.length, 1)),
                1,
            );
            return {
                expenses,
                pagination: {
                    page: 1,
                    limit,
                    totalCount: expenses.length,
                    totalPages: 1,
                    hasNext: false,
                    hasPrev: false,
                },
                total: expenses.reduce((sum, item) => sum + toNum(item.cost), 0),
                currencyBreakdown: aggregateCurrencyTotals(
                    expenses,
                    (expense) => expense.cost,
                    (expense) => expense.currency,
                ),
            };
        }

        const limit = Math.max(toNum(params.limit ?? 100), 1);
        let page = DEFAULT_EXPENSES_PAGE;
        let combinedExpenses: Expense[] = [];
        let lastResponse: ExpensesListResponse | null = null;

        while (true) {
            const response = await expensesApi.getAll(
                { ...params, page, limit },
                options,
            );

            combinedExpenses = [...combinedExpenses, ...response.expenses];
            lastResponse = response;

            if (!response.pagination.hasNext) {
                break;
            }

            page = response.pagination.page + 1;
        }

        return {
            expenses: combinedExpenses,
            pagination: {
                page: lastResponse?.pagination.page ?? DEFAULT_EXPENSES_PAGE,
                limit,
                totalCount:
                    lastResponse?.pagination.totalCount
                    ?? combinedExpenses.length,
                totalPages: lastResponse?.pagination.totalPages ?? 1,
                hasNext: false,
                hasPrev: false,
            },
            total: lastResponse?.total ?? 0,
        };
    },

    getOne: async (id: string) => {
        if (isLocalMode()) {
            const { expenses } = ensureGuestDataHydrated();
            const expense = expenses.find((item) => item.id === id);
            if (!expense) {
                throw new Error('Expense not found');
            }

            return normalizeExpense(expense);
        }

        const { data } = await apiClient.get<Expense>(`/expenses/${id}`);
        return normalizeExpense(data);
    },

    create: async (payload: CreateExpensePayload, image?: ExpenseUploadImage | null) => {
        if (isLocalMode()) {
            const state = ensureGuestDataHydrated();
            const createdExpenses = buildLocalExpensePayload(payload, image);
            state.addExpenses(createdExpenses);
            return createdExpenses[0];
        }

        if (!image?.uri) {
            const { data } = await apiClient.post<Expense>('/expenses', payload);
            return normalizeExpense(data);
        }

        const formData = new FormData();
        formData.append('title', payload.title);
        formData.append('cost', String(payload.cost));
        formData.append('currency', payload.currency);

        if (payload.note) formData.append('note', payload.note);
        if (payload.isInstallment) formData.append('isInstallment', 'true');
        if (payload.installmentCount) {
            formData.append('installmentCount', String(payload.installmentCount));
        }
        if (payload.installmentFrequency) {
            formData.append('installmentFrequency', payload.installmentFrequency);
        }
        if (payload.installmentPurchaseDate) {
            formData.append('installmentPurchaseDate', payload.installmentPurchaseDate);
        }
        if (payload.installmentFirstPaymentDate) {
            formData.append('installmentFirstPaymentDate', payload.installmentFirstPaymentDate);
        }
        if (payload.paymentMethod) formData.append('paymentMethod', payload.paymentMethod);
        if (payload.creditCardId) formData.append('creditCardId', payload.creditCardId);
        if (payload.date) formData.append('date', payload.date);
        if (payload.categoryId) formData.append('categoryId', payload.categoryId);

        const filename = image.name || image.uri.split('/').pop() || 'receipt.jpg';
        formData.append('image', {
            uri: image.uri,
            name: filename,
            type: image.type || inferImageMimeType(image),
        } as any);

        const { data } = await apiClient.post<Expense>('/expenses', formData);
        return normalizeExpense(data);
    },

    update: async (id: string, payload: Partial<CreateExpensePayload>) => {
        if (isLocalMode()) {
            const state = ensureGuestDataHydrated();
            const currentExpense = state.expenses.find((item) => item.id === id);
            if (!currentExpense) {
                throw new Error('Expense not found');
            }

            if (
                currentExpense.isInstallment
                && currentExpense.installmentGroupId
            ) {
                const groupExpenses = state.expenses.filter(
                    (item) => item.installmentGroupId === currentExpense.installmentGroupId,
                );
                const nextPayload = buildLocalUpdatePayload(currentExpense, payload);
                const nextExpenses = buildLocalExpensePayload(nextPayload).map(
                    (expense, index) =>
                        normalizeExpense({
                            ...expense,
                            installmentGroupId: currentExpense.installmentGroupId,
                            installmentIndex: index + 1,
                        }),
                );
                state.removeExpenses(groupExpenses.map((expense) => expense.id));
                state.addExpenses(nextExpenses);
                return nextExpenses[0];
            }

            const updated = state.updateExpense(id, (expense) =>
                normalizeExpense({
                    ...expense,
                    ...payload,
                    paymentMethod:
                        payload.paymentMethod !== undefined
                            ? normalizePaymentMethod(payload.paymentMethod)
                            : expense.paymentMethod,
                    categoryId:
                        payload.categoryId !== undefined
                            ? payload.categoryId
                            : expense.categoryId,
                    category:
                        payload.categoryId !== undefined
                            ? (
                                state.categories.find((item) => item.id === payload.categoryId)
                                ?? expense.category
                            )
                            : expense.category,
                    creditCardId:
                        payload.creditCardId !== undefined
                            ? payload.creditCardId
                            : expense.creditCardId,
                    creditCard:
                        payload.creditCardId !== undefined
                            ? (
                                state.creditCards.find((item) => item.id === payload.creditCardId)
                                ?? null
                            )
                            : expense.creditCard,
                    currency:
                        payload.currency !== undefined
                            ? normalizeCurrency(payload.currency)
                            : expense.currency,
                    date:
                        payload.date !== undefined
                            ? toExpenseDateTime(payload.date)
                            : expense.date,
                    updatedAt: new Date().toISOString(),
                }),
            );

            if (!updated) {
                throw new Error('Expense not found');
            }

            return updated;
        }

        const { data } = await apiClient.patch<Expense>(
            `/expenses/${id}`,
            payload,
        );
        return normalizeExpense(data);
    },

    delete: async (id: string) => {
        if (isLocalMode()) {
            const state = ensureGuestDataHydrated();
            const currentExpense = state.expenses.find((item) => item.id === id);
            if (!currentExpense) {
                return { deletedExpenseIds: [] };
            }

            const deletedExpenseIds = currentExpense.installmentGroupId
                ? state.expenses
                    .filter((item) => item.installmentGroupId === currentExpense.installmentGroupId)
                    .map((item) => item.id)
                : [id];

            state.removeExpenses(deletedExpenseIds);
            return {
                success: true,
                deletedExpenseIds,
            };
        }

        const { data } = await apiClient.delete(`/expenses/${id}`);
        return data;
    },

    syncBatch: async (expenses: CreateExpensePayload[]) => {
        if (isLocalMode()) {
            const state = ensureGuestDataHydrated();
            const created = expenses.flatMap((expense) => buildLocalExpensePayload(expense));
            state.addExpenses(created);
            return created;
        }

        const { data } = await apiClient.post<Expense[]>('/expenses/sync', expenses);
        return Array.isArray(data) ? data.map(normalizeExpense) : [];
    },
};
