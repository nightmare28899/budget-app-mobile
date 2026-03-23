import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useOfflineRegistrationStore } from '../store/offlineRegistrationStore';
import { useAppAlert } from '../components/alerts/AlertProvider';
import { authApi } from '../api/auth';
import { extractApiMessage } from '../utils/api';
import { API_BASE_URL } from '../utils/constants';
import { Asset } from 'react-native-image-picker';
import { extractAvatarUri } from '../utils/media';
import { useI18n } from './useI18n';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getUnreachableApiMessage(t: ReturnType<typeof useI18n>['t']) {
    if (__DEV__) {
        return t('network.cannotReachApi', { baseUrl: API_BASE_URL });
    }

    return t('network.cannotReachServer');
}

export function useAuth() {
    const [loading, setLoading] = useState(false);
    const setAuth = useAuthStore((s) => s.setAuth);
    const { addToQueue, isSyncing, queue } = useOfflineRegistrationStore();
    const pendingRegistrationsCount = queue.length;
    const { alert } = useAppAlert();
    const { t } = useI18n();

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
            setAuth(res.user, res.accessToken, res.refreshToken);
            return true;
        } catch (err: any) {
            const apiMessage = extractApiMessage(err?.response?.data);
            const message = err?.response
                ? apiMessage || t('auth.invalidCredentials')
                : getUnreachableApiMessage(t);

            alert(t('auth.loginFailed'), message);
            return false;
        } finally {
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
            );
            const successMessage = extractApiMessage(res) || t('auth.accountCreatedSuccess');

            alert(t('auth.registrationSuccessful'), successMessage, [
                {
                    text: t('common.continue'),
                    onPress: () => {
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
                    },
                },
            ]);
            return true;
        } catch (err: any) {
            if (!err?.response) {
                const result = addToQueue({
                    email: normalizedEmail,
                    name: trimmedName,
                    password,
                    avatar: avatarPayload,
                });

                if (result.reason === 'duplicate_email') {
                    alert(
                        t('auth.registrationPending'),
                        t('auth.registrationPendingDesc'),
                    );
                } else {
                    alert(
                        t('auth.savedOffline'),
                        t('auth.savedOfflineDesc'),
                    );
                }
                return false;
            }

            const errorMessage = extractApiMessage(err?.response?.data);
            alert(
                t('auth.registrationFailed'),
                errorMessage || getUnreachableApiMessage(t),
            );
            return false;
        } finally {
            setLoading(false);
        }
    };

    return {
        login,
        register,
        loading,
        pendingRegistrationsCount,
        isSyncingOfflineRegistrations: isSyncing,
    };
}
