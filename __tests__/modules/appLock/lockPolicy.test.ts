import {
    availabilityFromCanAuthenticate,
    DEFAULT_GRACE_MS,
    decideToggle,
    initialLocked,
    mapAuthFailure,
    offeredMethods,
    shouldLockOnReturn,
} from '../../../src/modules/appLock/policy';

// Ported 1:1 from the Compose LockPolicyTest.
describe('LockPolicy (ported from Compose)', () => {
    let now = 1_000_000;
    const clock = { nowMs: () => now };

    beforeEach(() => {
        now = 1_000_000;
    });

    // --- cold start -----------------------------------------------------
    it('cold start is locked only when the lock is enabled', () => {
        expect(initialLocked(true)).toBe(true);
        expect(initialLocked(false)).toBe(false);
    });

    // --- grace period ---------------------------------------------------
    it('grace defaults to thirty seconds', () => {
        expect(DEFAULT_GRACE_MS).toBe(30_000);
    });

    it('returning within the grace keeps the app open', () => {
        const leftAt = clock.nowMs();
        now += 29_999;
        expect(shouldLockOnReturn(true, leftAt, clock.nowMs())).toBe(false);
    });

    it('returning exactly at or after the grace locks', () => {
        const leftAt = clock.nowMs();
        now += 30_000;
        expect(shouldLockOnReturn(true, leftAt, clock.nowMs())).toBe(true);
        now += 600_000;
        expect(shouldLockOnReturn(true, leftAt, clock.nowMs())).toBe(true);
    });

    it('a disabled lock never locks', () => {
        expect(shouldLockOnReturn(false, 0, Number.MAX_SAFE_INTEGER)).toBe(false);
        expect(shouldLockOnReturn(false, null, 5)).toBe(false);
    });

    it('a clock that went backwards fails closed', () => {
        const leftAt = clock.nowMs();
        now -= 10;
        expect(shouldLockOnReturn(true, leftAt, clock.nowMs())).toBe(true);
    });

    it('an unknown leave time fails closed', () => {
        expect(shouldLockOnReturn(true, null, clock.nowMs())).toBe(true);
    });

    it('a custom grace is honoured', () => {
        expect(shouldLockOnReturn(true, 0, 5_000, 5_000)).toBe(true);
        expect(shouldLockOnReturn(true, 0, 4_999, 5_000)).toBe(false);
        expect(shouldLockOnReturn(true, 0, 1, 0)).toBe(true);
    });
});

describe('availability and toggle decisions', () => {
    it('maps the library boolean to availability', () => {
        expect(availabilityFromCanAuthenticate(true)).toBe('available');
        expect(availabilityFromCanAuthenticate(false)).toBe('notEnrolled');
    });

    it('toggle decisions follow the device state', () => {
        expect(decideToggle(false, 'notEnrolled')).toBe('turnOff');
        expect(decideToggle(true, 'available')).toBe('authenticate');
        expect(decideToggle(true, 'notEnrolled')).toBe('needsSecuritySetup');
        expect(decideToggle(true, 'unavailable')).toBe('unavailable');
    });
});

describe('offered methods', () => {
    it('offers the combined method only when the device can authenticate', () => {
        expect(offeredMethods('available')).toEqual(['any']);
        expect(offeredMethods('notEnrolled')).toEqual([]);
        expect(offeredMethods('unavailable')).toEqual([]);
    });
});

describe('auth failure mapping', () => {
    it('maps lockout messages', () => {
        expect(mapAuthFailure(new Error('Too many attempts. Try again later.'))).toBe('lockedOut');
        expect(mapAuthFailure(new Error('Biometry is locked out'))).toBe('lockedOut');
    });

    it('maps user cancellation', () => {
        expect(mapAuthFailure(new Error('User canceled the authentication'))).toBe('canceled');
        expect(mapAuthFailure(new Error('Cancelar'))).toBe('canceled');
    });

    it('maps missing enrolment and unavailable hardware', () => {
        expect(mapAuthFailure(new Error('Passcode not set'))).toBe('notEnrolled');
        expect(mapAuthFailure(new Error('Biometric hardware unavailable'))).toBe('unavailable');
    });

    it('falls back to failed for anything else', () => {
        expect(mapAuthFailure(new Error('Authentication failed'))).toBe('failed');
        expect(mapAuthFailure('weird')).toBe('failed');
        expect(mapAuthFailure(undefined)).toBe('failed');
    });
});
