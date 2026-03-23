import apiClient from './client';
import { User } from '../types';
import { normalizeBudgetPeriod } from '../utils/budget';
import { toNum } from '../utils/number';

function normalizeUser(data: any): User {
    const budgetAmount = toNum(data?.budgetAmount ?? data?.dailyBudget);
    const budgetPeriod = normalizeBudgetPeriod(data?.budgetPeriod, 'daily');

    return {
        ...data,
        dailyBudget: toNum(data?.dailyBudget ?? budgetAmount),
        budgetAmount,
        budgetPeriod,
        budgetPeriodStart:
            typeof data?.budgetPeriodStart === 'string'
                ? data.budgetPeriodStart
                : null,
        budgetPeriodEnd:
            typeof data?.budgetPeriodEnd === 'string'
                ? data.budgetPeriodEnd
                : null,
    } as User;
}

export const usersApi = {
    getMe: async () => {
        const { data } = await apiClient.get('/users/me');
        return normalizeUser(data?.user ?? data);
    },
};
