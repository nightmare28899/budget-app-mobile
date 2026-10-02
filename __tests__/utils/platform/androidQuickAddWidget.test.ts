import {
    parseAndroidQuickAddUrl,
    parseAndroidWidgetUrl,
} from '../../../src/utils/platform/androidQuickAddWidget';

describe('parseAndroidQuickAddUrl', () => {
    it.each([
        ['budgetapp://add/expense', 'expense'],
        ['budgetapp://add/income', 'income'],
        ['budgetapp://add/subscription', 'subscription'],
    ] as const)('maps %s to the existing AddEntry tab', (url, expectedTab) => {
        expect(parseAndroidQuickAddUrl(url)).toBe(expectedTab);
    });

    it('normalizes casing and surrounding whitespace', () => {
        expect(parseAndroidQuickAddUrl('  BUDGETAPP://ADD/INCOME  ')).toBe('income');
    });

    it.each([
        'budgetapp://add',
        'budgetapp://add/expense?amount=100',
        'budgetapp://add/unknown',
        'https://example.com/add/expense',
    ])('rejects unsupported or extended URLs: %s', (url) => {
        expect(parseAndroidQuickAddUrl(url)).toBeUndefined();
    });
});

describe('parseAndroidWidgetUrl', () => {
    it('maps quick add URLs to their tab', () => {
        expect(parseAndroidWidgetUrl('budgetapp://add/subscription')).toEqual({
            type: 'quick-add',
            tab: 'subscription',
        });
    });

    it('maps the budget widget refresh action', () => {
        expect(parseAndroidWidgetUrl('  BudgetApp://Refresh ')).toEqual({
            type: 'refresh',
        });
    });

    it('maps the upcoming payments widget destination', () => {
        expect(
            parseAndroidWidgetUrl('budgetapp://subscriptions/upcoming?days=7'),
        ).toEqual({
            type: 'upcoming-payments',
            days: 7,
        });
    });

    it.each([
        'budgetapp://refresh/now',
        'budgetapp://subscriptions/upcoming?days=30',
        'budgetapp://add/unknown',
        'https://example.com/refresh',
    ])('rejects unsupported URLs: %s', (url) => {
        expect(parseAndroidWidgetUrl(url)).toBeUndefined();
    });
});
