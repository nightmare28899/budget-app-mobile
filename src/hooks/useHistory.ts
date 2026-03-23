import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { historyApi } from '../api/history';
import { formatCurrency } from '../utils/format';
import { dateOnly, isValidDateFilter } from '../utils/filters';
import { Expense, Subscription } from '../types';
import { useI18n } from './useI18n';
import { toNum } from '../utils/number';

type HistoryRecord =
    | {
        id: string;
        kind: 'expense';
        dateKey: string;
        amount: number;
        expense: Expense;
    }
    | {
        id: string;
        kind: 'subscription';
        dateKey: string;
        amount: number;
        subscription: Subscription;
    };

type HistorySection = {
    date: string;
    title: string;
    total: number;
    data: HistoryRecord[];
};

type CategoryOption = {
    id: string;
    name: string;
    type: 'category' | 'subscription';
};

const AUTO_MARKERS = /\b(auto|automatic|subscription|suscripcion)\b/g;

function normalizeName(value: string | null | undefined): string {
    return String(value ?? '')
        .trim()
        .toLowerCase()
        .replace(AUTO_MARKERS, '')
        .replace(/\s+/g, ' ');
}

function amountMatches(a: number, b: number): boolean {
    return Math.abs(toNum(a) - toNum(b)) < 0.01;
}

function dateFromSubscription(subscription: Subscription): string {
    return dateOnly(subscription.chargeDate || subscription.nextPaymentDate);
}

function subscriptionIdFromExpense(expense: Expense): string | null {
    const raw = (expense as any)?.subscriptionId;
    return typeof raw === 'string' && raw.trim().length ? raw : null;
}

function matchesSubscriptionExpense(
    expense: Expense,
    subscription: Subscription,
    options?: { requireSameDate?: boolean },
): boolean {
    if (!expense.isSubscription) {
        return false;
    }

    const expenseSubscriptionId = subscriptionIdFromExpense(expense);
    if (expenseSubscriptionId && expenseSubscriptionId === subscription.id) {
        return true;
    }

    if (options?.requireSameDate !== false
        && dateOnly(expense.date) !== dateFromSubscription(subscription)
    ) {
        return false;
    }

    if (!amountMatches(expense.cost, subscription.cost)) {
        return false;
    }

    const expenseName = normalizeName(expense.title);
    const subscriptionName = normalizeName(subscription.name);

    if (!expenseName || !subscriptionName) {
        return false;
    }

    return (
        expenseName === subscriptionName
        || expenseName.includes(subscriptionName)
        || subscriptionName.includes(expenseName)
    );
}

function toTimestamp(record: HistoryRecord): number {
    if (record.kind === 'expense') {
        return new Date(record.expense.date).getTime();
    }

    return new Date(record.subscription.chargeDate || record.subscription.nextPaymentDate).getTime();
}

type UseHistoryParams = {
    successMessage?: string;
    onSuccessHandled: () => void;
    currency?: string;
};

export function useHistory({ successMessage, onSuccessHandled, currency }: UseHistoryParams) {
    const { t, language } = useI18n();

    const [selectedCategoryId, setSelectedCategoryId] = useState('all');
    const [dateFilter, setDateFilter] = useState('');

    const { data, isLoading, refetch, isRefetching } = useQuery({
        queryKey: ['history', 'all'],
        queryFn: historyApi.getAll,
    });

    useEffect(() => {
        if (!successMessage) {
            return;
        }

        setSelectedCategoryId('all');
        setDateFilter('');
        refetch();
        onSuccessHandled();
    }, [onSuccessHandled, refetch, successMessage]);

    const validDateFilter = isValidDateFilter(dateFilter) ? dateFilter : '';
    const todayKey = dateOnly(new Date());
    const selectedCategoryFilter = selectedCategoryId.startsWith('cat:')
        ? selectedCategoryId.slice(4)
        : null;
    const selectedSubscriptionFilter = selectedCategoryId.startsWith('sub:')
        ? selectedCategoryId.slice(4)
        : null;
    const selectedSubscription = useMemo(
        () =>
            selectedSubscriptionFilter
                ? (data?.subscriptions ?? []).find((item) => item.id === selectedSubscriptionFilter) ?? null
                : null,
        [data?.subscriptions, selectedSubscriptionFilter],
    );

    const categoryOptions = useMemo<CategoryOption[]>(() => {
        const categoryMap = new Map<string, string>();
        for (const expense of data?.expenses ?? []) {
            const id = expense.categoryId ?? expense.category?.id;
            if (!id || categoryMap.has(id)) {
                continue;
            }
            categoryMap.set(id, expense.category?.name ?? t('expenseDetail.uncategorized'));
        }

        const subscriptionMap = new Map<string, string>();
        for (const subscription of data?.subscriptions ?? []) {
            if (!subscription.id || subscriptionMap.has(subscription.id)) {
                continue;
            }
            subscriptionMap.set(subscription.id, subscription.name);
        }

        const categoryOptions = Array.from(categoryMap.entries())
            .map(([id, name]) => ({ id: `cat:${id}`, name, type: 'category' as const }))
            .sort((a, b) => a.name.localeCompare(b.name));

        const subscriptionOptions = Array.from(subscriptionMap.entries())
            .map(([id, name]) => ({ id: `sub:${id}`, name, type: 'subscription' as const }))
            .sort((a, b) => a.name.localeCompare(b.name));

        const merged = [...categoryOptions, ...subscriptionOptions];
        const nameCounts = new Map<string, number>();
        for (const option of merged) {
            const key = normalizeName(option.name);
            nameCounts.set(key, (nameCounts.get(key) ?? 0) + 1);
        }

        return merged.map((option) => {
            const key = normalizeName(option.name);
            if ((nameCounts.get(key) ?? 0) <= 1) {
                return option;
            }

            return {
                ...option,
                name: option.type === 'subscription'
                    ? `${option.name} • ${t('history.subscriptionBadge')}`
                    : `${option.name} • ${t('filters.category')}`,
            };
        });
    }, [data?.expenses, data?.subscriptions, t]);

    const filteredExpenses = useMemo(() => {
        const source = data?.expenses ?? [];
        return source
            .filter((expense) => {
                const categoryId = expense.categoryId ?? expense.category?.id;
                const categoryMatch =
                    selectedCategoryId === 'all'
                    || (selectedCategoryFilter ? categoryId === selectedCategoryFilter : false)
                    || (
                        selectedSubscriptionFilter
                            ? (
                                selectedSubscription
                                    ? matchesSubscriptionExpense(expense, selectedSubscription, {
                                        requireSameDate: false,
                                    })
                                    : expense.isSubscription === true
                            )
                            : false
                    );
                const dateMatch =
                    !validDateFilter || dateOnly(expense.date) === validDateFilter;

                return categoryMatch && dateMatch;
            })
            .sort(
                (a, b) =>
                    new Date(b.date).getTime() - new Date(a.date).getTime(),
            );
    }, [
        data?.expenses,
        selectedCategoryFilter,
        selectedCategoryId,
        selectedSubscription,
        selectedSubscriptionFilter,
        validDateFilter,
    ]);

    const filteredSubscriptions = useMemo(() => {
        if (selectedCategoryFilter) {
            return [];
        }

        const subscriptionExpenses = filteredExpenses.filter((expense) => expense.isSubscription);
        const source = data?.subscriptions ?? [];
        return source
            .filter((subscription) => {
                const rawDate =
                    subscription.chargeDate || subscription.nextPaymentDate;
                const matchesDate = !validDateFilter || dateOnly(rawDate) === validDateFilter;
                const matchesSelectedSubscription =
                    !selectedSubscriptionFilter || subscription.id === selectedSubscriptionFilter;
                const duplicatedByExpense = subscriptionExpenses.some((expense) =>
                    matchesSubscriptionExpense(expense, subscription),
                );

                return matchesDate && matchesSelectedSubscription && !duplicatedByExpense;
            })
            .sort(
                (a, b) =>
                    new Date(b.nextPaymentDate).getTime() -
                    new Date(a.nextPaymentDate).getTime(),
            );
    }, [
        data?.subscriptions,
        filteredExpenses,
        selectedCategoryFilter,
        selectedSubscriptionFilter,
        validDateFilter,
    ]);

    const records = useMemo<HistoryRecord[]>(() => {
        const expenseRecords: HistoryRecord[] = filteredExpenses.map((expense) => ({
            id: `expense-${expense.id}`,
            kind: 'expense',
            dateKey: dateOnly(expense.date),
            amount: Number(expense.cost) || 0,
            expense,
        }));

        const subscriptionRecords: HistoryRecord[] = filteredSubscriptions.map(
            (subscription) => ({
                id: `subscription-${subscription.id}`,
                kind: 'subscription',
                dateKey: dateOnly(subscription.chargeDate || subscription.nextPaymentDate),
                amount: Number(subscription.cost) || 0,
                subscription,
            }),
        );

        return [...expenseRecords, ...subscriptionRecords].sort((a, b) => {
            if (a.dateKey !== b.dateKey) {
                return b.dateKey.localeCompare(a.dateKey);
            }

            return toTimestamp(b) - toTimestamp(a);
        });
    }, [filteredExpenses, filteredSubscriptions]);

    const sections = useMemo<HistorySection[]>(() => {
        const grouped = records.reduce<Record<string, HistoryRecord[]>>(
            (acc, item) => {
                if (!acc[item.dateKey]) {
                    acc[item.dateKey] = [];
                }
                acc[item.dateKey].push(item);
                return acc;
            },
            {},
        );

        return Object.entries(grouped)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([date, items]) => {
                const dateObj = new Date(`${date}T00:00:00`);
                const locale = language === 'es' ? 'es-MX' : 'en-US';
                const dayAndMonth = dateObj.toLocaleDateString(locale, {
                    day: 'numeric',
                    month: 'long',
                });
                const weekday = dateObj.toLocaleDateString(locale, {
                    weekday: 'long',
                });
                const displayDate =
                    date === todayKey
                        ? `${t('history.todayLabel')}, ${dayAndMonth}`
                        : `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${dayAndMonth}`;

                return {
                    date,
                    title: displayDate,
                    total: items.reduce((sum, item) => sum + item.amount, 0),
                    data: items,
                };
            });
    }, [language, records, t, todayKey]);

    const summaryCount = records.length;
    const summaryTotal = records.reduce((sum, item) => sum + item.amount, 0);
    const summaryText = t('history.subtitle', {
        count: summaryCount,
        total: formatCurrency(summaryTotal, currency),
    });
    const showSkeleton = (isLoading || isRefetching) && !data;

    return {
        selectedCategoryId,
        setSelectedCategoryId,
        dateFilter,
        setDateFilter,
        validDateFilter,
        categoryOptions,
        sections,
        records,
        isLoading,
        isRefetching,
        refetch,
        summaryText,
        showSkeleton,
    };
}

export type { HistoryRecord, HistorySection };
