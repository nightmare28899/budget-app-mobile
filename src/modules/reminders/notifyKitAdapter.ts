import notifee, {
    AlarmType,
    AndroidCategory,
    AndroidImportance,
    AndroidVisibility,
    AuthorizationStatus,
    Event,
    EventType,
    TriggerType,
} from 'react-native-notify-kit';
import type {
    ReminderNotificationPort,
    ScheduledReminder,
} from './reminderScheduler';
import type { ReminderDestination } from './reminderSupport';

export const REMINDER_CHANNEL_ID = 'payment_reminders';
/** Namespace of every notification id this module owns, so cancelling never touches anything else. */
export const REMINDER_ID_PREFIX = 'reminder:';
const THREAD_ID = 'payment_reminders';

type ChannelCopy = {
    channelName: () => string;
    channelDescription: () => string;
};

function isAllowed(status: AuthorizationStatus): boolean {
    return status === AuthorizationStatus.AUTHORIZED || status === AuthorizationStatus.PROVISIONAL;
}

/** Wraps react-native-notify-kit (maintained Notifee fork) behind the scheduler's port. */
export function createNotifyKitPort(copy: ChannelCopy): ReminderNotificationPort {
    /** Cancels our pending triggers except `keep`; ids outside the reminder namespace are never touched. */
    const cancelOurs = async (keep: ReadonlySet<string> = new Set()) => {
        const pending = await notifee.getTriggerNotificationIds();
        const ours = pending.filter(id => id.startsWith(REMINDER_ID_PREFIX) && !keep.has(id));
        if (ours.length > 0) {
            await notifee.cancelTriggerNotifications(ours);
        }
    };

    return {
        async canNotify() {
            try {
                const settings = await notifee.getNotificationSettings();
                return isAllowed(settings.authorizationStatus);
            } catch {
                return false;
            }
        },

        async requestPermission() {
            try {
                const settings = await notifee.requestPermission();
                return isAllowed(settings.authorizationStatus);
            } catch {
                return false;
            }
        },

        async cancelAll() {
            await cancelOurs();
        },

        async replaceAll(items: ScheduledReminder[]) {
            if (items.length === 0) {
                await cancelOurs();
                return;
            }
            // Idempotent on Android; also refreshes the channel name when the language changes.
            await notifee.createChannel({
                id: REMINDER_CHANNEL_ID,
                name: copy.channelName(),
                description: copy.channelDescription(),
                importance: AndroidImportance.DEFAULT,
                visibility: AndroidVisibility.PRIVATE,
            });
            // Creating with an existing id replaces that trigger, so create/refresh everything first and drop
            // only the stale ones afterwards: a failure before the cancel leaves the previous schedule intact.
            const keep = new Set<string>();
            for (const item of items) {
                const notificationId = `${REMINDER_ID_PREFIX}${item.id}`;
                await notifee.createTriggerNotification(
                    {
                        id: notificationId,
                        title: item.title,
                        body: item.body,
                        data: { ...item.destination, reminderKey: item.id },
                        android: {
                            channelId: REMINDER_CHANNEL_ID,
                            category: AndroidCategory.REMINDER,
                            visibility: AndroidVisibility.PRIVATE,
                            pressAction: { id: 'default' },
                        },
                        ios: { threadId: THREAD_ID },
                    },
                    {
                        type: TriggerType.TIMESTAMP,
                        timestamp: item.fireAt,
                        // Fires in Doze without needing the exact-alarm permission.
                        alarmManager: { type: AlarmType.SET_AND_ALLOW_WHILE_IDLE },
                    },
                );
                keep.add(notificationId);
            }
            await cancelOurs(keep);
        },
    };
}

/** The navigation destination of a tapped reminder, or null for any other event or notification. */
export function pressDestination(event: Event): ReminderDestination | null {
    if (event.type !== EventType.PRESS) {
        return null;
    }
    const notification = event.detail.notification;
    if (!notification?.id?.startsWith(REMINDER_ID_PREFIX)) {
        return null;
    }
    const target = notification.data?.targetScreen;
    if (typeof target !== 'string') {
        return null;
    }
    const destination: ReminderDestination = { targetScreen: target };
    const days = notification.data?.upcomingDays;
    if (typeof days === 'string') {
        destination.upcomingDays = days;
    }
    return destination;
}

/** Destination of the reminder that cold-started the app, if any. */
export async function initialReminderDestination(): Promise<ReminderDestination | null> {
    const initial = await notifee.getInitialNotification();
    if (!initial) {
        return null;
    }
    return pressDestination({
        type: EventType.PRESS,
        detail: { notification: initial.notification, pressAction: initial.pressAction },
    });
}

export function onReminderPress(handler: (destination: ReminderDestination) => void): () => void {
    return notifee.onForegroundEvent(event => {
        const destination = pressDestination(event);
        if (destination) {
            handler(destination);
        }
    });
}

/** Register once at startup (index.js): taps delivered while the app is backgrounded or just launched. */
export function registerBackgroundReminderHandler(
    handler: (destination: ReminderDestination) => void,
): void {
    notifee.onBackgroundEvent(async event => {
        const destination = pressDestination(event);
        if (destination) {
            handler(destination);
        }
    });
}
