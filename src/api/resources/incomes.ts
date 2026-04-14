import apiClient from '../client';
import {
    CreateIncomePayload,
    Income,
    IncomeListResponse,
    IncomeSummary,
    UpdateIncomePayload,
} from '../../types/index';
import {
    aggregateCurrencyTotals,
    normalizeCurrency,
    normalizeCurrencyTotals,
} from '../../utils/domain/currency';
import { normalizeBudgetPeriod } from '../../utils/domain/budget';
import { toNum } from '../../utils/core/number';
import { dateOnly } from '../../utils/core/filters';
import { isLocalMode } from '../../modules/access/localMode';
import { buildIncomeSummary } from '../../modules/local/localFinance';
import { ensureGuestDataHydrated, getGuestUserId } from '../../store/guestDataStore';
import { useAuthStore } from '../../store/authStore';

type IncomeListParams = {
    from?: string;
    to?: string;
    q?: string;
};

type RequestOptions = {
    signal?: AbortSignal;
};

function toIncomeDateTime(value?: string | null): string {
    const normalized = dateOnly(value || new Date());
    return `${normalized}T12:00:00`;
}

function createLocalIncomeId() {
    return `income_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function normalizePeriod(period: any) {
    return {
        type: normalizeBudgetPeriod(period?.type, 'monthly'),
        start: typeof period?.start === 'string' ? period.start : null,
        end: typeof period?.end === 'string' ? period.end : null,
    };
}

export function normalizeIncome(item: any): Income {
    return {
        id: String(item?.id ?? ''),
        title: String(item?.title ?? ''),
        amount: toNum(item?.amount),
        currency: normalizeCurrency(item?.currency),
        note: typeof item?.note === 'string' ? item.note : null,
        date:
            typeof item?.date === 'string'
                ? item.date
                : new Date().toISOString(),
        userId: typeof item?.userId === 'string' ? item.userId : getGuestUserId(),
        createdAt:
            typeof item?.createdAt === 'string'
                ? item.createdAt
                : new Date().toISOString(),
        updatedAt:
            typeof item?.updatedAt === 'string'
                ? item.updatedAt
                : new Date().toISOString(),
    };
}

function normalizeIncomeSummary(payload: any): IncomeSummary {
    return {
        period: normalizePeriod(payload?.period),
        totalIncome: toNum(payload?.totalIncome),
        totalExpenses: toNum(payload?.totalExpenses),
        net: toNum(payload?.net),
        incomeCount: toNum(payload?.incomeCount),
        averageIncome: toNum(payload?.averageIncome),
        savingsRate:
            payload?.savingsRate === null || payload?.savingsRate === undefined
                ? null
                : toNum(payload?.savingsRate),
    };
}

function buildLocalListResponse(
    incomes: Income[],
    params: IncomeListParams = {},
): IncomeListResponse {
    const from = params.from?.trim();
    const to = params.to?.trim();
    const q = params.q?.trim().toLowerCase();

    const filtered = [...incomes]
        .filter((income) => {
            const incomeDate = dateOnly(income.date);
            if (from && incomeDate < from) {
                return false;
            }
            if (to && incomeDate > to) {
                return false;
            }
            if (!q) {
                return true;
            }

            const haystack = [income.title, income.note]
                .map((item) => String(item ?? '').toLowerCase())
                .join(' ');

            return haystack.includes(q);
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
        incomes: filtered,
        total: filtered.reduce((sum, income) => sum + toNum(income.amount), 0),
        count: filtered.length,
        currencyBreakdown: aggregateCurrencyTotals(
            filtered,
            (income) => income.amount,
            (income) => income.currency,
        ),
    };
}

export const incomesApi = {
    getAll: async (params: IncomeListParams = {}, options?: RequestOptions) => {
        if (isLocalMode()) {
            const state = ensureGuestDataHydrated();
            return buildLocalListResponse(state.incomes, params);
        }

        const { data } = await apiClient.get<IncomeListResponse>('/incomes', {
            params,
            signal: options?.signal,
        });

        return {
            incomes: Array.isArray(data?.incomes)
                ? data.incomes.map(normalizeIncome)
                : [],
            total: toNum(data?.total),
            count: toNum(data?.count),
            currencyBreakdown: normalizeCurrencyTotals(data?.currencyBreakdown),
        };
    },

    getSummary: async (referenceDate?: string) => {
        if (isLocalMode()) {
            const state = ensureGuestDataHydrated();
            const anchorDate = referenceDate ? new Date(`${referenceDate}T12:00:00`) : new Date();
            return buildIncomeSummary({
                user: useAuthStore.getState().user,
                expenses: state.expenses,
                incomes: state.incomes,
                now: anchorDate,
            });
        }

        const { data } = await apiClient.get<IncomeSummary>('/incomes/summary', {
            params: { referenceDate },
        });
        return normalizeIncomeSummary(data);
    },

    create: async (payload: CreateIncomePayload) => {
        if (isLocalMode()) {
            const state = ensureGuestDataHydrated();
            const activeUser = useAuthStore.getState().user;
            const nowIso = new Date().toISOString();
            const income = normalizeIncome({
                id: createLocalIncomeId(),
                title: payload.title.trim(),
                amount: payload.amount,
                currency: normalizeCurrency(payload.currency, activeUser?.currency),
                note: payload.note?.trim() || null,
                date: toIncomeDateTime(payload.date),
                userId: activeUser?.id || getGuestUserId(),
                createdAt: nowIso,
                updatedAt: nowIso,
            });

            return state.addIncome(income);
        }

        const { data } = await apiClient.post('/incomes', payload);
        return normalizeIncome(data);
    },

    update: async (id: string, payload: UpdateIncomePayload) => {
        if (isLocalMode()) {
            const state = ensureGuestDataHydrated();
            const updated = state.updateIncome(id, (income) =>
                normalizeIncome({
                    ...income,
                    ...payload,
                    title:
                        payload.title !== undefined ? payload.title.trim() : income.title,
                    note:
                        payload.note !== undefined
                            ? payload.note.trim() || null
                            : income.note,
                    date:
                        payload.date !== undefined
                            ? toIncomeDateTime(payload.date)
                            : income.date,
                    updatedAt: new Date().toISOString(),
                }),
            );

            if (!updated) {
                throw new Error('Income not found');
            }

            return updated;
        }

        const { data } = await apiClient.patch(`/incomes/${id}`, payload);
        return normalizeIncome(data);
    },

    remove: async (id: string) => {
        if (isLocalMode()) {
            const state = ensureGuestDataHydrated();
            state.removeIncome(id);
            return { success: true };
        }

        const { data } = await apiClient.delete(`/incomes/${id}`);
        return data;
    },
};
