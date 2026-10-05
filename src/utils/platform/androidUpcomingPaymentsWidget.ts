import { NativeModules, Platform } from 'react-native';
import { AppLanguage } from '../../i18n/index';
import { UpcomingSubscriptionCharge } from '../../types/index';
import { formatCurrency } from '../core/format';
import { getCurrencyLocale, normalizeCurrency } from '../domain/currency';

export type AndroidUpcomingPaymentsWidgetState = 'loading' | 'empty' | 'error' | 'data';

export type AndroidUpcomingPaymentsWidgetSnapshot = {
    state: AndroidUpcomingPaymentsWidgetState;
    language: AppLanguage;
    title: string;
    nextName: string;
    nextAmount: string;
    nextTiming: string;
    countLabel: string;
    totalLabel: string;
    totalValue: string;
    isSyncing: boolean;
    contentDescription: string;
};

type AndroidUpcomingPaymentsWidgetInput = {
    language: AppLanguage;
    isLoading: boolean;
    isSyncing?: boolean;
    hasError: boolean;
    charges: readonly UpcomingSubscriptionCharge[];
    windowDays?: number;
    fallbackCurrency?: string;
};

type UpcomingPaymentsWidgetNativeModule = {
    updateUpcomingSnapshot: (snapshot: AndroidUpcomingPaymentsWidgetSnapshot) => void;
    clearSnapshot?: () => void;
};

const copy = {
    en: {
        title: 'Upcoming payments',
        loadingTitle: 'Loading upcoming payments',
        loadingMeta: 'Open BudgetApp to finish syncing.',
        emptyTitle: 'No payments soon',
        emptyMeta: (days: number) => `No subscription charges in the next ${days} days.`,
        errorTitle: 'Payments unavailable',
        errorMeta: 'Open BudgetApp to try again.',
        dueToday: 'Due today',
        dueTomorrow: 'Due tomorrow',
        dueIn: (days: number) => `Due in ${days} days`,
        count: (count: number, days: number) =>
            `${count} ${count === 1 ? 'payment' : 'payments'} in ${days} days`,
        total: (days: number) => `${days}-day total`,
    },
    es: {
        title: 'Próximos pagos',
        loadingTitle: 'Cargando próximos pagos',
        loadingMeta: 'Abre BudgetApp para terminar de sincronizar.',
        emptyTitle: 'No hay pagos cercanos',
        emptyMeta: (days: number) => `No hay cobros de suscripciones en los próximos ${days} días.`,
        errorTitle: 'Pagos no disponibles',
        errorMeta: 'Abre BudgetApp para intentarlo de nuevo.',
        dueToday: 'Vence hoy',
        dueTomorrow: 'Vence mañana',
        dueIn: (days: number) => `Vence en ${days} días`,
        count: (count: number, days: number) =>
            `${count} ${count === 1 ? 'pago' : 'pagos'} en ${days} días`,
        total: (days: number) => `Total de ${days} días`,
    },
} as const;

function stateSnapshot(
    state: Exclude<AndroidUpcomingPaymentsWidgetState, 'data'>,
    language: AppLanguage,
    title: string,
    meta: string,
): AndroidUpcomingPaymentsWidgetSnapshot {
    return {
        state,
        language,
        title,
        nextName: meta,
        nextAmount: '',
        nextTiming: '',
        countLabel: '',
        totalLabel: '',
        totalValue: '',
        isSyncing: state === 'loading',
        contentDescription: `${title}. ${meta}`,
    };
}

function timingLabel(language: AppLanguage, daysRemaining: number): string {
    const labels = copy[language];
    const days = Math.max(Math.round(daysRemaining), 0);

    if (days === 0) {
        return labels.dueToday;
    }

    if (days === 1) {
        return labels.dueTomorrow;
    }

    return labels.dueIn(days);
}

export function createAndroidUpcomingPaymentsWidgetSnapshot({
    language,
    isLoading,
    isSyncing = false,
    hasError,
    charges,
    windowDays = 7,
    fallbackCurrency,
}: AndroidUpcomingPaymentsWidgetInput): AndroidUpcomingPaymentsWidgetSnapshot {
    const labels = copy[language];

    if (isLoading) {
        return stateSnapshot('loading', language, labels.loadingTitle, labels.loadingMeta);
    }

    if (hasError) {
        return stateSnapshot('error', language, labels.errorTitle, labels.errorMeta);
    }

    if (!charges.length) {
        return stateSnapshot(
            'empty',
            language,
            labels.emptyTitle,
            labels.emptyMeta(windowDays),
        );
    }

    const sortedCharges = [...charges].sort((a, b) => a.daysRemaining - b.daysRemaining);
    const nextCharge = sortedCharges[0];
    const currencies = sortedCharges.map((charge) =>
        normalizeCurrency(charge.currency, fallbackCurrency),
    );
    const hasSingleCurrency = currencies.every((currency) => currency === currencies[0]);
    const locale = getCurrencyLocale(language);
    const nextAmount = formatCurrency(nextCharge.amount, currencies[0], locale);
    const nextTiming = timingLabel(language, nextCharge.daysRemaining);
    const countLabel = labels.count(sortedCharges.length, windowDays);
    const totalLabel = hasSingleCurrency ? labels.total(windowDays) : '';
    const totalValue = hasSingleCurrency
        ? formatCurrency(
            sortedCharges.reduce((total, charge) => total + charge.amount, 0),
            currencies[0],
            locale,
        )
        : '';
    const totalDescription = totalValue ? `. ${totalLabel}: ${totalValue}` : '';

    return {
        state: 'data',
        language,
        title: labels.title,
        nextName: nextCharge.name,
        nextAmount,
        nextTiming,
        countLabel,
        totalLabel,
        totalValue,
        isSyncing,
        contentDescription:
            `${labels.title}. ${nextCharge.name}: ${nextAmount}. ${nextTiming}. ${countLabel}`
            + totalDescription,
    };
}

function getNativeModule(): UpcomingPaymentsWidgetNativeModule | undefined {
    return NativeModules.BudgetWidget as UpcomingPaymentsWidgetNativeModule | undefined;
}

export function syncAndroidUpcomingPaymentsWidget(
    snapshot: AndroidUpcomingPaymentsWidgetSnapshot,
): void {
    if (Platform.OS !== 'android') {
        return;
    }

    try {
        getNativeModule()?.updateUpcomingSnapshot(snapshot);
    } catch {
        // Launcher data is best-effort and must never interrupt the app experience.
    }
}

export function clearAndroidUpcomingPaymentsWidget(): void {
    if (Platform.OS !== 'android') {
        return;
    }

    try {
        // The native clearSnapshot wipes both the budget and upcoming-payments widget stores.
        getNativeModule()?.clearSnapshot?.();
    } catch {
        // Clearing launcher data is best-effort and must not block logout.
    }
}
