import type { CategoryBudgetStatus } from '../../types/index';

const statusPriority: Record<CategoryBudgetStatus['status'], number> = {
    off_track: 3,
    watch: 2,
    on_track: 1,
    no_budget: 0,
};

function getUsageRatio(item: CategoryBudgetStatus) {
    return item.budgetAmount > 0 ? item.spent / item.budgetAmount : 0;
}

export function selectPriorityCategoryBudget(
    items: CategoryBudgetStatus[],
): CategoryBudgetStatus | null {
    const budgetedItems = items.filter((item) => item.budgetAmount > 0);

    if (!budgetedItems.length) {
        return null;
    }

    return [...budgetedItems].sort((left, right) => {
        const statusDifference = statusPriority[right.status] - statusPriority[left.status];
        if (statusDifference !== 0) {
            return statusDifference;
        }

        const usageDifference = getUsageRatio(right) - getUsageRatio(left);
        if (usageDifference !== 0) {
            return usageDifference;
        }

        const spentDifference = right.spent - left.spent;
        if (spentDifference !== 0) {
            return spentDifference;
        }

        return left.categoryId.localeCompare(right.categoryId);
    })[0];
}
