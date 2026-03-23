import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppAlert } from '../components/alerts/AlertProvider';
import { ExpenseUploadImage, expensesApi } from '../api/expenses';
import { categoriesApi } from '../api/categories';
import { extractApiMessage } from '../utils/api';
import { CreateExpensePayload, UpdateExpensePayload } from '../types';
import { useI18n } from './useI18n';
import { MAX_COST_LABEL, MAX_COST_VALUE } from '../utils/moneyInput';
import { todayISO } from '../utils/format';

export function useExpenseForm(expenseId?: string) {
    const queryClient = useQueryClient();
    const { alert } = useAppAlert();
    const { t } = useI18n();

    const [title, setTitle] = useState('');
    const [cost, setCost] = useState('');
    const [note, setNote] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<string | undefined>();
    const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
    const [date, setDate] = useState(todayISO());
    const [hasLoaded, setHasLoaded] = useState(false);

    const { data: expense, isLoading: expenseLoading } = useQuery({
        queryKey: ['expense', expenseId],
        queryFn: () => expensesApi.getOne(expenseId!),
        enabled: !!expenseId,
    });

    useEffect(() => {
        if (expense && expenseId && !hasLoaded) {
            setTitle(expense.title);
            setCost(expense.cost.toString());
            setNote(expense.note || '');
            if (expense.categoryId) {
                setSelectedCategory(expense.categoryId);
            }
            if (expense.paymentMethod) {
                setPaymentMethod(expense.paymentMethod);
            }
            if (expense.date) {
                setDate(expense.date.slice(0, 10));
            }
            setHasLoaded(true);
        }
    }, [expense, expenseId, hasLoaded]);

    const { data: categories = [], isLoading: categoriesLoading } = useQuery({
        queryKey: ['categories'],
        queryFn: categoriesApi.getAll,
    });

    const createMutation = useMutation({
        mutationFn: ({
            payload,
            image,
        }: {
            payload: CreateExpensePayload;
            image?: ExpenseUploadImage | null;
        }) => expensesApi.create(payload, image),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            queryClient.invalidateQueries({ queryKey: ['analytics'] });
            queryClient.invalidateQueries({ queryKey: ['history'] });
        },
        onError: (err: any) => {
            alert(
                t('common.error'),
                extractApiMessage(err?.response?.data) || t('expense.failedSave'),
            );
        },
    });

    const updateMutation = useMutation({
        mutationFn: (payload: UpdateExpensePayload) => expensesApi.update(expenseId!, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            queryClient.invalidateQueries({ queryKey: ['expense', expenseId] });
            queryClient.invalidateQueries({ queryKey: ['analytics'] });
            queryClient.invalidateQueries({ queryKey: ['history'] });
        },
        onError: (err: any) => {
            alert(
                t('common.error'),
                extractApiMessage(err?.response?.data) || t('expense.failedUpdate'),
            );
        },
    });

    const isPending = createMutation.isPending || updateMutation.isPending;

    const saveExpense = async (
        onSuccessCallback: () => void,
        options?: { image?: ExpenseUploadImage | null },
    ) => {
        const parsedCost = parseFloat(cost);

        if (!title.trim()) {
            alert(t('common.error'), t('expense.enterTitle'));
            return;
        }
        if (!cost || Number.isNaN(parsedCost) || parsedCost <= 0) {
            alert(t('common.error'), t('expense.enterAmount'));
            return;
        }
        if (parsedCost > MAX_COST_VALUE) {
            alert(
                t('common.error'),
                t('common.maxAmountExceeded', { max: MAX_COST_LABEL }),
            );
            return;
        }
        if (!selectedCategory) {
            alert(t('common.error'), t('expense.chooseCategory'));
            return;
        }

        const payload = {
            title: title.trim(),
            cost: parsedCost,
            note: note.trim() || undefined,
            paymentMethod: paymentMethod || undefined,
            categoryId: selectedCategory,
            date: date || todayISO(),
        };

        if (expenseId) {
            updateMutation.mutate(payload, { onSuccess: onSuccessCallback });
        } else {
            createMutation.mutate(
                { payload, image: options?.image },
                { onSuccess: onSuccessCallback },
            );
        }
    };

    const resetForm = () => {
        setTitle('');
        setCost('');
        setNote('');
        setPaymentMethod(undefined);
        setSelectedCategory(undefined);
        setDate(todayISO());
    };

    return {
        title, setTitle,
        cost, setCost,
        note, setNote,
        paymentMethod, setPaymentMethod,
        selectedCategory, setSelectedCategory,
        date, setDate,
        hasLoaded, setHasLoaded,
        expense, expenseLoading,
        categories, categoriesLoading,
        saveExpense,
        isPending,
        resetForm,
    };
}
