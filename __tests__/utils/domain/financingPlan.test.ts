import { translate } from '../../../src/i18n/index';
import {
    buildFinancingPlanAmountLabel,
    buildFinancingPlanLabel,
    normalizeFinancingPlan,
} from '../../../src/utils/domain/financingPlan';

const tEs = (key: any, values?: any) => translate('es', key, values);
const base = {
    type: 'NO_INTEREST' as const,
    installmentNumber: 7,
    installmentCount: 12,
    installmentAmount: 1083.25,
    originalAmount: null,
    remainingAmount: null,
    purchaseDate: null,
};

describe('normalizeFinancingPlan', () => {
    it('returns null for missing, null or invalid plans', () => {
        expect(normalizeFinancingPlan(undefined)).toBeNull();
        expect(normalizeFinancingPlan(null)).toBeNull();
        expect(normalizeFinancingPlan({ type: 'OTHER' })).toBeNull();
    });

    it('parses string numbers and keeps nulls', () => {
        expect(
            normalizeFinancingPlan({
                type: 'INTEREST_BEARING',
                installmentNumber: '7',
                installmentCount: '12',
                installmentAmount: '1083.25',
                originalAmount: '13000.00',
                remainingAmount: null,
                purchaseDate: '2026-03-01',
            }),
        ).toEqual({
            type: 'INTEREST_BEARING',
            installmentNumber: 7,
            installmentCount: 12,
            installmentAmount: 1083.25,
            originalAmount: 13000,
            remainingAmount: null,
            purchaseDate: '2026-03-01',
        });
    });
});

describe('buildFinancingPlanLabel', () => {
    it('builds MSI and interest labels with position', () => {
        expect(buildFinancingPlanLabel(base, tEs)).toBe('MSI · 7/12');
        expect(buildFinancingPlanLabel({ ...base, type: 'INTEREST_BEARING' }, tEs)).toBe('Con intereses · 7/12');
    });

    it('falls back when counts are null', () => {
        const bare = { ...base, installmentNumber: null, installmentCount: null };
        expect(buildFinancingPlanLabel(bare, tEs)).toBe('MSI');
        expect(buildFinancingPlanLabel({ ...bare, type: 'INTEREST_BEARING' }, tEs)).toBe('A meses');
        expect(buildFinancingPlanLabel(null, tEs)).toBeNull();
    });

    it('builds the monthly amount label only when present', () => {
        const fmt = (n: number) => `$${n.toFixed(2)}`;
        expect(buildFinancingPlanAmountLabel(base, fmt, tEs)).toBe('$1083.25/mes');
        expect(buildFinancingPlanAmountLabel({ ...base, installmentAmount: null }, fmt, tEs)).toBeNull();
    });
});
