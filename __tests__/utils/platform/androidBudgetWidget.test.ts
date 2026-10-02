import { createAndroidBudgetWidgetSnapshot } from '../../../src/utils/platform/androidBudgetWidget';

describe('createAndroidBudgetWidgetSnapshot', () => {
    const baseInput = {
        language: 'en' as const,
        isLoading: false,
        hasError: false,
        budget: 1000,
        spent: 250,
        safeToSpend: 750,
        periodLabel: 'Monthly',
        currency: 'USD',
    };

    it('builds a concise data snapshot with progress and status', () => {
        const snapshot = createAndroidBudgetWidgetSnapshot(baseInput);

        expect(snapshot.state).toBe('data');
        expect(snapshot.percentage).toBe(25);
        expect(snapshot.tone).toBe('safe');
        expect(snapshot.value).toContain('$750.00');
        expect(snapshot.statusLabel).toBe('25% used');
        expect(snapshot.periodLabel).toBe('Monthly');
        expect(snapshot.isSyncing).toBe(false);
    });

    it('exposes the spent and budget breakdown as separate fields', () => {
        const snapshot = createAndroidBudgetWidgetSnapshot(baseInput);

        expect(snapshot.spentLabel).toBe('Spent');
        expect(snapshot.spentValue).toContain('$250.00');
        expect(snapshot.budgetLabel).toBe('Budget');
        expect(snapshot.budgetValue).toContain('$1,000.00');
    });

    it('keeps the data state while a background refresh is running', () => {
        const snapshot = createAndroidBudgetWidgetSnapshot({
            ...baseInput,
            isSyncing: true,
        });

        expect(snapshot.state).toBe('data');
        expect(snapshot.isSyncing).toBe(true);
    });

    it('caps visual progress while preserving an over-budget warning', () => {
        const snapshot = createAndroidBudgetWidgetSnapshot({
            ...baseInput,
            spent: 1250,
            safeToSpend: -250,
        });

        expect(snapshot.percentage).toBe(100);
        expect(snapshot.statusLabel).toBe('125% used');
        expect(snapshot.tone).toBe('danger');
    });

    it.each([
        [{ isLoading: true }, 'loading'],
        [{ hasError: true }, 'error'],
        [{ budget: 0 }, 'empty'],
    ] as const)('returns the expected non-data state', (overrides, expectedState) => {
        const snapshot = createAndroidBudgetWidgetSnapshot({
            ...baseInput,
            ...overrides,
        });

        expect(snapshot.state).toBe(expectedState);
        expect(snapshot.percentage).toBe(0);
        expect(snapshot.tone).toBe('neutral');
        expect(snapshot.periodLabel).toBe('');
        expect(snapshot.spentValue).toBe('');
    });

    it('uses Spanish copy when the app language is Spanish', () => {
        const snapshot = createAndroidBudgetWidgetSnapshot({
            ...baseInput,
            language: 'es',
        });

        expect(snapshot.language).toBe('es');
        expect(snapshot.title).toBe('Disponible para gastar');
        expect(snapshot.spentLabel).toBe('Gastado');
        expect(snapshot.statusLabel).toBe('25% usado');
    });
});
