import {
    createNavigationContainerRef,
    StackActions,
} from '@react-navigation/native';
import { RootStackParamList } from './types';
import { PremiumFeature } from '../types/premium';
import type { QuickAddEntryTab } from '../utils/platform/androidQuickAddWidget';

export const rootNavigationRef = createNavigationContainerRef<RootStackParamList>();
type NotificationData = Record<string, unknown>;

let pendingNotificationData: NotificationData | undefined;
let pendingQuickAddTab: QuickAddEntryTab | undefined;
let dashboardRefreshHandler: (() => void) | undefined;
let hasPendingDashboardRefresh = false;

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

    const statementId = readString(data.statementId);
    if (readString(data.targetScreen) === 'StatementDetail' && statementId) {
        rootNavigationRef.navigate('StatementDetail', { id: statementId });
        return true;
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

    if (
        readString(data.targetScreen) === 'Notifications'
        || readString(data.type) === 'financial_insight'
    ) {
        rootNavigationRef.navigate('Main', {
            screen: 'Notifications',
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

export function openQuickAddDestination(initialTab: QuickAddEntryTab): boolean {
    if (!rootNavigationRef.isReady()) {
        pendingQuickAddTab = initialTab;
        return false;
    }

    rootNavigationRef.dispatch(
        StackActions.push('AddEntry', { initialTab }),
    );
    return true;
}

export function flushPendingQuickAddDestination(): boolean {
    if (!pendingQuickAddTab) {
        return false;
    }

    const initialTab = pendingQuickAddTab;
    pendingQuickAddTab = undefined;
    return openQuickAddDestination(initialTab);
}

export function registerDashboardRefreshHandler(
    handler: () => void,
): () => void {
    dashboardRefreshHandler = handler;

    if (hasPendingDashboardRefresh) {
        hasPendingDashboardRefresh = false;
        handler();
    }

    return () => {
        if (dashboardRefreshHandler === handler) {
            dashboardRefreshHandler = undefined;
        }
    };
}

export function openDashboardRefreshDestination(): boolean {
    if (!rootNavigationRef.isReady()) {
        hasPendingDashboardRefresh = true;
        return false;
    }

    resetToMainDashboard();

    if (dashboardRefreshHandler) {
        dashboardRefreshHandler();
    } else {
        // The dashboard refreshes as soon as it registers after mounting.
        hasPendingDashboardRefresh = true;
    }

    return true;
}

export function flushPendingDashboardRefresh(): boolean {
    if (!hasPendingDashboardRefresh) {
        return false;
    }

    hasPendingDashboardRefresh = false;
    return openDashboardRefreshDestination();
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
