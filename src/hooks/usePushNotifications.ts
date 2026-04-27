import { useEffect, useRef } from 'react';
import { AppState, PermissionsAndroid, Platform } from 'react-native';
import messaging, {
    FirebaseMessagingTypes,
} from '@react-native-firebase/messaging';
import { notificationsApi } from '../api/resources/notifications';
import { extractApiMessage } from '../utils/platform/api';
import {
    flushPendingNotificationDestination,
    openNotificationDestination,
} from '../navigation/navigationBridge';
import { showGlobalAlert } from '../components/alerts/alertBridge';
import { useAuthStore } from '../store/authStore';
import { AppLanguage, translate } from '../i18n/index';
import { usePreferencesStore } from '../store/preferencesStore';

function t(key: 'common.ok' | 'push.defaultTitle' | 'push.defaultBody') {
    const language = usePreferencesStore.getState().language;
    return translate(language, key);
}

function getDevicePlatform(): 'ANDROID' | 'IOS' {
    return Platform.OS === 'ios' ? 'IOS' : 'ANDROID';
}

async function requestNotificationPermission(): Promise<boolean> {
    if (Platform.OS === 'ios') {
        await messaging().registerDeviceForRemoteMessages();
        const status = await messaging().requestPermission();

        return (
            status === messaging.AuthorizationStatus.AUTHORIZED
            || status === messaging.AuthorizationStatus.PROVISIONAL
        );
    }

    if (Platform.OS === 'android' && typeof Platform.Version === 'number' && Platform.Version >= 33) {
        const result = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );

        return result === PermissionsAndroid.RESULTS.GRANTED;
    }

    return true;
}

async function syncCurrentDeviceToken(
    language: AppLanguage,
): Promise<string | null> {
    const token = (await messaging().getToken()).trim();
    if (!token) {
        return null;
    }

    await notificationsApi.registerDeviceToken({
        token,
        platform: getDevicePlatform(),
        language,
    });

    return token;
}

function getNotificationTitle(
    remoteMessage: FirebaseMessagingTypes.RemoteMessage,
): string {
    const title = remoteMessage.notification?.title?.trim();
    return title?.length ? title : t('push.defaultTitle');
}

function getNotificationBody(
    remoteMessage: FirebaseMessagingTypes.RemoteMessage,
): string {
    const body = remoteMessage.notification?.body?.trim();
    return body?.length ? body : t('push.defaultBody');
}

function handleOpenedNotification(
    remoteMessage: FirebaseMessagingTypes.RemoteMessage | null,
) {
    if (!remoteMessage) {
        return;
    }

    openNotificationDestination(remoteMessage.data);
}

export function usePushNotifications() {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const isLoading = useAuthStore((state) => state.isLoading);
    const language = usePreferencesStore((state) => state.language);
    const syncInFlightRef = useRef(false);

    useEffect(() => {
        if (!isAuthenticated || isLoading) {
            return;
        }

        let isMounted = true;
        let retryTimeout: ReturnType<typeof setTimeout> | null = null;
        let appState = AppState.currentState;

        const clearRetryTimeout = () => {
            if (!retryTimeout) {
                return;
            }
            clearTimeout(retryTimeout);
            retryTimeout = null;
        };

        const scheduleRetry = () => {
            if (!isMounted || retryTimeout) {
                return;
            }

            retryTimeout = setTimeout(() => {
                retryTimeout = null;
                void bootstrap('retry');
            }, 30000);
        };

        const bootstrap = async (reason: 'initial' | 'retry' | 'foreground') => {
            if (syncInFlightRef.current) {
                return;
            }

            syncInFlightRef.current = true;
            try {
                const granted = await requestNotificationPermission();
                if (!granted || !isMounted) {
                    clearRetryTimeout();
                    return;
                }

                const token = await syncCurrentDeviceToken(language);
                if (token) {
                    console.info(`[push] token synced (${reason})`);
                }
                flushPendingNotificationDestination();
                clearRetryTimeout();
            } catch (error) {
                console.warn(
                    '[push] failed to initialize notifications',
                    extractApiMessage((error as { response?: { data?: unknown } })?.response?.data)
                    || (error instanceof Error ? error.message : String(error)),
                );
                scheduleRetry();
            } finally {
                syncInFlightRef.current = false;
            }
        };

        void bootstrap('initial');

        const unsubscribeOnMessage = messaging().onMessage(async (remoteMessage) => {
            showGlobalAlert(
                getNotificationTitle(remoteMessage),
                getNotificationBody(remoteMessage),
                [
                    {
                        text: t('common.ok'),
                        onPress: () => handleOpenedNotification(remoteMessage),
                    },
                ],
                { cancelable: true },
            );
        });

        const unsubscribeOnOpen = messaging().onNotificationOpenedApp(
            handleOpenedNotification,
        );

        const unsubscribeOnTokenRefresh = messaging().onTokenRefresh(
            async (token) => {
                try {
                    const normalized = token.trim();
                    if (!normalized) {
                        return;
                    }

                    await notificationsApi.registerDeviceToken({
                        token: normalized,
                        platform: getDevicePlatform(),
                        language,
                    });
                    console.info('[push] token refreshed and synced');
                } catch (error) {
                    console.warn(
                        '[push] failed to refresh device token',
                        error instanceof Error ? error.message : String(error),
                    );
                    scheduleRetry();
                }
            },
        );

        const appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
            const wasBackgrounded = appState === 'inactive' || appState === 'background';
            appState = nextAppState;

            if (wasBackgrounded && nextAppState === 'active') {
                void bootstrap('foreground');
            }
        });

        messaging()
            .getInitialNotification()
            .then(handleOpenedNotification)
            .catch((error) => {
                console.warn(
                    '[push] failed to resolve initial notification',
                    error instanceof Error ? error.message : String(error),
                );
            });

        return () => {
            isMounted = false;
            clearRetryTimeout();
            unsubscribeOnMessage();
            unsubscribeOnOpen();
            unsubscribeOnTokenRefresh();
            appStateSubscription.remove();
        };
    }, [isAuthenticated, isLoading, language]);
}
