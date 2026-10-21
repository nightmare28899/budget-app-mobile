import { AppAuthenticator } from './authenticator';
import {
    AuthResult,
    decideToggle,
    initialLocked,
    LockMessage,
    messageForResult,
    shouldLockOnReturn,
    UnlockMethod,
} from './policy';

export interface AppLockSettings {
    isEnabled(): boolean;
    setEnabled(enabled: boolean): void;
}

export interface MonotonicClock {
    nowMs(): number;
}

export interface AppLockState {
    enabled: boolean;
    locked: boolean;
    authenticating: boolean;
    message: LockMessage | null;
    methods: UnlockMethod[];
    /** Content must be hidden (painted over and removed from accessibility) until unlocked. */
    covered: boolean;
}

export interface AppLockController {
    getState(): AppLockState;
    subscribe(listener: () => void): () => void;
    /** Resolves once the first set of unlock methods has been loaded. */
    ready: Promise<void>;
    /** App left the foreground (inactive or background). */
    onLeave(): void;
    onForeground(): Promise<void>;
    unlock(method?: UnlockMethod): Promise<void>;
    enable(): Promise<void>;
    disable(): void;
    dismissMessage(): void;
}

type CoreState = Omit<AppLockState, 'covered'>;

interface Deps {
    settings: AppLockSettings;
    authenticator: AppAuthenticator;
    clock: MonotonicClock;
}

/** Port of the Compose `AppLockViewModel`, framework-free. */
export function createAppLockController({
    settings,
    authenticator,
    clock,
}: Deps): AppLockController {
    const listeners = new Set<() => void>();
    let leftAtMs: number | null = null;
    let refreshSeq = 0;

    const withCovered = (core: CoreState): AppLockState => ({
        ...core,
        covered: core.enabled && core.locked,
    });

    const enabledAtStart = settings.isEnabled();
    let state: AppLockState = withCovered({
        enabled: enabledAtStart,
        locked: initialLocked(enabledAtStart),
        authenticating: false,
        message: null,
        methods: [],
    });

    const update = (patch: Partial<CoreState>) => {
        state = withCovered({ ...state, ...patch });
        listeners.forEach((listener) => listener());
    };

    async function refreshMethods(): Promise<void> {
        if (!state.enabled || !state.locked) {
            return;
        }
        const seq = ++refreshSeq;
        const offered = await authenticator.offeredMethods();
        let emptyMessage: LockMessage | null = null;
        if (offered.length === 0) {
            emptyMessage =
                (await authenticator.availability()) === 'notEnrolled'
                    ? 'notEnrolled'
                    : 'unavailable';
        }
        if (seq !== refreshSeq) {
            return;
        }
        const stale = state.message === 'notEnrolled' || state.message === 'unavailable';
        const message =
            emptyMessage ?? (offered.length > 0 && stale ? null : state.message);
        update({ message, methods: offered });
    }

    async function runAuth(method: UnlockMethod): Promise<AuthResult> {
        try {
            return await authenticator.authenticate(method);
        } catch {
            return 'failed';
        }
    }

    const ready = refreshMethods();

    return {
        getState: () => state,

        subscribe(listener) {
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        },

        ready,

        onLeave() {
            // The system biometric prompt itself backgrounds/inactivates the app.
            if (state.authenticating) {
                return;
            }
            if (leftAtMs === null) {
                leftAtMs = clock.nowMs();
            }
        },

        async onForeground() {
            const leftAt = leftAtMs;
            const hasLeft = leftAt !== null;
            leftAtMs = null;
            if (state.locked) {
                await refreshMethods();
                return;
            }
            if (hasLeft && shouldLockOnReturn(state.enabled, leftAt, clock.nowMs())) {
                update({ locked: true });
                await refreshMethods();
            }
        },

        async unlock(method = 'any') {
            if (!state.enabled || !state.locked || state.authenticating) {
                return;
            }
            if (method !== 'any' && !state.methods.includes(method)) {
                return;
            }
            update({ authenticating: true, message: null });
            const result = await runAuth(method);
            if (result === 'success') {
                leftAtMs = null;
                update({ authenticating: false, locked: false, message: null });
            } else {
                update({ authenticating: false, message: messageForResult(result) });
            }
        },

        /** Turning the lock on requires a successful authentication first. */
        async enable() {
            if (state.enabled || state.authenticating) {
                return;
            }
            const decision = decideToggle(true, await authenticator.availability());
            if (decision === 'needsSecuritySetup') {
                update({ message: 'notEnrolled' });
            } else if (decision === 'unavailable') {
                update({ message: 'unavailable' });
            } else if (decision === 'authenticate') {
                update({ authenticating: true, message: null });
                const result = await runAuth('any');
                if (result === 'success') {
                    leftAtMs = null;
                    settings.setEnabled(true);
                    update({ authenticating: false, enabled: true, locked: false, message: null });
                } else {
                    update({ authenticating: false, message: messageForResult(result) });
                }
            }
        },

        disable() {
            settings.setEnabled(false);
            update({ enabled: false, locked: false, authenticating: false, message: null });
        },

        dismissMessage() {
            update({ message: null });
        },
    };
}
