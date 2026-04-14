import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import auth, { GoogleAuthProvider } from '@react-native-firebase/auth';
import {
    GoogleSignin,
    isErrorWithCode,
    isSuccessResponse,
    statusCodes,
} from '@react-native-google-signin/google-signin';
import { useAuthStore } from '../store/authStore';
import { useOfflineRegistrationStore } from '../store/offlineRegistrationStore';
import { useAppAlert } from '../components/alerts/AlertProvider';
import { authApi } from '../api/auth';
import { usersApi } from '../api/resources/users';
import { expensesApi } from '../api/resources/expenses';
import { analyticsApi } from '../api/resources/analytics';
import { incomesApi } from '../api/resources/incomes';
import { historyApi } from '../api/resources/history';
import { subscriptionsApi } from '../api/resources/subscriptions';
import {
    extractApiMessage,
    getApiErrorData,
    getErrorMessage,
    isApiRecord,
    isLikelyJsonParseError,
} from '../utils/platform/api';
import { API_BASE_URL } from '../utils/core/constants';
import { Asset } from 'react-native-image-picker';
import { extractAvatarUri } from '../utils/platform/media';
import { getInternetAccessState } from '../utils/platform/network';
import { useI18n } from './useI18n';
import { resetToMainDashboard } from '../navigation/navigationBridge';
import { configureGoogleSignIn } from '../utils/platform/googleAuth';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function logGoogleAuth(event: string, details?: Record<string, unknown>) {
    if (!__DEV__) {
        return;
    }

    if (details) {
        console.log(`[google-auth] ${event}`, details);
        return;
    }

    console.log(`[google-auth] ${event}`);
}

function getUnreachableApiMessage(t: ReturnType<typeof useI18n>['t']) {
    if (__DEV__) {
        return t('network.cannotReachApi', { baseUrl: API_BASE_URL });
    }

    return t('network.cannotReachServer');
}

function getGoogleSdkErrorMessage(
    err: { code?: string; message?: string },
    t: ReturnType<typeof useI18n>['t'],
) {
    if (
        err.code === '10' ||
        err.code === '12500' ||
        /DEVELOPER_ERROR/i.test(err.message || '') ||
        /non-recoverable sign in failure/i.test(err.message || '')
    ) {
        return t('auth.googleDeveloperError');
    }

    if (err.code === statusCodes.SIGN_IN_REQUIRED) {
        return t('auth.googleSignInGeneric');
    }

    return err.message || t('auth.googleSignInGeneric');
}

export function useAuth() {
    const [loading, setLoading] = useState(false);
    const queryClient = useQueryClient();
    const setAuth = useAuthStore((s) => s.setAuth);
    const { isSyncing, queue } = useOfflineRegistrationStore();
    const pendingRegistrationsCount = queue.length;
    const { alert } = useAppAlert();
    const { t } = useI18n();
    const registrationFallbackMessage = t('auth.registrationTryAgain');

    const completeAuthenticatedSession = (
        user: Parameters<typeof setAuth>[0],
        accessToken: string,
        refreshToken: string,
    ) => {
        setAuth(user, accessToken, refreshToken);
        warmAuthenticatedDashboard();
        resetToMainDashboard();
    };

    const warmAuthenticatedDashboard = () => {
        queryClient.removeQueries({ queryKey: ['expenses'] });
        queryClient.removeQueries({ queryKey: ['incomes'] });
        queryClient.removeQueries({ queryKey: ['income-summary'] });
        queryClient.removeQueries({ queryKey: ['analytics'] });
        queryClient.removeQueries({ queryKey: ['history'] });
        queryClient.removeQueries({ queryKey: ['subscriptions'] });
        queryClient.removeQueries({ queryKey: ['users', 'me'] });

        Promise.allSettled([
            queryClient.fetchQuery({
                queryKey: ['users', 'me'],
                queryFn: usersApi.getMe,
            }),
            queryClient.fetchQuery({
                queryKey: ['expenses', 'today'],
                queryFn: expensesApi.getToday,
            }),
            queryClient.fetchQuery({
                queryKey: ['analytics', 'budget-summary'],
                queryFn: () => analyticsApi.getBudgetSummary(),
            }),
            queryClient.fetchQuery({
                queryKey: ['income-summary', 'current'],
                queryFn: () => incomesApi.getSummary(),
            }),
            queryClient.fetchQuery({
                queryKey: ['history', 'all'],
                queryFn: historyApi.getAll,
            }),
            queryClient.fetchQuery({
                queryKey: ['subscriptions', 'upcoming', 3],
                queryFn: () => subscriptionsApi.getUpcoming(3),
            }),
        ]);
    };

    const login = async (email: string, password: string) => {
        const normalizedEmail = email.trim().toLowerCase();
        if (!normalizedEmail || !password.trim()) {
            alert(t('common.error'), t('error.fillAllFields'));
            return false;
        }
        if (!EMAIL_REGEX.test(normalizedEmail)) {
            alert(t('common.error'), t('error.validEmail'));
            return false;
        }

        setLoading(true);
        try {
            const res = await authApi.login(normalizedEmail, password);
            completeAuthenticatedSession(res.user, res.accessToken, res.refreshToken);
            return true;
        } catch (err: unknown) {
            const apiMessage = extractApiMessage(getApiErrorData(err));
            const hasResponse = isApiRecord(err) && isApiRecord(err.response);
            const message = hasResponse
                ? apiMessage || t('auth.invalidCredentials')
                : getUnreachableApiMessage(t);

            alert(t('auth.loginFailed'), message);
            return false;
        } finally {
            setLoading(false);
        }
    };

    const loginWithGoogle = async () => {
        logGoogleAuth('start');
        const configuredWebClientId = configureGoogleSignIn();
        if (!configuredWebClientId) {
            logGoogleAuth('config-missing');
            alert(t('auth.googleSignInFailed'), t('auth.googleConfigMissing'));
            return false;
        }
        logGoogleAuth('configured', {
            hasWebClientId: true,
            webClientIdSuffix: configuredWebClientId.slice(-12),
        });

        setLoading(true);
        try {
            await GoogleSignin.hasPlayServices({
                showPlayServicesUpdateDialog: true,
            });
            logGoogleAuth('play-services-ready');

            const response = await GoogleSignin.signIn();
            logGoogleAuth('google-signin-response', {
                success: isSuccessResponse(response),
            });
            if (!isSuccessResponse(response)) {
                logGoogleAuth('google-signin-non-success-response');
                return false;
            }

            const googleIdToken = response.data.idToken;
            if (!googleIdToken) {
                logGoogleAuth('missing-google-id-token');
                alert(t('auth.googleSignInFailed'), t('auth.googleMissingIdToken'));
                return false;
            }
            logGoogleAuth('google-id-token-received', {
                tokenLength: googleIdToken.length,
            });

            const credential = GoogleAuthProvider.credential(googleIdToken);
            const firebaseCredential = await auth().signInWithCredential(credential);
            logGoogleAuth('firebase-signin-success', {
                uid: firebaseCredential.user.uid,
                email: firebaseCredential.user.email,
            });
            const firebaseIdToken = await firebaseCredential.user.getIdToken(true);
            logGoogleAuth('firebase-id-token-received', {
                tokenLength: firebaseIdToken.length,
            });
            const res = await authApi.loginWithGoogle(firebaseIdToken, true);
            logGoogleAuth('backend-google-login-success', {
                userId: res.user.id,
                email: res.user.email,
            });

            completeAuthenticatedSession(res.user, res.accessToken, res.refreshToken);
            logGoogleAuth('session-complete');
            return true;
        } catch (err: unknown) {
            if (isErrorWithCode(err)) {
                logGoogleAuth('google-sdk-error', {
                    code: err.code,
                    message: err.message,
                });
                if (err.code === statusCodes.SIGN_IN_CANCELLED) {
                    return false;
                }

                if (err.code === statusCodes.IN_PROGRESS) {
                    alert(t('auth.googleSignInFailed'), t('auth.googleInProgress'));
                    return false;
                }

                if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
                    alert(t('auth.googleSignInFailed'), t('auth.googlePlayServicesUnavailable'));
                    return false;
                }

                alert(
                    t('auth.googleSignInFailed'),
                    getGoogleSdkErrorMessage(err, t),
                );
                return false;
            }

            const apiMessage = extractApiMessage(getApiErrorData(err));
            const response = isApiRecord(err) && isApiRecord(err.response)
                ? err.response
                : null;
            const message = response
                ? apiMessage || t('auth.googleSignInGeneric')
                : getUnreachableApiMessage(t);
            logGoogleAuth('failure', {
                hasResponse: Boolean(response),
                status: response?.status,
                apiMessage,
                message,
                error: getErrorMessage(err),
            });

            alert(t('auth.googleSignInFailed'), message);
            return false;
        } finally {
            logGoogleAuth('finish');
            setLoading(false);
        }
    };

    const register = async (
        email: string,
        name: string,
        password: string,
        confirmPassword?: string,
        profileImage?: Asset | null
    ) => {
        if (!name.trim() || !email.trim() || !password.trim()) {
            alert(t('common.error'), t('error.fillAllFields'));
            return false;
        }
        if (!EMAIL_REGEX.test(email.trim().toLowerCase())) {
            alert(t('common.error'), t('error.validEmail'));
            return false;
        }
        if (confirmPassword !== undefined && password !== confirmPassword) {
            alert(t('common.error'), t('error.passwordsDoNotMatch'));
            return false;
        }
        if (password.length < 6) {
            alert(t('common.error'), t('error.passwordMin'));
            return false;
        }

        const normalizedEmail = email.trim().toLowerCase();
        const trimmedName = name.trim();
        const avatarPayload = profileImage?.uri
            ? {
                uri: profileImage.uri,
                name: profileImage.fileName,
                type: profileImage.type,
            }
            : undefined;

        setLoading(true);
        try {
            const res = await authApi.register(
                normalizedEmail,
                trimmedName,
                password,
                avatarPayload,
                'user',
                true,
            );
            const successMessage = extractApiMessage(res) || t('auth.accountCreatedSuccess');
            const avatarFromApi = extractAvatarUri(res.user);
            const userWithAvatar =
                avatarFromApi !== undefined
                    ? {
                        ...res.user,
                        avatarUrl: avatarFromApi,
                        avatarUri: avatarFromApi,
                    }
                    : profileImage?.uri
                        ? { ...res.user, avatarUri: profileImage.uri }
                        : res.user;

            setAuth(userWithAvatar, res.accessToken, res.refreshToken);

            alert(t('auth.registrationSuccessful'), successMessage, [
                { text: t('common.continue') },
            ]);
            return true;
        } catch (err: unknown) {
            const parseFailure = isLikelyJsonParseError(err);
            const response = isApiRecord(err) && isApiRecord(err.response)
                ? err.response
                : null;
            const internetAccessState =
                !response && !parseFailure
                    ? await getInternetAccessState()
                    : 'unknown';

            if (!response && !parseFailure && internetAccessState === 'offline') {
                alert(
                    t('auth.registrationFailed'),
                    getUnreachableApiMessage(t),
                );
                return false;
            }

            const errorMessage = extractApiMessage(getApiErrorData(err));
            const fallbackMessage =
                response || internetAccessState === 'online'
                    ? registrationFallbackMessage
                    : getUnreachableApiMessage(t);

            alert(
                t('auth.registrationFailed'),
                errorMessage ||
                    (parseFailure
                        ? registrationFallbackMessage
                        : fallbackMessage),
            );
            return false;
        } finally {
            setLoading(false);
        }
    };

    return {
        login,
        loginWithGoogle,
        register,
        loading,
        pendingRegistrationsCount,
        isSyncingOfflineRegistrations: isSyncing,
    };
}
