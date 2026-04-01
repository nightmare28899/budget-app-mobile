import apiClient from './client';
import { isLocalMode } from '../modules/access/localMode';
import { useAuthStore } from '../store/authStore';

export type DevicePlatform = 'ANDROID' | 'IOS';

type RegisterDeviceTokenPayload = {
    token: string;
    platform: DevicePlatform;
};

export const notificationsApi = {
    registerDeviceToken: async (payload: RegisterDeviceTokenPayload) => {
        if (isLocalMode() || !useAuthStore.getState().isAuthenticated) {
            return null;
        }

        const { data } = await apiClient.post('/notifications/device-tokens', payload);
        return data;
    },

    removeDeviceToken: async (token: string) => {
        if (isLocalMode() || !useAuthStore.getState().isAuthenticated) {
            return null;
        }

        const { data } = await apiClient.post('/notifications/device-tokens/remove', {
            token,
        });
        return data;
    },
};
