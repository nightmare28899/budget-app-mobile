import { parseAndroidWidgetUrl } from '../../../src/utils/platform/androidQuickAddWidget';

const mockNative = {
    isPromotedSupported: jest.fn(() => Promise.resolve(true)),
    startStatementImport: jest.fn(),
    updateStatementImport: jest.fn(),
    endStatementImport: jest.fn(),
    showPaymentDue: jest.fn(),
    clearPaymentDue: jest.fn(),
};

function load(os: 'android' | 'ios', version: number | string = 36, granted = true) {
    jest.resetModules();
    jest.doMock('react-native', () => ({
        Platform: { OS: os, Version: version },
        NativeModules: { BudgetLiveUpdates: mockNative },
        PermissionsAndroid: {
            PERMISSIONS: { POST_NOTIFICATIONS: 'android.permission.POST_NOTIFICATIONS' },
            RESULTS: { GRANTED: 'granted' },
            check: jest.fn(() => Promise.resolve(granted)),
            request: jest.fn(() => Promise.resolve(granted ? 'granted' : 'denied')),
        },
    }));
    return require('../../../src/utils/platform/androidLiveUpdates');
}

beforeEach(() => jest.clearAllMocks());

describe('androidLiveUpdates', () => {
    it('is a no-op on iOS', async () => {
        const lu = load('ios');
        await lu.startStatementImport('a', 'file.pdf');
        lu.updateStatementImport('a', 'parsing');
        lu.endStatementImport('a');
        await lu.showPaymentDue('c', 'Visa', 10, '2026-01-01');
        lu.clearPaymentDue('c');
        expect(await lu.isPromotedSupported()).toBe(false);
        Object.values(mockNative).forEach(fn => expect(fn).not.toHaveBeenCalled());
    });

    it('starts and updates imports on Android with normalized progress', async () => {
        const lu = load('android');
        await lu.startStatementImport('a', 'file.pdf');
        lu.updateStatementImport('a', 'uploading', 1.7);
        lu.updateStatementImport('a', 'review', undefined, 'srv-1');
        expect(mockNative.startStatementImport).toHaveBeenCalledWith('a', 'file.pdf');
        expect(mockNative.updateStatementImport).toHaveBeenNthCalledWith(1, 'a', 'uploading', 1, null);
        const second = mockNative.updateStatementImport.mock.calls[1] as unknown as unknown[];
        expect(Number.isNaN(second[2])).toBe(true);
        expect(second[3]).toBe('srv-1');
    });

    it('skips posting when notification permission is denied', async () => {
        const lu = load('android', 34, false);
        await lu.startStatementImport('a', 'f.pdf');
        await lu.showPaymentDue('c', 'Visa', 10, '2026-01-01');
        expect(mockNative.startStatementImport).not.toHaveBeenCalled();
        expect(mockNative.showPaymentDue).not.toHaveBeenCalled();
    });

    it('maps backend statuses to stages', () => {
        const lu = load('android');
        expect(lu.stageForImportStatus('NEEDS_REVIEW')).toBe('review');
        expect(lu.stageForImportStatus('FAILED')).toBe('failed');
        expect(lu.stageForImportStatus('PARSED')).toBe('parsing');
        expect(lu.stageForImportStatus('CONFIRMED')).toBe('done');
    });

    it('only shows payment due within one day', () => {
        const lu = load('android');
        expect(lu.shouldShowPaymentDue(0)).toBe(true);
        expect(lu.shouldShowPaymentDue(1)).toBe(true);
        expect(lu.shouldShowPaymentDue(2)).toBe(false);
        expect(lu.shouldShowPaymentDue(-1)).toBe(false);
        expect(lu.shouldShowPaymentDue(null)).toBe(false);
    });
});

describe('statement deep link', () => {
    it('keeps the id case and parses it', () => {
        expect(parseAndroidWidgetUrl('budgetapp://statements/AbC_12')).toEqual({
            type: 'statement',
            id: 'AbC_12',
        });
    });

    it('rejects the bare list URL', () => {
        expect(parseAndroidWidgetUrl('budgetapp://statements')).toBeUndefined();
    });
});
