import { selectPriorityCategoryBudget } from '../../src/utils/domain/categoryBudgets';
import type { CategoryBudgetStatus } from '../../src/types/index';

function categoryBudget(
    overrides: Partial<CategoryBudgetStatus> & Pick<CategoryBudgetStatus, 'categoryId' | 'status'>,
): CategoryBudgetStatus {
    return {
        name: overrides.categoryId,
        icon: 'cube-outline',
        color: '#95A5A6',
        budgetAmount: 100,
        spent: 0,
        remaining: 100,
        percentage: 0,
        expenseCount: 0,
        ...overrides,
    };
}

describe('selectPriorityCategoryBudget', () => {
    it('prioritizes an over-limit category regardless of source order', () => {
        const selected = selectPriorityCategoryBudget([
            categoryBudget({ categoryId: 'watch', status: 'watch', spent: 90 }),
            categoryBudget({ categoryId: 'safe', status: 'on_track', spent: 60 }),
            categoryBudget({ categoryId: 'over', status: 'off_track', spent: 110 }),
        ]);

        expect(selected?.categoryId).toBe('over');
    });

    it('uses the highest consumed share when categories have the same status', () => {
        const selected = selectPriorityCategoryBudget([
            categoryBudget({ categoryId: 'lower', status: 'watch', spent: 160, budgetAmount: 200 }),
            categoryBudget({ categoryId: 'higher', status: 'watch', spent: 95, budgetAmount: 100 }),
        ]);

        expect(selected?.categoryId).toBe('higher');
    });

    it('ignores categories without a configured limit', () => {
        const selected = selectPriorityCategoryBudget([
            categoryBudget({
                categoryId: 'without-limit',
                status: 'no_budget',
                budgetAmount: 0,
                spent: 250,
            }),
            categoryBudget({ categoryId: 'configured', status: 'on_track', spent: 25 }),
        ]);

        expect(selected?.categoryId).toBe('configured');
    });

    it('returns null when there are no configured limits', () => {
        const selected = selectPriorityCategoryBudget([
            categoryBudget({
                categoryId: 'without-limit',
                status: 'no_budget',
                budgetAmount: 0,
            }),
        ]);

        expect(selected).toBeNull();
    });
});
