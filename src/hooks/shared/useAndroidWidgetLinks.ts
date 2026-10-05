import { useEffect } from 'react';
import { Linking } from 'react-native';
import {
    openDashboardRefreshDestination,
    openNotificationDestination,
    openQuickAddDestination,
} from '../../navigation/navigationBridge';
import { parseAndroidWidgetUrl } from '../../utils/platform/androidQuickAddWidget';

let hasConsumedInitialUrl = false;

export function useAndroidWidgetLinks(enabled: boolean): void {
    useEffect(() => {
        if (!enabled) {
            return;
        }

        let isActive = true;
        const openUrl = (url: string) => {
            const link = parseAndroidWidgetUrl(url);

            if (!link) {
                return;
            }

            if (link.type === 'refresh') {
                openDashboardRefreshDestination();
                return;
            }

            if (link.type === 'statement') {
                openNotificationDestination({
                    targetScreen: 'StatementDetail',
                    statementId: link.id,
                });
                return;
            }

            if (link.type === 'upcoming-payments') {
                openNotificationDestination({
                    targetScreen: 'UpcomingSubscriptions',
                    upcomingDays: String(link.days),
                });
                return;
            }

            openQuickAddDestination(link.tab);
        };

        if (!hasConsumedInitialUrl) {
            hasConsumedInitialUrl = true;
            Linking.getInitialURL()
                .then((url) => {
                    if (isActive && url) {
                        openUrl(url);
                    }
                })
                .catch(() => {
                    // A launcher shortcut must never block normal app startup.
                });
        }

        const subscription = Linking.addEventListener('url', ({ url }) => {
            openUrl(url);
        });

        return () => {
            isActive = false;
            subscription.remove();
        };
    }, [enabled]);
}
