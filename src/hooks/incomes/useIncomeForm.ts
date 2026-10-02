import { useCallback, useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppAlert } from '../../components/alerts/AlertProvider';
import { incomesApi } from '../../api/resources/incomes';
import { CreateIncomePayload, Income, UpdateIncomePayload } from '../../types/index';
import { DEFAULT_CURRENCY, normalizeCurrency } from '../../utils/domain/currency';
import { useAuthStore } from '../../store/authStore';
import { extractApiMessage, getApiErrorData } from '../../utils/platform/api';
import { MAX_COST_LABEL, MAX_COST_VALUE } from '../../utils/platform/moneyInput';
import { todayISO } from '../../utils/core/format';
import { useI18n } from '../shared/useI18n';

type IncomeFormField = 'title' | 'amount' | 'currency' | 'date';
type IncomeFormErrors = Partial<Record<IncomeFormField, string>>;

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
    const [validationErrors, setValidationErrors] = useState<IncomeFormErrors>({});

    const clearValidationError = useCallback((field: IncomeFormField) => {
        setValidationErrors((current) => {
            if (!current[field]) {
                return current;
            }

            return { ...current, [field]: undefined };
        });
    }, []);

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
        onError: (err: unknown) => {
            alert(
                t('common.error'),
                extractApiMessage(getApiErrorData(err)) || t('income.failedCreate'),
            );
        },
    });

    const updateMutation = useMutation({
        mutationFn: (payload: UpdateIncomePayload) =>
            incomesApi.update(editingIncome!.id, payload),
        onSuccess: async () => {
            await invalidateIncomeQueries(editingIncome?.id);
        },
        onError: (err: unknown) => {
            alert(
                t('common.error'),
                extractApiMessage(getApiErrorData(err)) || t('income.failedUpdate'),
            );
        },
    });

    const saveIncome = async (onSuccess: () => void) => {
        const parsedAmount = Number.parseFloat(amount);
        const nextErrors: IncomeFormErrors = {};

        if (!title.trim()) {
            nextErrors.title = t('income.enterTitle');
        }
        if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
            nextErrors.amount = t('income.enterAmount');
        } else if (parsedAmount > MAX_COST_VALUE) {
            nextErrors.amount = t('common.maxAmountExceeded', { max: MAX_COST_LABEL });
        }
        if (!currency) {
            nextErrors.currency = t('income.chooseCurrency');
        }
        if (!date) {
            nextErrors.date = t('income.chooseDate');
        }

        const firstInvalidField = (Object.keys(nextErrors) as IncomeFormField[])[0];
        if (firstInvalidField) {
            setValidationErrors(nextErrors);
            return { valid: false as const, firstInvalidField };
        }

        setValidationErrors({});

        const payload = {
            title: title.trim(),
            amount: parsedAmount,
            currency,
            note: note.trim() || undefined,
            date,
        };

        if (editingIncome?.id) {
            updateMutation.mutate(payload, { onSuccess });
            return { valid: true as const };
        }

        createMutation.mutate(payload, { onSuccess });
        return { valid: true as const };
    };

    const resetForm = () => {
        setTitle('');
        setAmount('');
        setCurrency(userCurrency);
        setNote('');
        setDate(todayISO());
        setValidationErrors({});
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
        validationErrors,
        clearValidationError,
        resetForm,
        isPending: createMutation.isPending || updateMutation.isPending,
        isEditMode: Boolean(editingIncome?.id),
    };
}
