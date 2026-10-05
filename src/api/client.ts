import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '../utils/core/constants';
import { useAuthStore } from '../store/authStore';
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

declare module 'axios' {
    export interface AxiosRequestConfig {
        /** Request metadata. `background: true` never opens the premium paywall. */
        meta?: { background?: boolean };
    }
}

export const REFRESH_TIMEOUT_MS = 15000;
const PAYWALL_DEDUPE_WINDOW_MS = 4000;

export class SessionRefreshError extends Error {
    readonly transient: boolean;
    readonly cause?: unknown;

    constructor(transient: boolean, cause?: unknown) {
        super(
            transient
                ? 'Could not refresh the session. Please try again.'
                : 'Session refresh was rejected.',
        );
        this.name = 'SessionRefreshError';
        this.transient = transient;
        this.cause = cause;
    }
}

let refreshSessionPromise: Promise<string> | null = null;
let lastPaywallOpenedAt = 0;


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

function isRefreshRejection(error: unknown): boolean {
    const status = (error as AxiosError)?.response?.status;
    return status === 400 || status === 401 || status === 403;
}

async function requestTokens(refreshToken: string): Promise<RefreshResponse> {
    try {
        const { data } = await axios.post(
            `${API_BASE_URL}/auth/refresh`,
            { refreshToken },
            { timeout: REFRESH_TIMEOUT_MS },
        );
        const accessToken = data?.accessToken;
        const nextRefreshToken = data?.refreshToken;

        if (
            typeof accessToken !== 'string'
            || typeof nextRefreshToken !== 'string'
        ) {
            throw new SessionRefreshError(true, new Error('Invalid refresh payload.'));
        }

        return { accessToken, refreshToken: nextRefreshToken };
    } catch (error) {
        if (error instanceof SessionRefreshError) {
            throw error;
        }
        // Network errors, timeouts and 5xx are transient: never end the session for them.
        throw new SessionRefreshError(!isRefreshRejection(error), error);
    }
}

/**
 * Single shared in-flight refresh. Resolves with the new access token.
 * The rotated refresh token is persisted (secure storage + store) before
 * any waiting request is retried.
 */
function refreshSession(): Promise<string> {
    if (refreshSessionPromise) {
        return refreshSessionPromise;
    }

    const promise = (async () => {
        const currentRefreshToken = useAuthStore.getState().refreshToken;
        if (!currentRefreshToken) {
            throw new SessionRefreshError(false);
        }

        const tokens = await requestTokens(currentRefreshToken);
        useAuthStore.getState().setTokens(
            tokens.accessToken,
            tokens.refreshToken,
        );
        return tokens.accessToken;
    })().finally(() => {
        refreshSessionPromise = null;
    });

    refreshSessionPromise = promise;
    return promise;
}

function shouldOpenPaywall(config?: InternalAxiosRequestConfig | null): boolean {
    if (config?.meta?.background) {
        return false;
    }

    const now = Date.now();
    if (now - lastPaywallOpenedAt < PAYWALL_DEDUPE_WINDOW_MS) {
        return false;
    }

    lastPaywallOpenedAt = now;
    return true;
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
        }) | undefined;

        const premiumError = error.response?.status === 403
            ? extractPremiumRequiredError(error.response?.data)
            : null;

        if (premiumError && shouldOpenPaywall(originalRequest)) {
            openPremiumPaywall(premiumError.feature);
        }

        if (!originalRequest) {
            return Promise.reject(error);
        }

        const isUnauthorized = error.response?.status === 401;
        if (
            !isUnauthorized
            || originalRequest._retry
            || !useAuthStore.getState().isAuthenticated
            || isAuthRoute(String(originalRequest.url || ''))
        ) {
            return Promise.reject(error);
        }

        originalRequest._retry = true;

        const sentAuthorization = originalRequest.headers?.Authorization;
        const currentAccessToken = useAuthStore.getState().accessToken;

        try {
            // Another request may already have rotated the tokens while this one was in flight.
            const accessToken =
                currentAccessToken
                && sentAuthorization !== `Bearer ${currentAccessToken}`
                    ? currentAccessToken
                    : await refreshSession();

            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return apiClient(originalRequest);
        } catch (refreshError) {
            if (
                refreshError instanceof SessionRefreshError
                && !refreshError.transient
            ) {
                useAuthStore.getState().logout();
            }
            return Promise.reject(
                refreshError instanceof SessionRefreshError ? refreshError : error,
            );
        }
    },
);

export default apiClient;
