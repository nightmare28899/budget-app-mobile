import apiClient from './client';
import { AuthResponse, RegisterResponse } from '../types';
import { normalizeBudgetPeriod } from '../utils/budget';
import { toNum } from '../utils/number';

export interface RegisterAvatarPayload {
    uri: string;
    name?: string;
    type?: string;
}

function inferMimeType(filename?: string): string {
    const lower = filename?.toLowerCase() || '';
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.webp')) return 'image/webp';
    if (lower.endsWith('.heic')) return 'image/heic';
    if (lower.endsWith('.heif')) return 'image/heif';
    return 'image/jpeg';
}

function normalizeAuthResponse<T extends AuthResponse | RegisterResponse>(data: T): T {
    const budgetAmount = toNum(data?.user?.budgetAmount ?? data?.user?.dailyBudget);
    const budgetPeriod = normalizeBudgetPeriod(data?.user?.budgetPeriod, 'daily');

    return {
        ...data,
        user: {
            ...data.user,
            dailyBudget: toNum(data?.user?.dailyBudget ?? budgetAmount),
            budgetAmount,
            budgetPeriod,
            budgetPeriodStart:
                typeof data?.user?.budgetPeriodStart === 'string'
                    ? data.user.budgetPeriodStart
                    : null,
            budgetPeriodEnd:
                typeof data?.user?.budgetPeriodEnd === 'string'
                    ? data.user.budgetPeriodEnd
                    : null,
        },
    };
}

export const authApi = {
    register: async (
        email: string,
        name: string,
        password: string,
        avatar?: RegisterAvatarPayload,
        role: string = 'user',
    ) => {
        const formData = new FormData();
        formData.append('email', email);
        formData.append('name', name);
        formData.append('password', password);
        formData.append('role', role);

        if (avatar?.uri) {
            const filename = avatar.name || avatar.uri.split('/').pop() || 'avatar.jpg';
            formData.append('avatar', {
                uri: avatar.uri,
                name: filename,
                type: avatar.type || inferMimeType(filename),
            } as any);
        }

        const { data } = await apiClient.post<RegisterResponse>(
            '/auth/register',
            formData,
        );

        return normalizeAuthResponse(data);
    },

    login: async (email: string, password: string) => {
        const { data } = await apiClient.post<AuthResponse>('/auth/login', {
            email,
            password,
        });
        return normalizeAuthResponse(data);
    },

    refresh: async (refreshToken: string) => {
        const { data } = await apiClient.post('/auth/refresh', { refreshToken });
        return data;
    },
};
