import { useEffect } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
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
import { translate } from '../i18n/index';
import { usePreferencesStore } from '../store/preferencesStore';

const FALLBACK_NOTIFICATION_TITLE = 'New notification';
const FALLBACK_NOTIFICATION_BODY = 'Open BudgetApp to review the latest update.';

function t(key: 'common.ok') {
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

async function syncCurrentDeviceToken(): Promise<string | null> {
    const token = (await messaging().getToken()).trim();
    if (!token) {
        return null;
    }

    await notificationsApi.registerDeviceToken({
        token,
        platform: getDevicePlatform(),
    });

    return token;
}

function getNotificationTitle(
    remoteMessage: FirebaseMessagingTypes.RemoteMessage,
): string {
    const title = remoteMessage.notification?.title?.trim();
    return title?.length ? title : FALLBACK_NOTIFICATION_TITLE;
}

function getNotificationBody(
    remoteMessage: FirebaseMessagingTypes.RemoteMessage,
): string {
    const body = remoteMessage.notification?.body?.trim();
    return body?.length ? body : FALLBACK_NOTIFICATION_BODY;
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

    useEffect(() => {
        if (!isAuthenticated || isLoading) {
            return;
        }

        let isMounted = true;

        const bootstrap = async () => {
            try {
                const granted = await requestNotificationPermission();
                if (!granted || !isMounted) {
                    return;
                }

                await syncCurrentDeviceToken();
                flushPendingNotificationDestination();
            } catch (error) {
                console.warn(
                    '[push] failed to initialize notifications',
                    extractApiMessage((error as { response?: { data?: unknown } })?.response?.data)
                    || (error instanceof Error ? error.message : String(error)),
                );
            }
        };

        void bootstrap();

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
                    });
                } catch (error) {
                    console.warn(
                        '[push] failed to refresh device token',
                        error instanceof Error ? error.message : String(error),
                    );
                }
            },
        );

        void messaging()
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
            unsubscribeOnMessage();
            unsubscribeOnOpen();
            unsubscribeOnTokenRefresh();
        };
    }, [isAuthenticated, isLoading]);
}
