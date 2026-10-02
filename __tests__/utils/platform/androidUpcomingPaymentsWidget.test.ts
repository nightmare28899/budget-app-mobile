import { createAndroidUpcomingPaymentsWidgetSnapshot } from '../../../src/utils/platform/androidUpcomingPaymentsWidget';

describe('createAndroidUpcomingPaymentsWidgetSnapshot', () => {
    const baseInput = {
        language: 'en' as const,
        isLoading: false,
        hasError: false,
        fallbackCurrency: 'USD',
        charges: [
            { name: 'Music', amount: 10, currency: 'USD', daysRemaining: 4 },
            { name: 'Cloud', amount: 5, currency: 'USD', daysRemaining: 1 },
        ],
    };

    it('selects the nearest payment and totals a single currency', () => {
        const snapshot = createAndroidUpcomingPaymentsWidgetSnapshot(baseInput);

        expect(snapshot.state).toBe('data');
        expect(snapshot.nextName).toBe('Cloud');
        expect(snapshot.nextTiming).toBe('Due tomorrow');
        expect(snapshot.nextAmount).toContain('$5.00');
        expect(snapshot.countLabel).toBe('2 payments in 7 days');
        expect(snapshot.totalValue).toContain('$15.00');
    });

    it('does not combine different currencies', () => {
        const snapshot = createAndroidUpcomingPaymentsWidgetSnapshot({
            ...baseInput,
            charges: [
                baseInput.charges[0],
                { ...baseInput.charges[1], currency: 'MXN' },
            ],
        });

        expect(snapshot.totalLabel).toBe('');
        expect(snapshot.totalValue).toBe('');
    });

    it.each([
        [{ isLoading: true }, 'loading'],
        [{ hasError: true }, 'error'],
        [{ charges: [] }, 'empty'],
    ] as const)('returns the expected non-data state', (overrides, expectedState) => {
        const snapshot = createAndroidUpcomingPaymentsWidgetSnapshot({
            ...baseInput,
            ...overrides,
        });

        expect(snapshot.state).toBe(expectedState);
        expect(snapshot.nextAmount).toBe('');
        expect(snapshot.totalValue).toBe('');
    });

    it('uses Spanish copy and the requested window', () => {
        const snapshot = createAndroidUpcomingPaymentsWidgetSnapshot({
            ...baseInput,
            language: 'es',
            windowDays: 7,
            charges: [{ name: 'Nube', amount: 99, currency: 'MXN', daysRemaining: 0 }],
        });

        expect(snapshot.title).toBe('Próximos pagos');
        expect(snapshot.nextTiming).toBe('Vence hoy');
        expect(snapshot.countLabel).toBe('1 pago en 7 días');
    });
});
