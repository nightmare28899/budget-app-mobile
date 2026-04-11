import apiClient from './client';
import { BudgetPeriod, User } from '../types';
import { isLocalMode } from '../modules/access/localMode';
import { useAuthStore } from '../store/authStore';
import { normalizeUserRecord } from '../utils/user';

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
  return normalizeUserRecord(data);
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
