import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppAlert } from '../components/alerts/AlertProvider';
import { incomesApi } from '../api/incomes';
import { CreateIncomePayload, Income, UpdateIncomePayload } from '../types';
import { DEFAULT_CURRENCY, normalizeCurrency } from '../utils/currency';
import { useAuthStore } from '../store/authStore';
import { extractApiMessage } from '../utils/api';
import { MAX_COST_LABEL, MAX_COST_VALUE } from '../utils/moneyInput';
import { todayISO } from '../utils/format';
import { useI18n } from './useI18n';

export function useIncomeForm(editingIncome?: Income | null) {
    const queryClient = useQueryClient();
    const { alert } = useAppAlert();
    const { t } = useI18n();
    const user = useAuthStore((s) => s.user);
    const userCurrency = normalizeCurrency(user?.currency, DEFAULT_CURRENCY);
    const [title, setTitle] = useState(editingIncome?.title ?? '');
    const [amount, setAmount] = useState(
        editingIncome ? String(editingIncome.amount) : '',
    );
    const [currency, setCurrency] = useState(
        normalizeCurrency(editingIncome?.currency, userCurrency),
    );
    const [note, setNote] = useState(editingIncome?.note ?? '');
    const [date, setDate] = useState(
        editingIncome?.date?.slice(0, 10) ?? todayISO(),
    );

    useEffect(() => {
        if (!editingIncome) {
            setCurrency(userCurrency);
            return;
        }

        setTitle(editingIncome.title);
        setAmount(String(editingIncome.amount));
        setCurrency(normalizeCurrency(editingIncome.currency, userCurrency));
        setNote(editingIncome.note ?? '');
        setDate(editingIncome.date.slice(0, 10));
    }, [editingIncome, userCurrency]);

    const invalidateIncomeQueries = async (incomeId?: string) => {
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['incomes'] }),
            queryClient.invalidateQueries({ queryKey: ['income-summary'] }),
            queryClient.invalidateQueries({ queryKey: ['analytics'] }),
            incomeId
                ? queryClient.invalidateQueries({ queryKey: ['income', incomeId] })
                : Promise.resolve(),
        ]);
    };

    const createMutation = useMutation({
        mutationFn: (payload: CreateIncomePayload) => incomesApi.create(payload),
        onSuccess: async () => {
            await invalidateIncomeQueries();
        },
        onError: (err: any) => {
            alert(
                t('common.error'),
                extractApiMessage(err?.response?.data) || t('income.failedCreate'),
            );
        },
    });

    const updateMutation = useMutation({
        mutationFn: (payload: UpdateIncomePayload) =>
            incomesApi.update(editingIncome!.id, payload),
        onSuccess: async () => {
            await invalidateIncomeQueries(editingIncome?.id);
        },
        onError: (err: any) => {
            alert(
                t('common.error'),
                extractApiMessage(err?.response?.data) || t('income.failedUpdate'),
            );
        },
    });

    const saveIncome = async (onSuccess: () => void) => {
        const parsedAmount = Number.parseFloat(amount);

        if (!title.trim()) {
            alert(t('common.error'), t('income.enterTitle'));
            return;
        }
        if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
            alert(t('common.error'), t('income.enterAmount'));
            return;
        }
        if (parsedAmount > MAX_COST_VALUE) {
            alert(
                t('common.error'),
                t('common.maxAmountExceeded', { max: MAX_COST_LABEL }),
            );
            return;
        }
        if (!currency) {
            alert(t('common.error'), t('income.chooseCurrency'));
            return;
        }
        if (!date) {
            alert(t('common.error'), t('income.chooseDate'));
            return;
        }

        const payload = {
            title: title.trim(),
            amount: parsedAmount,
            currency,
            note: note.trim() || undefined,
            date,
        };

        if (editingIncome?.id) {
            updateMutation.mutate(payload, { onSuccess });
            return;
        }

        createMutation.mutate(payload, { onSuccess });
    };

    const resetForm = () => {
        setTitle('');
        setAmount('');
        setCurrency(userCurrency);
        setNote('');
        setDate(todayISO());
    };

    return {
        title,
        setTitle,
        amount,
        setAmount,
        currency,
        setCurrency,
        note,
        setNote,
        date,
        setDate,
        saveIncome,
        resetForm,
        isPending: createMutation.isPending || updateMutation.isPending,
        isEditMode: Boolean(editingIncome?.id),
    };
}
