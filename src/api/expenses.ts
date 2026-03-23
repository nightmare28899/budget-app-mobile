import apiClient from './client';
import {
    Expense,
    TodaySummary,
    CreateExpensePayload,
    ExpensesListParams,
    ExpensesListResponse,
    ExpensesPagination,
} from '../types';
import { normalizeBudgetPeriod } from '../utils/budget';
import { toNum } from '../utils/number';

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
        paymentMethod: typeof expense?.paymentMethod === 'string' ? expense.paymentMethod : undefined,
        cost: toNum(expense?.cost),
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
    };
}

export const expensesApi = {
    getToday: async () => {
        const { data } = await apiClient.get<TodaySummary>('/expenses/today');
        return normalizeTodaySummary(data);
    },

    getAll: async (
        params: ExpensesListParams = {},
        options?: { signal?: AbortSignal },
    ) => {
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
        const { data } = await apiClient.get<Expense>(`/expenses/${id}`);
        return normalizeExpense(data);
    },

    create: async (payload: CreateExpensePayload, image?: ExpenseUploadImage | null) => {
        const formData = new FormData();
        formData.append('title', payload.title);
        formData.append('cost', String(payload.cost));

        if (payload.note) formData.append('note', payload.note);
        if (payload.paymentMethod) formData.append('paymentMethod', payload.paymentMethod);
        if (payload.date) formData.append('date', payload.date);
        if (payload.categoryId) formData.append('categoryId', payload.categoryId);

        if (image?.uri) {
            const filename = image.name || image.uri.split('/').pop() || 'receipt.jpg';
            formData.append('image', {
                uri: image.uri,
                name: filename,
                type: image.type || inferImageMimeType(image),
            } as any);
        }

        const { data } = await apiClient.post<Expense>('/expenses', formData);
        return normalizeExpense(data);
    },

    update: async (id: string, payload: Partial<CreateExpensePayload>) => {
        const { data } = await apiClient.patch<Expense>(
            `/expenses/${id}`,
            payload,
        );
        return normalizeExpense(data);
    },

    delete: async (id: string) => {
        const { data } = await apiClient.delete(`/expenses/${id}`);
        return data;
    },

    syncBatch: async (expenses: CreateExpensePayload[]) => {
        const { data } = await apiClient.post<Expense[]>('/expenses/sync', expenses);
        return Array.isArray(data) ? data.map(normalizeExpense) : [];
    },
};
