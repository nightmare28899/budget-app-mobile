import apiClient from './client';
import { BudgetPeriod, User } from '../types';
import { normalizeBudgetPeriod } from '../utils/budget';
import { normalizeCurrency } from '../utils/currency';
import { toNum } from '../utils/number';
import { isLocalMode } from '../modules/access/localMode';
import { useAuthStore } from '../store/authStore';

export interface UpdateCurrentUserPayload {
  name?: string;
  budgetAmount?: number;
  budgetPeriod?: BudgetPeriod;
  budgetPeriodStart?: string | null;
  budgetPeriodEnd?: string | null;
  currency?: string;
  weeklyReportEnabled?: boolean;
  monthlyReportEnabled?: boolean;
}

function normalizeUser(data: any): User {
  const budgetAmount = toNum(data?.budgetAmount ?? data?.dailyBudget);
  const budgetPeriod = normalizeBudgetPeriod(data?.budgetPeriod, 'daily');

  return {
    ...data,
    currency: normalizeCurrency(data?.currency),
    weeklyReportEnabled: data?.weeklyReportEnabled === true,
    monthlyReportEnabled: data?.monthlyReportEnabled === true,
    dailyBudget: toNum(data?.dailyBudget ?? budgetAmount),
    budgetAmount,
    budgetPeriod,
    budgetPeriodStart:
      typeof data?.budgetPeriodStart === 'string'
        ? data.budgetPeriodStart
        : null,
    budgetPeriodEnd:
      typeof data?.budgetPeriodEnd === 'string' ? data.budgetPeriodEnd : null,
  } as User;
}

export const usersApi = {
  getMe: async () => {
    if (isLocalMode()) {
      const user = useAuthStore.getState().user;
      if (!user) {
        throw new Error('Guest profile is not available.');
      }

      return normalizeUser(user);
    }

    const { data } = await apiClient.get('/users/me');
    return normalizeUser(data?.user ?? data);
  },

  updateMe: async (payload: UpdateCurrentUserPayload) => {
    if (isLocalMode()) {
      const currentUser = useAuthStore.getState().user;
      if (!currentUser) {
        throw new Error('Guest profile is not available.');
      }

      const updatedUser = normalizeUser({
        ...currentUser,
        ...payload,
      });
      useAuthStore.getState().setUser(updatedUser);
      return updatedUser;
    }

    const requestPayload: UpdateCurrentUserPayload = { ...payload };

    if (requestPayload.budgetPeriod !== 'period') {
      delete requestPayload.budgetPeriodStart;
      delete requestPayload.budgetPeriodEnd;
    } else {
      if (requestPayload.budgetPeriodStart == null) {
        delete requestPayload.budgetPeriodStart;
      }
      if (requestPayload.budgetPeriodEnd == null) {
        delete requestPayload.budgetPeriodEnd;
      }
    }

    const { data } = await apiClient.patch('/users/me', requestPayload);
    return normalizeUser(data?.user ?? data);
  },
};
