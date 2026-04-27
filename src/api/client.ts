import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '../utils/core/constants';
import { useAuthStore } from '../store/authStore';
import { translate, TranslationKey } from '../i18n/index';
import { usePreferencesStore } from '../store/preferencesStore';
import { showGlobalAlert } from '../components/alerts/alertBridge';
import { extractPremiumRequiredError } from '../utils/platform/api';
import { openPremiumPaywall } from '../navigation/navigationBridge';

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 15000,
});

type RefreshResponse = {
    accessToken: string;
    refreshToken: string;
};

type SessionDecision = 'renew' | 'close';

let promptSessionRenewalPromise: Promise<SessionDecision> | null = null;
let refreshTokensPromise: Promise<RefreshResponse> | null = null;

function t(key: TranslationKey) {
    const language = usePreferencesStore.getState().language;
    return translate(language, key);
}

function isAuthRoute(url?: string): boolean {
    if (!url) {
        return false;
    }

    return /\/auth\/(login|register|refresh|logout)\b/i.test(url);
}

function isFormDataPayload(value: unknown): value is FormData {
    return typeof FormData !== 'undefined' && value instanceof FormData;
}

function removeContentTypeHeader(
    headers: InternalAxiosRequestConfig['headers'],
): void {
    if (!headers) {
        return;
    }

    if (typeof headers.delete === 'function') {
        headers.delete('Content-Type');
        headers.delete('content-type');
        return;
    }

    delete headers['Content-Type'];
    delete headers['content-type'];
}

function askSessionRenewal(): Promise<SessionDecision> {
    if (promptSessionRenewalPromise) {
        return promptSessionRenewalPromise;
    }

    promptSessionRenewalPromise = new Promise<SessionDecision>((resolve) => {
        showGlobalAlert(
            t('session.expiredTitle'),
            t('session.expiredMessage'),
            [
                {
                    text: t('session.close'),
                    style: 'destructive',
                    onPress: () => resolve('close'),
                },
                {
                    text: t('session.renew'),
                    onPress: () => resolve('renew'),
                },
            ],
            { cancelable: false },
        );
    });

    return promptSessionRenewalPromise.finally(() => {
        promptSessionRenewalPromise = null;
    });
}

function refreshTokens(refreshToken: string): Promise<RefreshResponse> {
    if (refreshTokensPromise) {
        return refreshTokensPromise;
    }

    refreshTokensPromise = axios
        .post(`${API_BASE_URL}/auth/refresh`, { refreshToken })
        .then(({ data }) => {
            const accessToken = data?.accessToken;
            const nextRefreshToken = data?.refreshToken;

            if (
                typeof accessToken !== 'string' ||
                typeof nextRefreshToken !== 'string'
            ) {
                throw new Error('Invalid refresh response payload.');
            }

            return {
                accessToken,
                refreshToken: nextRefreshToken,
            };
        })
        .finally(() => {
            refreshTokensPromise = null;
        });

    return refreshTokensPromise;
}

apiClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        if (isFormDataPayload(config.data)) {
            // Let React Native/Axios generate the multipart boundary correctly.
            removeContentTypeHeader(config.headers);
        }

        if (!__DEV__) {
            const baseUrl = String(config.baseURL || API_BASE_URL);
            const requestUrl = String(config.url || '');

            if (
                /^http:\/\//i.test(baseUrl) ||
                /^http:\/\//i.test(requestUrl)
            ) {
                return Promise.reject(
                    new Error('Blocked insecure API request over HTTP in production build.'),
                );
            }
        }

        const token = useAuthStore.getState().accessToken;
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error),
);

apiClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as (InternalAxiosRequestConfig & {
            _retry?: boolean;
        }) | null;
        const premiumError = extractPremiumRequiredError(error.response?.data);

        if (premiumError) {
            openPremiumPaywall(premiumError.feature);
        }

        if (!originalRequest) {
            return Promise.reject(error);
        }

        const { isAuthenticated, refreshToken } = useAuthStore.getState();
        const requestUrl = String(originalRequest.url || '');
        const isUnauthorized = error.response?.status === 401;

        if (
            isUnauthorized &&
            originalRequest._retry &&
            isAuthenticated &&
            !isAuthRoute(requestUrl)
        ) {
            showGlobalAlert(
                t('session.renewFailedTitle'),
                t('session.renewFailedMessage'),
                [{ text: t('common.ok') }],
                { cancelable: false },
            );
            useAuthStore.getState().logout();
            return Promise.reject(error);
        }

        if (
            isUnauthorized &&
            !originalRequest._retry &&
            isAuthenticated &&
            !isAuthRoute(requestUrl)
        ) {
            originalRequest._retry = true;

            if (!refreshToken) {
                useAuthStore.getState().logout();
                return Promise.reject(error);
            }

            const decision = await askSessionRenewal();
            if (decision === 'close') {
                useAuthStore.getState().logout();
                return Promise.reject(error);
            }

            try {
                const tokens = await refreshTokens(refreshToken);
                useAuthStore.getState().setTokens(
                    tokens.accessToken,
                    tokens.refreshToken,
                );
                originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`;

                return apiClient(originalRequest);
            } catch {
                showGlobalAlert(
                    t('session.renewFailedTitle'),
                    t('session.renewFailedMessage'),
                    [{ text: t('common.ok') }],
                    { cancelable: false },
                );
                useAuthStore.getState().logout();
                return Promise.reject(error);
            }
        }

        return Promise.reject(error);
    },
);

export default apiClient;
