import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppAlert } from '../components/alerts/AlertProvider';
import { ExpenseUploadImage, expensesApi } from '../api/expenses';
import { categoriesApi } from '../api/categories';
import { creditCardsApi } from '../api/creditCards';
import { useAuthStore } from '../store/authStore';
import { extractApiMessage, extractPremiumRequiredError } from '../utils/api';
import { CreateExpensePayload, UpdateExpensePayload } from '../types';
import { DEFAULT_CURRENCY, normalizeCurrency } from '../utils/currency';
import { useI18n } from './useI18n';
import { MAX_COST_LABEL, MAX_COST_VALUE } from '../utils/moneyInput';
import { todayISO } from '../utils/format';
import { isCreditCardPaymentMethod, normalizePaymentMethod } from '../utils/paymentMethod';
import {
    DEFAULT_INSTALLMENT_FREQUENCY,
    getInstallmentBreakdown,
} from '../utils/installments';

export function useExpenseForm(expenseId?: string) {
    const queryClient = useQueryClient();
    const { alert } = useAppAlert();
    const { t } = useI18n();
    const user = useAuthStore((s) => s.user);
    const userCurrency = normalizeCurrency(user?.currency, DEFAULT_CURRENCY);

    const handleMutationError = (payload: unknown, fallbackMessage: string) => {
        const premiumError = extractPremiumRequiredError(payload);
        if (premiumError) {
            return;
        }

        alert(
            t('common.error'),
            extractApiMessage(payload) || fallbackMessage,
        );
    };

    const [title, setTitle] = useState('');
    const [cost, setCost] = useState('');
    const [currency, setCurrency] = useState(userCurrency);
    const [isInstallment, setIsInstallment] = useState(false);
    const [installmentCount, setInstallmentCount] = useState('');
    const [firstPaymentDate, setFirstPaymentDate] = useState(todayISO());
    const [note, setNote] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<string | undefined>();
    const [selectedCreditCardId, setSelectedCreditCardId] = useState<string | undefined>();
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
            setIsInstallment(expense.isInstallment === true);
            setCost(
                expense.isInstallment
                    ? String(expense.installmentTotalAmount ?? expense.cost)
                    : expense.cost.toString(),
            );
            setCurrency(normalizeCurrency(expense.currency, userCurrency));
            setInstallmentCount(
                expense.isInstallment && expense.installmentCount
                    ? String(expense.installmentCount)
                    : '',
            );
            setNote(expense.note || '');
            if (expense.categoryId) {
                setSelectedCategory(expense.categoryId);
            }
            if (expense.paymentMethod) {
                setPaymentMethod(expense.paymentMethod);
            }
            setSelectedCreditCardId(
                expense.creditCardId ?? expense.creditCard?.id ?? undefined,
            );
            const purchaseDate =
                expense.isInstallment
                    ? (expense.installmentPurchaseDate ?? expense.date)
                    : expense.date;
            const nextFirstPaymentDate =
                expense.isInstallment
                    ? (expense.installmentFirstPaymentDate ?? expense.date)
                    : expense.date;
            if (purchaseDate) {
                setDate(purchaseDate.slice(0, 10));
            }
            if (nextFirstPaymentDate) {
                setFirstPaymentDate(nextFirstPaymentDate.slice(0, 10));
            }
            setHasLoaded(true);
        }
    }, [expense, expenseId, hasLoaded, userCurrency]);

    useEffect(() => {
        if (!expenseId) {
            setCurrency(userCurrency);
        }
    }, [expenseId, userCurrency]);

    useEffect(() => {
        if (!isInstallment) {
            setFirstPaymentDate(date);
        }
    }, [date, isInstallment]);

    const { data: categories = [], isLoading: categoriesLoading } = useQuery({
        queryKey: ['categories'],
        queryFn: categoriesApi.getAll,
    });

    const includeInactiveCards = Boolean(expenseId);
    const shouldLoadCreditCards =
        isCreditCardPaymentMethod(paymentMethod) || Boolean(selectedCreditCardId);
    const { data: creditCards = [], isLoading: creditCardsLoading } = useQuery({
        queryKey: ['creditCards', includeInactiveCards ? 'all' : 'active'],
        queryFn: () => creditCardsApi.getAll({ includeInactive: includeInactiveCards }),
        enabled: shouldLoadCreditCards,
    });

    const selectableCreditCards = useMemo(
        () =>
            creditCards.filter((card) => card.isActive || card.id === selectedCreditCardId),
        [creditCards, selectedCreditCardId],
    );

    useEffect(() => {
        if (!isCreditCardPaymentMethod(paymentMethod)) {
            if (selectedCreditCardId) {
                setSelectedCreditCardId(undefined);
            }
            return;
        }

        if (!selectedCreditCardId && selectableCreditCards.length === 1) {
            setSelectedCreditCardId(selectableCreditCards[0].id);
        }
    }, [paymentMethod, selectableCreditCards, selectedCreditCardId]);

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
            queryClient.invalidateQueries({ queryKey: ['income-summary'] });
        },
        onError: (err: any) => {
            handleMutationError(err?.response?.data, t('expense.failedSave'));
        },
    });

    const updateMutation = useMutation({
        mutationFn: (payload: UpdateExpensePayload) => expensesApi.update(expenseId!, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            queryClient.invalidateQueries({ queryKey: ['expense', expenseId] });
            queryClient.invalidateQueries({ queryKey: ['analytics'] });
            queryClient.invalidateQueries({ queryKey: ['history'] });
            queryClient.invalidateQueries({ queryKey: ['income-summary'] });
        },
        onError: (err: any) => {
            handleMutationError(err?.response?.data, t('expense.failedUpdate'));
        },
    });

    const isPending = createMutation.isPending || updateMutation.isPending;
    const parsedInstallmentCount = Number.parseInt(installmentCount, 10);
    const installmentBreakdown = useMemo(() => {
        const parsedCost = Number.parseFloat(cost);

        if (!isInstallment || !Number.isFinite(parsedCost) || parsedCost <= 0) {
            return getInstallmentBreakdown(0, 0);
        }

        return getInstallmentBreakdown(
            parsedCost,
            Number.isFinite(parsedInstallmentCount) ? parsedInstallmentCount : 0,
        );
    }, [cost, isInstallment, parsedInstallmentCount]);

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
        if (!currency) {
            alert(t('common.error'), t('expense.chooseCurrency'));
            return;
        }
        if (isInstallment) {
            if (!Number.isFinite(parsedInstallmentCount) || parsedInstallmentCount <= 1) {
                alert(t('common.error'), t('expense.enterInstallmentCount'));
                return;
            }
            if (!firstPaymentDate) {
                alert(t('common.error'), t('expense.enterFirstPaymentDate'));
                return;
            }
            if (firstPaymentDate < date) {
                alert(t('common.error'), t('expense.invalidFirstPaymentDate'));
                return;
            }
        }
        if (isCreditCardPaymentMethod(paymentMethod) && !selectedCreditCardId) {
            alert(t('common.error'), t('creditCards.validationRequired'));
            return;
        }

        const payload = {
            title: title.trim(),
            cost: parsedCost,
            currency,
            isInstallment,
            installmentCount: isInstallment ? parsedInstallmentCount : undefined,
            installmentFrequency: isInstallment
                ? DEFAULT_INSTALLMENT_FREQUENCY
                : undefined,
            installmentPurchaseDate: isInstallment ? date : undefined,
            installmentFirstPaymentDate: isInstallment ? firstPaymentDate : undefined,
            note: note.trim() || undefined,
            paymentMethod: normalizePaymentMethod(paymentMethod),
            creditCardId: isCreditCardPaymentMethod(paymentMethod)
                ? selectedCreditCardId
                : null,
            categoryId: selectedCategory,
            date: isInstallment
                ? (firstPaymentDate || date || todayISO())
                : (date || todayISO()),
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
        setCurrency(userCurrency);
        setIsInstallment(false);
        setInstallmentCount('');
        setFirstPaymentDate(todayISO());
        setNote('');
        setPaymentMethod(undefined);
        setSelectedCreditCardId(undefined);
        setSelectedCategory(undefined);
        setDate(todayISO());
    };

    return {
        title, setTitle,
        cost, setCost,
        currency, setCurrency,
        isInstallment, setIsInstallment,
        installmentCount, setInstallmentCount,
        firstPaymentDate, setFirstPaymentDate,
        installmentBreakdown,
        note, setNote,
        paymentMethod, setPaymentMethod,
        selectedCreditCardId, setSelectedCreditCardId,
        selectedCategory, setSelectedCategory,
        date, setDate,
        hasLoaded, setHasLoaded,
        expense, expenseLoading,
        categories, categoriesLoading,
        creditCards: selectableCreditCards, creditCardsLoading,
        saveExpense,
        isPending,
        resetForm,
    };
}
