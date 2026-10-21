jest.mock('react-native-notify-kit', () => ({
    __esModule: true,
    default: {
        createChannel: jest.fn(async (channel: { id: string }) => channel.id),
        createTriggerNotification: jest.fn(async () => 'id'),
        getTriggerNotificationIds: jest.fn(async () => [] as string[]),
        cancelTriggerNotifications: jest.fn(async (_ids?: string[]) => {}),
        getNotificationSettings: jest.fn(async () => ({ authorizationStatus: 1 })),
        requestPermission: jest.fn(async () => ({ authorizationStatus: 1 })),
    },
    TriggerType: { TIMESTAMP: 0 },
    AuthorizationStatus: { NOT_DETERMINED: -1, DENIED: 0, AUTHORIZED: 1, PROVISIONAL: 2 },
    AndroidImportance: { DEFAULT: 3 },
    AndroidVisibility: { PRIVATE: 0 },
    AndroidCategory: { REMINDER: 'reminder' },
    AlarmType: { SET_AND_ALLOW_WHILE_IDLE: 1 },
    EventType: { PRESS: 1 },
}));

import {
    REMINDER_ID_PREFIX,
    createNotifyKitPort,
    pressDestination,
} from '../../../src/modules/reminders/notifyKitAdapter';

const item = (id: string, fireAt: number) => ({
    id,
    fireAt,
    title: 'Visa',
    body: 'Due today',
    destination: { targetScreen: 'CreditCards' },
});

const mockLib = jest.requireMock('react-native-notify-kit').default as Record<string, jest.Mock>;

describe('notify-kit port', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockLib.getTriggerNotificationIds.mockResolvedValue([]);
    });

    it('replaceAll creates every trigger first, then cancels only our stale ids', async () => {
        mockLib.getTriggerNotificationIds.mockResolvedValue([
            `${REMINDER_ID_PREFIX}old`,
            'someone-else',
        ]);
        const port = createNotifyKitPort({ channelName: () => 'Payment reminders', channelDescription: () => 'desc' });
        await port.replaceAll([item('k1', 1000), item('k2', 2000)]);

        expect(mockLib.cancelTriggerNotifications).toHaveBeenCalledWith([`${REMINDER_ID_PREFIX}old`]);
        const lastCreate = Math.max(...mockLib.createTriggerNotification.mock.invocationCallOrder);
        expect(mockLib.cancelTriggerNotifications.mock.invocationCallOrder[0]).toBeGreaterThan(lastCreate);
        expect(mockLib.createChannel).toHaveBeenCalledWith(
            expect.objectContaining({ id: 'payment_reminders', name: 'Payment reminders' }),
        );
        expect(mockLib.createTriggerNotification).toHaveBeenCalledTimes(2);
        const [notification, trigger] = (mockLib.createTriggerNotification.mock.calls as unknown[][])[0] as [
            Record<string, unknown>,
            Record<string, unknown>,
        ];
        expect(notification).toMatchObject({
            id: `${REMINDER_ID_PREFIX}k1`,
            title: 'Visa',
            body: 'Due today',
            data: { targetScreen: 'CreditCards', reminderKey: 'k1' },
            android: expect.objectContaining({ channelId: 'payment_reminders', pressAction: { id: 'default' } }),
        });
        expect(trigger).toMatchObject({ type: 0, timestamp: 1000 });
    });

    it('replaceAll keeps ids that are re-created and never cancels foreign ids', async () => {
        mockLib.getTriggerNotificationIds.mockResolvedValue([
            `${REMINDER_ID_PREFIX}k1`,
            `${REMINDER_ID_PREFIX}old`,
            'someone-else',
        ]);
        const port = createNotifyKitPort({ channelName: () => 'n', channelDescription: () => 'd' });
        await port.replaceAll([item('k1', 1000)]);
        expect(mockLib.cancelTriggerNotifications).toHaveBeenCalledWith([`${REMINDER_ID_PREFIX}old`]);
    });

    it('replaceAll does not cancel anything when a create throws midway', async () => {
        mockLib.getTriggerNotificationIds.mockResolvedValue([`${REMINDER_ID_PREFIX}old`]);
        mockLib.createTriggerNotification.mockResolvedValueOnce('id').mockRejectedValueOnce(new Error('native'));
        const port = createNotifyKitPort({ channelName: () => 'n', channelDescription: () => 'd' });
        await expect(port.replaceAll([item('k1', 1000), item('k2', 2000)])).rejects.toThrow('native');
        expect(mockLib.cancelTriggerNotifications).not.toHaveBeenCalled();
    });

    it('replaceAll does not cancel when the channel cannot be created', async () => {
        mockLib.getTriggerNotificationIds.mockResolvedValue([`${REMINDER_ID_PREFIX}old`]);
        mockLib.createChannel.mockRejectedValueOnce(new Error('channel'));
        const port = createNotifyKitPort({ channelName: () => 'n', channelDescription: () => 'd' });
        await expect(port.replaceAll([item('k1', 1000)])).rejects.toThrow('channel');
        expect(mockLib.cancelTriggerNotifications).not.toHaveBeenCalled();
    });

    it('replaceAll with nothing only cancels', async () => {
        mockLib.getTriggerNotificationIds.mockResolvedValue([`${REMINDER_ID_PREFIX}old`]);
        const port = createNotifyKitPort({ channelName: () => 'n', channelDescription: () => 'd' });
        await port.replaceAll([]);
        expect(mockLib.cancelTriggerNotifications).toHaveBeenCalledWith([`${REMINDER_ID_PREFIX}old`]);
        expect(mockLib.createTriggerNotification).not.toHaveBeenCalled();
    });

    it('cancelAll skips the native call when nothing is pending', async () => {
        const port = createNotifyKitPort({ channelName: () => 'n', channelDescription: () => 'd' });
        await port.cancelAll();
        expect(mockLib.cancelTriggerNotifications).not.toHaveBeenCalled();
    });

    it('canNotify follows the authorization status', async () => {
        const port = createNotifyKitPort({ channelName: () => 'n', channelDescription: () => 'd' });
        await expect(port.canNotify()).resolves.toBe(true);
        mockLib.getNotificationSettings.mockResolvedValueOnce({ authorizationStatus: 0 });
        await expect(port.canNotify()).resolves.toBe(false);
        mockLib.getNotificationSettings.mockResolvedValueOnce({ authorizationStatus: -1 });
        await expect(port.canNotify()).resolves.toBe(false);
        mockLib.getNotificationSettings.mockResolvedValueOnce({ authorizationStatus: 2 });
        await expect(port.canNotify()).resolves.toBe(true);
    });

    it('requestPermission resolves to whether notifications are allowed', async () => {
        const port = createNotifyKitPort({ channelName: () => 'n', channelDescription: () => 'd' });
        await expect(port.requestPermission()).resolves.toBe(true);
        mockLib.requestPermission.mockResolvedValueOnce({ authorizationStatus: 0 });
        await expect(port.requestPermission()).resolves.toBe(false);
    });

    it('canNotify is false when the library throws', async () => {
        mockLib.getNotificationSettings.mockRejectedValueOnce(new Error('x'));
        const port = createNotifyKitPort({ channelName: () => 'n', channelDescription: () => 'd' });
        await expect(port.canNotify()).resolves.toBe(false);
    });
});

describe('pressDestination', () => {
    it('extracts only reminder destinations from a press event', () => {
        expect(
            pressDestination({
                type: 1,
                detail: { notification: { id: `${REMINDER_ID_PREFIX}k`, data: { targetScreen: 'CreditCards' } } },
            } as never),
        ).toEqual({ targetScreen: 'CreditCards' });
        expect(pressDestination({ type: 3, detail: {} } as never)).toBeNull();
        expect(
            pressDestination({
                type: 1,
                detail: { notification: { id: 'push', data: { targetScreen: 'Notifications' } } },
            } as never),
        ).toBeNull();
    });
});
