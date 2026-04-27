import apiClient from '../client';
import { isLocalMode } from '../../modules/access/localMode';
import { useAuthStore } from '../../store/authStore';
import { AppLanguage } from '../../i18n/index';
import { extractApiMessage } from '../../utils/platform/api';

export type DevicePlatform = 'ANDROID' | 'IOS';

type RegisterDeviceTokenPayload = {
    token: string;
    platform: DevicePlatform;
    language?: AppLanguage;
};

function isLegacyLanguageContractError(error: unknown): boolean {
    const status = (error as { response?: { status?: number } })?.response?.status;
    if (status !== 400) {
        return false;
    }

    const message =
        extractApiMessage((error as { response?: { data?: unknown } })?.response?.data)
            ?.toLowerCase()
            .trim() || '';

    if (!message.includes('language')) {
        return false;
    }

    return (
        message.includes('should not exist')
        || message.includes('not allowed')
        || message.includes('forbidden')
    );
}

export const notificationsApi = {
    registerDeviceToken: async (payload: RegisterDeviceTokenPayload) => {
        if (isLocalMode() || !useAuthStore.getState().isAuthenticated) {
            return null;
        }

        try {
            const { data } = await apiClient.post('/notifications/device-tokens', payload);
            return data;
        } catch (error) {
            if (!payload.language || !isLegacyLanguageContractError(error)) {
                throw error;
            }

            // Backward compatibility for APIs that still reject unknown "language".
            const { data } = await apiClient.post('/notifications/device-tokens', {
                token: payload.token,
                platform: payload.platform,
            });
            return data;
        }
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
