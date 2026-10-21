import {
    AppAuthenticator,
    AppLockController,
    AuthResult,
    createAppLockController,
    LockAvailability,
    UnlockMethod,
} from '../../../src/modules/appLock';

function setup(opts: {
    enabled?: boolean;
    availability?: LockAvailability;
    methods?: UnlockMethod[];
    result?: AuthResult;
} = {}) {
    let enabled = opts.enabled ?? true;
    let now = 1_000_000;
    const settings = {
        isEnabled: () => enabled,
        setEnabled: jest.fn((value: boolean) => {
            enabled = value;
        }),
    };
    const authenticator = {
        availability: jest.fn().mockResolvedValue(opts.availability ?? 'available'),
        offeredMethods: jest.fn().mockResolvedValue(opts.methods ?? ['any']),
        authenticate: jest.fn().mockResolvedValue(opts.result ?? 'success'),
    } satisfies Record<keyof AppAuthenticator, jest.Mock>;
    const controller: AppLockController = createAppLockController({
        settings,
        authenticator,
        clock: { nowMs: () => now },
    });
    return {
        controller,
        settings,
        authenticator,
        advance: (ms: number) => {
            now += ms;
        },
    };
}

describe('app lock controller', () => {
    it('cold start is covered when enabled and free when disabled', async () => {
        const on = setup({ enabled: true });
        expect(on.controller.getState()).toMatchObject({ enabled: true, locked: true, covered: true });
        const off = setup({ enabled: false });
        expect(off.controller.getState()).toMatchObject({ enabled: false, locked: false, covered: false });
    });

    it('loads the offered methods when locked', async () => {
        const { controller } = setup();
        await controller.ready;
        expect(controller.getState().methods).toEqual(['any']);
    });

    it('shows not enrolled and the escape hatch when nothing can authenticate', async () => {
        const { controller } = setup({ methods: [], availability: 'notEnrolled' });
        await controller.ready;
        expect(controller.getState().message).toBe('notEnrolled');
        controller.disable();
        expect(controller.getState()).toMatchObject({ enabled: false, locked: false, covered: false });
    });

    it('shows unavailable when the device reports no authentication', async () => {
        const { controller } = setup({ methods: [], availability: 'unavailable' });
        await controller.ready;
        expect(controller.getState().message).toBe('unavailable');
    });

    it('unlocks on success', async () => {
        const { controller, authenticator } = setup();
        await controller.ready;
        await controller.unlock();
        expect(authenticator.authenticate).toHaveBeenCalledWith('any');
        expect(controller.getState()).toMatchObject({ locked: false, authenticating: false, message: null });
    });

    it('stays locked silently on cancel and with a message otherwise', async () => {
        const canceled = setup({ result: 'canceled' });
        await canceled.controller.ready;
        await canceled.controller.unlock();
        expect(canceled.controller.getState()).toMatchObject({ locked: true, message: null });

        const failed = setup({ result: 'failed' });
        await failed.controller.ready;
        await failed.controller.unlock();
        expect(failed.controller.getState()).toMatchObject({ locked: true, message: 'failed' });

        const lockedOut = setup({ result: 'lockedOut' });
        await lockedOut.controller.ready;
        await lockedOut.controller.unlock();
        expect(lockedOut.controller.getState().message).toBe('lockedOut');
    });

    it('ignores a second unlock while authenticating', async () => {
        const { controller, authenticator } = setup();
        await controller.ready;
        const first = controller.unlock();
        const second = controller.unlock();
        await Promise.all([first, second]);
        expect(authenticator.authenticate).toHaveBeenCalledTimes(1);
    });

    it('treats an authenticator that throws as a failed attempt', async () => {
        const { controller, authenticator } = setup();
        authenticator.authenticate.mockRejectedValue(new Error('x'));
        await controller.ready;
        await controller.unlock();
        expect(controller.getState()).toMatchObject({ locked: true, authenticating: false, message: 'failed' });
    });

    it('refuses a method that is not offered', async () => {
        const { controller, authenticator } = setup({ methods: ['any'] });
        await controller.ready;
        await controller.unlock('biometric');
        expect(authenticator.authenticate).not.toHaveBeenCalled();
    });

    describe('background / foreground', () => {
        async function unlocked() {
            const ctx = setup();
            await ctx.controller.ready;
            await ctx.controller.unlock();
            return ctx;
        }

        it('stays open when returning within the grace', async () => {
            const { controller, advance } = await unlocked();
            controller.onLeave();
            advance(29_999);
            await controller.onForeground();
            expect(controller.getState().locked).toBe(false);
        });

        it('relocks when returning after the grace', async () => {
            const { controller, advance } = await unlocked();
            controller.onLeave();
            advance(30_000);
            await controller.onForeground();
            expect(controller.getState()).toMatchObject({ locked: true, covered: true, methods: ['any'] });
        });

        it('keeps the earliest leave time across inactive then background', async () => {
            const { controller, advance } = await unlocked();
            controller.onLeave();
            advance(20_000);
            controller.onLeave();
            advance(10_000);
            await controller.onForeground();
            expect(controller.getState().locked).toBe(true);
        });

        it('does nothing on foreground when the app never left', async () => {
            const { controller } = await unlocked();
            await controller.onForeground();
            expect(controller.getState().locked).toBe(false);
        });

        it('ignores leaving while the system prompt is showing', async () => {
            const { controller, advance, authenticator } = setup();
            await controller.ready;
            let resolveAuth: (r: AuthResult) => void = () => undefined;
            authenticator.authenticate.mockReturnValue(
                new Promise<AuthResult>((resolve) => {
                    resolveAuth = resolve;
                }),
            );
            const pending = controller.unlock();
            controller.onLeave(); // prompt foregrounding the app
            advance(120_000);
            resolveAuth('success');
            await pending;
            await controller.onForeground();
            expect(controller.getState().locked).toBe(false);
        });

        it('never locks when disabled', async () => {
            const { controller, advance } = setup({ enabled: false });
            controller.onLeave();
            advance(10 * 60_000);
            await controller.onForeground();
            expect(controller.getState().locked).toBe(false);
        });

        it('refreshes methods when foregrounded while locked', async () => {
            const { controller, authenticator } = setup();
            await controller.ready;
            authenticator.offeredMethods.mockResolvedValue([]);
            authenticator.availability.mockResolvedValue('notEnrolled');
            await controller.onForeground();
            expect(controller.getState()).toMatchObject({ methods: [], message: 'notEnrolled' });
        });
    });

    describe('enable / disable', () => {
        it('requires a successful authentication to enable', async () => {
            const { controller, settings } = setup({ enabled: false });
            await controller.enable();
            expect(settings.setEnabled).toHaveBeenCalledWith(true);
            expect(controller.getState()).toMatchObject({ enabled: true, locked: false, authenticating: false });
        });

        it('does not enable when authentication fails', async () => {
            const { controller, settings } = setup({ enabled: false, result: 'failed' });
            await controller.enable();
            expect(settings.setEnabled).not.toHaveBeenCalled();
            expect(controller.getState()).toMatchObject({ enabled: false, message: 'failed' });
        });

        it('explains when the device has nothing set up', async () => {
            const { controller, settings, authenticator } = setup({ enabled: false, availability: 'notEnrolled' });
            await controller.enable();
            expect(authenticator.authenticate).not.toHaveBeenCalled();
            expect(settings.setEnabled).not.toHaveBeenCalled();
            expect(controller.getState().message).toBe('notEnrolled');
        });

        it('explains when authentication is unavailable', async () => {
            const { controller } = setup({ enabled: false, availability: 'unavailable' });
            await controller.enable();
            expect(controller.getState().message).toBe('unavailable');
        });

        it('disable unlocks and persists off', async () => {
            const { controller, settings } = setup();
            controller.disable();
            expect(settings.setEnabled).toHaveBeenCalledWith(false);
            expect(controller.getState()).toMatchObject({ enabled: false, locked: false });
        });

        it('notifies subscribers and supports unsubscribe', async () => {
            const { controller } = setup();
            const listener = jest.fn();
            const off = controller.subscribe(listener);
            controller.dismissMessage();
            controller.disable();
            expect(listener).toHaveBeenCalled();
            off();
            listener.mockClear();
            controller.dismissMessage();
            expect(listener).not.toHaveBeenCalled();
        });
    });
});
