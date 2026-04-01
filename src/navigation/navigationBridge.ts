import {
    createNavigationContainerRef,
    StackActions,
} from '@react-navigation/native';
import { RootStackParamList } from './types';
import { PremiumFeature } from '../types/premium';

export const rootNavigationRef = createNavigationContainerRef<RootStackParamList>();
type NotificationData = Record<string, unknown>;

let pendingNotificationData: NotificationData | undefined;

function readString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim().length ? value : undefined;
}

function parseUpcomingDays(value?: string): number | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }

    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < 0) {
        return undefined;
    }

    return parsed;
}

export function resetToMainDashboard(): boolean {
    if (!rootNavigationRef.isReady()) {
        return false;
    }

    rootNavigationRef.resetRoot({
        index: 0,
        routes: [
            {
                name: 'Main',
                params: {
                    screen: 'Tabs',
                    params: {
                        screen: 'Dashboard',
                    },
                },
            },
        ],
    });
    return true;
}

export function openNotificationDestination(
    data?: NotificationData,
): boolean {
    if (!data) {
        return false;
    }

    if (!rootNavigationRef.isReady()) {
        pendingNotificationData = data;
        return false;
    }

    if (
        readString(data.targetScreen) === 'UpcomingSubscriptions'
        || readString(data.type) === 'subscription_reminder'
    ) {
        rootNavigationRef.navigate('Main', {
            screen: 'UpcomingSubscriptions',
            params: {
                upcomingDays: parseUpcomingDays(readString(data.upcomingDays)) ?? 3,
            },
        });
        return true;
    }

    rootNavigationRef.navigate('Main', {
        screen: 'Tabs',
        params: {
            screen: 'Dashboard',
        },
    });
    return true;
}

export function flushPendingNotificationDestination(): boolean {
    if (!pendingNotificationData) {
        return false;
    }

    const next = pendingNotificationData;
    pendingNotificationData = undefined;
    return openNotificationDestination(next);
}

export function openPremiumPaywall(feature: PremiumFeature): boolean {
    if (!rootNavigationRef.isReady()) {
        return false;
    }

    const currentRoute = rootNavigationRef.getCurrentRoute();
    if (
        currentRoute?.name === 'PremiumPaywall'
        && currentRoute.params?.feature === feature
    ) {
        return true;
    }

    rootNavigationRef.dispatch(
        StackActions.push('PremiumPaywall', { feature }),
    );
    return true;
}
