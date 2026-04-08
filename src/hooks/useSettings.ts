import { useEffect, useMemo, useState } from 'react';
import { Linking, PermissionsAndroid, Platform } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import auth from '@react-native-firebase/auth';
import messaging from '@react-native-firebase/messaging';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import {
    ImagePickerResponse,
    launchCamera,
    launchImageLibrary,
} from 'react-native-image-picker';
import { useAuthStore } from '../store/authStore';
import { useAppAlert } from '../components/alerts/AlertProvider';
import apiClient from '../api/client';
import { authApi } from '../api/auth';
import { reportsApi } from '../api/reports';
import { extractApiMessage } from '../utils/api';
import { API_BASE_URL } from '../utils/constants';
import { BudgetPeriod, User } from '../types';
import { notificationsApi } from '../api/notifications';
import { DEFAULT_CURRENCY, normalizeCurrency } from '../utils/currency';
import {
    extractAvatarUri,
    isLikelyInternalRemoteUri,
    isRemoteHttpUri,
    normalizeImageUri,
} from '../utils/media';
import {
    BUDGET_PERIODS,
    budgetLabel,
    normalizeBudgetPeriod,
} from '../utils/budget';
import { toNum } from '../utils/number';
import { useI18n } from './useI18n';
import { useTheme } from '../theme';
import { ThemeMode } from '../theme/themes';

function inferImageMimeType(filename?: string): string {
    const lower = filename?.toLowerCase() || '';
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.webp')) return 'image/webp';
    if (lower.endsWith('.heic')) return 'image/heic';
    if (lower.endsWith('.heif')) return 'image/heif';
    return 'image/jpeg';
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidIsoDate(value: string): boolean {
    if (!ISO_DATE_RE.test(value)) {
        return false;
    }

    const parsed = new Date(`${value}T00:00:00`);
    return !Number.isNaN(parsed.getTime());
}

export function useSettings() {
    const { user, setUser, setAvatarSuppressed, logout, isAuthenticated, isGuest } = useAuthStore();
    const queryClient = useQueryClient();
    const { alert } = useAppAlert();
    const { t, language, setLanguage } = useI18n();
    const {
        themeMode,
        setThemeMode,
        resolvedThemeId,
        themeOptions,
    } = useTheme();

    const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
    const [budgetAmount, setBudgetAmount] = useState(
        String(toNum(user?.budgetAmount ?? user?.dailyBudget)),
    );
    const [currency, setCurrency] = useState(
        normalizeCurrency(user?.currency, DEFAULT_CURRENCY),
    );
    const [budgetPeriod, setBudgetPeriod] = useState<BudgetPeriod>(
        normalizeBudgetPeriod(user?.budgetPeriod, 'daily'),
    );
    const [budgetPeriodStart, setBudgetPeriodStart] = useState(
        typeof user?.budgetPeriodStart === 'string' ? user.budgetPeriodStart : '',
    );
    const [budgetPeriodEnd, setBudgetPeriodEnd] = useState(
        typeof user?.budgetPeriodEnd === 'string' ? user.budgetPeriodEnd : '',
    );
    const [name, setName] = useState(user?.name ?? '');
    const [pendingAvatarUploadUri, setPendingAvatarUploadUri] = useState<string | null>(null);

    useEffect(() => {
        setBudgetAmount(String(toNum(user?.budgetAmount ?? user?.dailyBudget)));
        setCurrency(normalizeCurrency(user?.currency, DEFAULT_CURRENCY));
        setBudgetPeriod(normalizeBudgetPeriod(user?.budgetPeriod, 'daily'));
        setBudgetPeriodStart(
            typeof user?.budgetPeriodStart === 'string' ? user.budgetPeriodStart : '',
        );
        setBudgetPeriodEnd(
            typeof user?.budgetPeriodEnd === 'string' ? user.budgetPeriodEnd : '',
        );
        setName(user?.name ?? '');
    }, [
        user?.budgetAmount,
        user?.dailyBudget,
        user?.currency,
        user?.budgetPeriod,
        user?.budgetPeriodStart,
        user?.budgetPeriodEnd,
        user?.name,
    ]);

    const avatarUri = useMemo(() => {
        const preferredAvatar =
            user?.avatarUri !== undefined ? user.avatarUri : user?.avatarUrl;
        return normalizeImageUri(preferredAvatar ?? null);
    }, [user?.avatarUri, user?.avatarUrl]);

    const fallbackInitial = (user?.name?.trim()?.charAt(0) || 'U').toUpperCase();

    useEffect(() => {
        setAvatarLoadFailed(false);
    }, [avatarUri]);

    const parseResponsePayload = async (response: Response) => {
        const rawText = await response.text();
        const trimmed = rawText.trim();

        if (!trimmed) {
            return null;
        }

        try {
            return JSON.parse(trimmed);
        } catch {
            return trimmed;
        }
    };

    const patchProfileMultipart = async (
        payload: Record<string, string | number>,
        localAvatarUri: string,
    ) => {
        const formData = new FormData();
        Object.entries(payload).forEach(([key, value]) => {
            formData.append(key, String(value));
        });

        const filename =
            localAvatarUri.split('/').pop() || `avatar-${Date.now()}.jpg`;
        formData.append('avatar', {
            uri: localAvatarUri,
            name: filename,
            type: inferImageMimeType(filename),
        } as any);

        const accessToken = useAuthStore.getState().accessToken;
        const response = await fetch(`${API_BASE_URL}/users/me`, {
            method: 'PATCH',
            headers: {
                Accept: 'application/json',
                ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
            },
            body: formData,
        });

        const responsePayload = await parseResponsePayload(response);
        if (!response.ok) {
            const error: any = new Error(
                extractApiMessage(responsePayload)
                || `Request failed with status ${response.status}`,
            );
            error.response = {
                status: response.status,
                data: responsePayload,
            };
            throw error;
        }

        return (responsePayload as any)?.user ?? responsePayload;
    };

    const normalizeUpdatedUser = (data: any): User => {
        const budgetAmountValue = toNum(
            data?.budgetAmount ??
            data?.dailyBudget ??
            user?.budgetAmount ??
            user?.dailyBudget,
        );
        const nextBudgetPeriod = normalizeBudgetPeriod(
            data?.budgetPeriod ?? user?.budgetPeriod,
            'daily',
        );
        const nextBudgetPeriodStart =
            data?.budgetPeriodStart !== undefined
                ? (
                    typeof data?.budgetPeriodStart === 'string'
                        ? data.budgetPeriodStart
                        : null
                )
                : (
                    typeof user?.budgetPeriodStart === 'string'
                        ? user.budgetPeriodStart
                        : null
                );
        const nextBudgetPeriodEnd =
            data?.budgetPeriodEnd !== undefined
                ? (
                    typeof data?.budgetPeriodEnd === 'string'
                        ? data.budgetPeriodEnd
                        : null
                )
                : (
                    typeof user?.budgetPeriodEnd === 'string'
                        ? user.budgetPeriodEnd
                        : null
                );
        const avatarFromApi = extractAvatarUri(data);
        const currentLocalAvatarUri = normalizeImageUri(user?.avatarUri ?? null);
        const keepLocalAvatarPreview =
            !!currentLocalAvatarUri &&
            !isRemoteHttpUri(currentLocalAvatarUri) &&
            typeof avatarFromApi === 'string' &&
            isLikelyInternalRemoteUri(avatarFromApi);

        const resolvedAvatarUrl =
            avatarFromApi !== undefined
                ? avatarFromApi
                : normalizeImageUri(user?.avatarUrl ?? null);
        const resolvedAvatarUri =
            keepLocalAvatarPreview
                ? currentLocalAvatarUri
                : avatarFromApi !== undefined
                    ? avatarFromApi
                    : normalizeImageUri(user?.avatarUri ?? user?.avatarUrl ?? resolvedAvatarUrl);

        return {
            id: data?.id ?? user?.id ?? '',
            email: data?.email ?? user?.email ?? '',
            name: data?.name ?? user?.name ?? '',
            currency: normalizeCurrency(data?.currency ?? user?.currency, DEFAULT_CURRENCY),
            dailyBudget: budgetAmountValue,
            budgetAmount: budgetAmountValue,
            budgetPeriod: nextBudgetPeriod,
            budgetPeriodStart: nextBudgetPeriodStart,
            budgetPeriodEnd: nextBudgetPeriodEnd,
            avatarUrl: resolvedAvatarUrl,
            avatarUri: resolvedAvatarUri,
            createdAt: data?.createdAt ?? user?.createdAt,
        };
    };

    const updateLocalAvatar = (nextAvatarUri: string | null) => {
        if (!user) {
            return;
        }

        setUser({
            ...user,
            avatarUri: nextAvatarUri,
            avatarUrl: nextAvatarUri ? user.avatarUrl : null,
        });
    };

    const onImagePicked = (result: ImagePickerResponse) => {
        if (result.didCancel) {
            return;
        }

        if (result.errorCode) {
            alert(t('image.error'), result.errorMessage || t('image.selectFailed'));
            return;
        }

        const selectedAsset = result.assets?.[0];
        const pickedUri = selectedAsset?.uri;
        if (!pickedUri) {
            alert(t('image.error'), t('image.readFailed'));
            return;
        }

        setPendingAvatarUploadUri(pickedUri);
        setAvatarSuppressed(false);
        updateLocalAvatar(pickedUri);
    };

    const ensureCameraPermission = async () => {
        if (Platform.OS !== 'android') {
            return true;
        }

        const permission = PermissionsAndroid.PERMISSIONS.CAMERA;
        const hasPermission = await PermissionsAndroid.check(permission);
        if (hasPermission) {
            return true;
        }

        const result = await PermissionsAndroid.request(permission, {
            title: t('camera.permissionTitle'),
            message: t('camera.permissionMessage'),
            buttonPositive: t('camera.allow'),
            buttonNegative: t('camera.deny'),
            buttonNeutral: t('camera.later'),
        });

        if (result === PermissionsAndroid.RESULTS.GRANTED) {
            return true;
        }

        if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
            alert(t('camera.blockedTitle'), t('camera.blockedMessage'), [
                {
                    text: t('camera.openSettings'),
                    onPress: () => {
                        Linking.openSettings().catch(() => {
                            alert(
                                t('camera.permissionTitleGeneric'),
                                t('camera.openSettingsFailed'),
                            );
                        });
                    },
                },
                { text: t('common.cancel'), style: 'cancel' },
            ]);
            return false;
        }

        alert(t('camera.permissionDeniedTitle'), t('camera.permissionDeniedMessage'));
        return false;
    };

    const onTakePhoto = async () => {
        try {
            const hasPermission = await ensureCameraPermission();
            if (!hasPermission) {
                return;
            }

            const result = await launchCamera({
                mediaType: 'photo',
                quality: 0.8,
                maxWidth: 1024,
                maxHeight: 1024,
                saveToPhotos: false,
                cameraType: 'front',
            });
            onImagePicked(result);
        } catch {
            alert(t('image.error'), t('image.openCameraFailed'));
        }
    };

    const onChooseFromGallery = async () => {
        try {
            const result = await launchImageLibrary({
                mediaType: 'photo',
                selectionLimit: 1,
                quality: 0.8,
                maxWidth: 1024,
                maxHeight: 1024,
            });
            onImagePicked(result);
        } catch {
            alert(t('image.error'), t('image.selectFailed'));
        }
    };

    const onRemovePhoto = () => {
        if (!avatarUri) {
            return;
        }

        alert(t('profileImage.removeTitle'), t('profileImage.removeMessage'), [
            { text: t('common.cancel'), style: 'cancel' },
            {
                text: t('common.remove'),
                style: 'destructive',
                onPress: () => {
                    setPendingAvatarUploadUri(null);
                    setAvatarSuppressed(true);
                    updateLocalAvatar(null);
                },
            },
        ]);
    };

    const onPickProfileImage = () => {
        const buttons: Parameters<typeof alert>[2] = [
            { text: t('profileImage.takePhoto'), onPress: () => { onTakePhoto(); } },
            {
                text: t('profileImage.chooseGallery'),
                onPress: () => {
                    onChooseFromGallery();
                },
            },
        ];

        if (avatarUri) {
            buttons.push({
                text: t('profileImage.removeTitle'),
                style: 'destructive',
                onPress: () => {
                    onRemovePhoto();
                },
            });
        }

        buttons.push({ text: t('common.cancel'), style: 'cancel' });
        alert(t('profileImage.title'), t('profileImage.message'), buttons);
    };

    const onSelectBudgetPeriod = () => {
        const options: Parameters<typeof alert>[2] = BUDGET_PERIODS.map((period) => ({
            text: budgetLabel(period, t),
            onPress: () => {
                setBudgetPeriod(period);
                if (period !== 'period') {
                    setBudgetPeriodStart('');
                    setBudgetPeriodEnd('');
                }
            },
        }));
        options.push({ text: t('common.cancel'), style: 'cancel' });

        alert(t('settings.budgetPeriod'), t('settings.selectBudgetPeriod'), options);
    };

    const isUnknownAvatarDeleteFieldError = (error: any) => {
        if (error?.response?.status !== 400) {
            return false;
        }

        const message = extractApiMessage(error?.response?.data)?.toLowerCase() || '';
        const mentionsAvatarDeleteField =
            message.includes('removeavatar') ||
            message.includes('avatarurl') ||
            message.includes('avataruri');
        const indicatesUnknownField =
            message.includes('should not exist') ||
            message.includes('not allowed') ||
            message.includes('unknown');

        return mentionsAvatarDeleteField && indicatesUnknownField;
    };

    const updateMutation = useMutation({
        mutationFn: async (data: {
            name?: string;
            budgetAmount?: number;
            budgetPeriod?: BudgetPeriod;
            budgetPeriodStart?: string;
            budgetPeriodEnd?: string;
            currency?: string;
            avatarUri?: string | null;
            avatarUploadUri?: string | null;
        }) => {
            const payload: Record<string, string | number> = {};
            if (data.name !== undefined) {
                payload.name = data.name;
            }

            if (data.budgetAmount !== undefined) {
                payload.budgetAmount = data.budgetAmount;
            }

            if (data.budgetPeriod) {
                payload.budgetPeriod = data.budgetPeriod;
                if (data.budgetPeriod === 'period') {
                    if (data.budgetPeriodStart) {
                        payload.budgetPeriodStart = data.budgetPeriodStart;
                    }
                    if (data.budgetPeriodEnd) {
                        payload.budgetPeriodEnd = data.budgetPeriodEnd;
                    }
                }
            }

            if (data.currency) {
                payload.currency = data.currency;
            }

            const trimmedAvatarUploadUri =
                typeof data.avatarUploadUri === 'string'
                    ? data.avatarUploadUri.trim()
                    : null;

            if (!useAuthStore.getState().isAuthenticated) {
                if (!user) {
                    throw new Error('Guest profile is not available');
                }

                const nextPeriod = data.budgetPeriod
                    ? data.budgetPeriod
                    : normalizeBudgetPeriod(user.budgetPeriod, 'daily');
                const wantsAvatarRemoval = data.avatarUri === null;
                const nextAvatarUri = wantsAvatarRemoval
                    ? null
                    : trimmedAvatarUploadUri
                        ? trimmedAvatarUploadUri
                        : data.avatarUri !== undefined
                            ? data.avatarUri
                            : user.avatarUri ?? user.avatarUrl ?? null;

                return normalizeUpdatedUser({
                    ...user,
                    name: data.name ?? user.name,
                    budgetAmount:
                        data.budgetAmount ?? user.budgetAmount ?? user.dailyBudget,
                    dailyBudget:
                        data.budgetAmount ?? user.dailyBudget ?? user.budgetAmount,
                    budgetPeriod: nextPeriod,
                    budgetPeriodStart:
                        nextPeriod === 'period'
                            ? data.budgetPeriodStart
                                ?? user.budgetPeriodStart
                            : null,
                    budgetPeriodEnd:
                        nextPeriod === 'period'
                            ? data.budgetPeriodEnd
                                ?? user.budgetPeriodEnd
                            : null,
                    currency: data.currency ?? user.currency,
                    avatarUri: nextAvatarUri,
                    avatarUrl: nextAvatarUri,
                });
            }

            if (trimmedAvatarUploadUri) {
                return patchProfileMultipart(payload, trimmedAvatarUploadUri);
            }

            const wantsAvatarRemoval = data.avatarUri === null;
            if (wantsAvatarRemoval) {
                const avatarRemovalPayloads: Array<Record<string, string | number | boolean | null>> = [
                    { ...payload, removeAvatar: true },
                    { ...payload, avatarUri: null },
                    { ...payload, avatarUrl: null },
                ];

                for (const candidate of avatarRemovalPayloads) {
                    try {
                        const { data: updated } = await apiClient.patch('/users/me', candidate);
                        return (updated?.user ?? updated);
                    } catch (error: any) {
                        if (!isUnknownAvatarDeleteFieldError(error)) {
                            throw error;
                        }
                    }
                }
            }

            const { data: updated } = await apiClient.patch('/users/me', payload);
            return (updated?.user ?? updated);
        },
        onSuccess: (data) => {
            setPendingAvatarUploadUri(null);
            setUser(normalizeUpdatedUser(data));
            queryClient.invalidateQueries({ queryKey: ['users', 'me'] });
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            queryClient.invalidateQueries({ queryKey: ['analytics'] });
            queryClient.invalidateQueries({ queryKey: ['income-summary'] });
            alert(t('common.success'), t('settings.updated'));
            const nextBudgetAmount = toNum(data?.budgetAmount ?? data?.dailyBudget);
            setBudgetAmount(
                data?.budgetAmount !== undefined || data?.dailyBudget !== undefined
                    ? String(nextBudgetAmount)
                    : budgetAmount,
            );
            setCurrency(normalizeCurrency(data?.currency ?? user?.currency, DEFAULT_CURRENCY));
            const nextPeriod = normalizeBudgetPeriod(
                data?.budgetPeriod ?? budgetPeriod,
                'daily',
            );
            setBudgetPeriod(nextPeriod);
            setBudgetPeriodStart(
                nextPeriod === 'period' &&
                    typeof data?.budgetPeriodStart === 'string'
                    ? data.budgetPeriodStart
                    : nextPeriod === 'period'
                        ? budgetPeriodStart
                        : '',
            );
            setBudgetPeriodEnd(
                nextPeriod === 'period' &&
                    typeof data?.budgetPeriodEnd === 'string'
                    ? data.budgetPeriodEnd
                    : nextPeriod === 'period'
                        ? budgetPeriodEnd
                        : '',
            );
        },
        onError: (err: any) => {
            const apiMessage = extractApiMessage(err?.response?.data);
            const fallback = t('settings.failedUpdate', { baseUrl: API_BASE_URL });
            const technical =
                typeof err?.message === 'string' && err.message.trim().length
                    ? ` (${err.message.trim()})`
                    : '';
            alert(
                t('common.error'),
                apiMessage ||
                `${fallback}${technical}`,
            );
        },
    });

    const onSave = () => {
        const budget = parseFloat(budgetAmount);
        if (isNaN(budget) || budget < 0) {
            alert(t('common.error'), t('settings.enterValidBudget'));
            return;
        }

        const trimmedStart = budgetPeriodStart.trim();
        const trimmedEnd = budgetPeriodEnd.trim();

        if (budgetPeriod === 'period') {
            if (!trimmedStart || !trimmedEnd) {
                alert(t('common.error'), t('settings.periodDatesRequired'));
                return;
            }

            if (!isValidIsoDate(trimmedStart) || !isValidIsoDate(trimmedEnd)) {
                alert(t('common.error'), t('settings.periodDateFormat'));
                return;
            }

            if (trimmedEnd < trimmedStart) {
                alert(t('common.error'), t('settings.periodEndBeforeStart'));
                return;
            }
        }

        updateMutation.mutate({
            name: name.trim(),
            budgetAmount: budget,
            currency,
            budgetPeriod,
            budgetPeriodStart: budgetPeriod === 'period' ? trimmedStart : undefined,
            budgetPeriodEnd: budgetPeriod === 'period' ? trimmedEnd : undefined,
            avatarUri,
            avatarUploadUri: pendingAvatarUploadUri,
        });
    };

    const onSaveProfile = () => {
        updateMutation.mutate({
            name: name.trim(),
            currency,
            avatarUri,
            avatarUploadUri: pendingAvatarUploadUri,
        });
    };

    const onLogout = () => {
        alert(t('settings.logoutTitle'), t('settings.logoutConfirm'), [
            { text: t('common.cancel'), style: 'cancel' },
            {
                text: t('common.logout'),
                style: 'destructive',
                onPress: async () => {
                    if (isAuthenticated) {
                        try {
                            const deviceToken = (await messaging().getToken()).trim();
                            if (deviceToken) {
                                await notificationsApi.removeDeviceToken(deviceToken);
                            }
                        } catch {
                            // Best-effort cleanup only.
                        }

                        try {
                            await auth().signOut();
                        } catch {
                            // Best-effort cleanup only.
                        }

                        try {
                            await GoogleSignin.signOut();
                        } catch {
                            // Best-effort cleanup only.
                        }

                        try {
                            await authApi.logout();
                        } catch {
                            // Best-effort cleanup only.
                        }
                    }

                    queryClient.clear();
                    logout();
                },
            },
        ]);
    };

    const onSeedCategories = async () => {
        try {
            await apiClient.post('/categories/seed');
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            alert(t('common.success'), t('settings.seedSuccess'));
        } catch (err: any) {
            alert(
                t('common.error'),
                extractApiMessage(err?.response?.data) || t('settings.seedFailed'),
            );
        }
    };

    const weeklyReportMutation = useMutation({
        mutationFn: reportsApi.sendWeeklyReport,
        onSuccess: () => {
            alert(t('settings.reportSentTitle'), t('settings.reportSentDesc'));
        },
        onError: (err: any) => {
            alert(
                t('common.error'),
                extractApiMessage(err?.response?.data) || t('settings.reportFailed'),
            );
        },
    });

    const onSendWeeklyReport = () => {
        const userEmail = user?.email?.trim();
        if (!userEmail) {
            alert(t('common.error'), t('settings.noEmail'));
            return;
        }

        alert(t('settings.sendWeeklyTitle'), t('settings.sendWeeklyConfirm'), [
            { text: t('common.cancel'), style: 'cancel' },
            {
                text: t('common.send'),
                onPress: () => weeklyReportMutation.mutate({ email: userEmail }),
            },
        ]);
    };

    const onSelectLanguage = () => {
        alert(t('settings.languageDialogTitle'), t('settings.languageDialogMessage'), [
            {
                text: t('language.english'),
                onPress: () => setLanguage('en'),
            },
            {
                text: t('language.spanish'),
                onPress: () => setLanguage('es'),
            },
            { text: t('common.cancel'), style: 'cancel' },
        ]);
    };

    const getThemeModeLabel = (mode: ThemeMode): string => {
        if (mode === 'system') {
            return t('settings.themeModeSystem');
        }
        if (mode === 'light') {
            return t('settings.themeModeLight');
        }
        if (mode === 'dark') {
            return t('settings.themeModeDark');
        }
        if (mode === 'custom-1') {
            return t('settings.themeModeCustom1');
        }
        if (mode === 'custom-2') {
            return t('settings.themeModeCustom2');
        }
        return t('settings.themeModeCustom3');
    };

    const onSelectTheme = () => {
        const options: Parameters<typeof alert>[2] = [
            {
                text: getThemeModeLabel('system'),
                onPress: () => setThemeMode('system'),
            },
            {
                text: getThemeModeLabel('light'),
                onPress: () => setThemeMode('light'),
            },
            {
                text: getThemeModeLabel('dark'),
                onPress: () => setThemeMode('dark'),
            },
            {
                text: getThemeModeLabel('custom-1'),
                onPress: () => setThemeMode('custom-1'),
            },
            {
                text: getThemeModeLabel('custom-2'),
                onPress: () => setThemeMode('custom-2'),
            },
            {
                text: getThemeModeLabel('custom-3'),
                onPress: () => setThemeMode('custom-3'),
            },
            { text: t('common.cancel'), style: 'cancel' },
        ];

        alert(t('settings.themeDialogTitle'), t('settings.themeDialogMessage'), options);
    };

    return {
        t,
        language,
        user,
        isAuthenticated,
        isGuest,
        name,
        setName,
        budgetAmount,
        setBudgetAmount,
        currency,
        setCurrency,
        budgetPeriod,
        setBudgetPeriod,
        budgetPeriodStart,
        setBudgetPeriodStart,
        budgetPeriodEnd,
        setBudgetPeriodEnd,
        avatarUri,
        avatarLoadFailed,
        setAvatarLoadFailed,
        fallbackInitial,
        isSavingSettings: updateMutation.isPending,
        isSendingWeeklyReport: weeklyReportMutation.isPending,
        themeMode,
        setThemeMode,
        resolvedThemeId,
        themeOptions,
        getThemeModeLabel,
        onPickProfileImage,
        onRemovePhoto,
        onSelectBudgetPeriod,
        onSave,
        onSaveProfile,
        onLogout,
        onSeedCategories,
        onSendWeeklyReport,
        onSelectLanguage,
        onSelectTheme,
    };
}
