import { NativeModules, Platform } from 'react-native';
import { AppLanguage } from '../../i18n/index';
import { formatCurrency } from '../core/format';
import { getCurrencyLocale } from '../domain/currency';

export type AndroidBudgetWidgetState = 'loading' | 'empty' | 'error' | 'data';
export type AndroidBudgetWidgetTone = 'safe' | 'warning' | 'danger' | 'neutral';

export type AndroidBudgetWidgetSnapshot = {
    state: AndroidBudgetWidgetState;
    language: AppLanguage;
    title: string;
    value: string;
    meta: string;
    statusLabel: string;
    periodLabel: string;
    spentLabel: string;
    spentValue: string;
    budgetLabel: string;
    budgetValue: string;
    percentage: number;
    tone: AndroidBudgetWidgetTone;
    isSyncing: boolean;
    contentDescription: string;
};

type AndroidBudgetWidgetInput = {
    language: AppLanguage;
    isLoading: boolean;
    isSyncing?: boolean;
    hasError: boolean;
    budget: number;
    spent: number;
    safeToSpend: number;
    periodLabel?: string;
    currency?: string;
};

type BudgetWidgetNativeModule = {
    updateSnapshot: (snapshot: AndroidBudgetWidgetSnapshot) => void;
    clearSnapshot: () => void;
};

const copy = {
    en: {
        loadingTitle: 'Loading summary',
        loadingMeta: 'Open BudgetApp to finish syncing.',
        emptyTitle: 'No budget yet',
        emptyMeta: 'Open BudgetApp to set your budget.',
        errorTitle: 'Summary unavailable',
        errorMeta: 'Open BudgetApp to try again.',
        safeToSpend: 'Safe to spend',
        spent: 'Spent',
        budget: 'Budget',
        spentOfBudget: (spent: string, budget: string) => `Spent ${spent} of ${budget}`,
        used: (percentage: number) => `${percentage}% used`,
    },
    es: {
        loadingTitle: 'Cargando resumen',
        loadingMeta: 'Abre BudgetApp para terminar de sincronizar.',
        emptyTitle: 'Aún no hay presupuesto',
        emptyMeta: 'Abre BudgetApp para configurar tu presupuesto.',
        errorTitle: 'Resumen no disponible',
        errorMeta: 'Abre BudgetApp para intentarlo de nuevo.',
        safeToSpend: 'Disponible para gastar',
        spent: 'Gastado',
        budget: 'Presupuesto',
        spentOfBudget: (spent: string, budget: string) => `Gastado ${spent} de ${budget}`,
        used: (percentage: number) => `${percentage}% usado`,
    },
} as const;

function stateSnapshot(
    state: Exclude<AndroidBudgetWidgetState, 'data'>,
    language: AppLanguage,
    title: string,
    meta: string,
): AndroidBudgetWidgetSnapshot {
    return {
        state,
        language,
        title,
        value: '—',
        meta,
        statusLabel: '',
        periodLabel: '',
        spentLabel: '',
        spentValue: '',
        budgetLabel: '',
        budgetValue: '',
        percentage: 0,
        tone: 'neutral',
        isSyncing: state === 'loading',
        contentDescription: `${title}. ${meta}`,
    };
}

export function createAndroidBudgetWidgetSnapshot({
    language,
    isLoading,
    isSyncing = false,
    hasError,
    budget,
    spent,
    safeToSpend,
    periodLabel = '',
    currency,
}: AndroidBudgetWidgetInput): AndroidBudgetWidgetSnapshot {
    const labels = copy[language];

    if (isLoading) {
        return stateSnapshot('loading', language, labels.loadingTitle, labels.loadingMeta);
    }

    if (hasError) {
        return stateSnapshot('error', language, labels.errorTitle, labels.errorMeta);
    }

    if (budget <= 0) {
        return stateSnapshot('empty', language, labels.emptyTitle, labels.emptyMeta);
    }

    const rawPercentage = Math.round((spent / budget) * 100);
    const percentage = Math.min(Math.max(rawPercentage, 0), 100);
    const tone: AndroidBudgetWidgetTone = rawPercentage > 100
        ? 'danger'
        : rawPercentage >= 80
            ? 'warning'
            : 'safe';
    const locale = getCurrencyLocale(language);
    const safeValue = formatCurrency(safeToSpend, currency, locale);
    const spentValue = formatCurrency(spent, currency, locale);
    const budgetValue = formatCurrency(budget, currency, locale);
    const statusLabel = labels.used(Math.max(rawPercentage, 0));

    return {
        state: 'data',
        language,
        title: labels.safeToSpend,
        value: safeValue,
        meta: labels.spentOfBudget(spentValue, budgetValue),
        statusLabel,
        periodLabel,
        spentLabel: labels.spent,
        spentValue,
        budgetLabel: labels.budget,
        budgetValue,
        percentage,
        tone,
        isSyncing,
        contentDescription: `${labels.safeToSpend}: ${safeValue}. ${labels.spentOfBudget(
            spentValue,
            budgetValue,
        )}. ${statusLabel}.`,
    };
}

function getNativeModule(): BudgetWidgetNativeModule | undefined {
    return NativeModules.BudgetWidget as BudgetWidgetNativeModule | undefined;
}

export function syncAndroidBudgetWidget(snapshot: AndroidBudgetWidgetSnapshot): void {
    if (Platform.OS !== 'android') {
        return;
    }

    try {
        getNativeModule()?.updateSnapshot(snapshot);
    } catch {
        // The widget must never interrupt the app experience.
    }
}

export function clearAndroidBudgetWidget(): void {
    if (Platform.OS !== 'android') {
        return;
    }

    try {
        getNativeModule()?.clearSnapshot();
    } catch {
        // Clearing launcher data is best-effort and must not block logout.
    }
}
