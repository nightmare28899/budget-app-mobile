/**
 * Pure app-lock policy, ported 1:1 from the Compose `LockPolicy.kt`.
 * No React Native or native-module imports so every rule is unit-testable.
 */

/** Outcome of one authentication attempt. */
export type AuthResult =
    | 'success'
    | 'canceled'
    | 'lockedOut'
    | 'notEnrolled'
    | 'unavailable'
    | 'failed';

/**
 * `any` = biometrics with the device passcode as fallback; `biometric` = biometrics only.
 * Compose also has a credential-only mode, which react-native-simple-biometrics cannot do.
 */
export type UnlockMethod = 'any' | 'biometric';

export type LockAvailability = 'available' | 'notEnrolled' | 'unavailable';

export type LockMessage = 'failed' | 'lockedOut' | 'notEnrolled' | 'unavailable';

export type ToggleDecision =
    | 'turnOff'
    | 'authenticate'
    | 'needsSecuritySetup'
    | 'unavailable';

export const DEFAULT_GRACE_MS = 30_000;

export function initialLocked(enabled: boolean): boolean {
    return enabled;
}

/**
 * Fails closed: an unknown leave time, or a clock that went backwards, locks.
 * The grace window is half-open: `elapsed < graceMs` keeps the app open.
 */
export function shouldLockOnReturn(
    enabled: boolean,
    backgroundedAtMs: number | null,
    nowMs: number,
    graceMs: number = DEFAULT_GRACE_MS,
): boolean {
    if (!enabled) {
        return false;
    }
    if (backgroundedAtMs === null) {
        return true;
    }
    const elapsed = nowMs - backgroundedAtMs;
    return !(elapsed >= 0 && elapsed < graceMs);
}

/**
 * The library only exposes a boolean, so "cannot authenticate" cannot be split into
 * no-hardware vs nothing-enrolled; with device credentials allowed it almost always
 * means no screen lock is configured, hence `notEnrolled`.
 */
export function availabilityFromCanAuthenticate(can: boolean): LockAvailability {
    return can ? 'available' : 'notEnrolled';
}

export function decideToggle(
    requested: boolean,
    availability: LockAvailability,
): ToggleDecision {
    if (!requested) {
        return 'turnOff';
    }
    if (availability === 'available') {
        return 'authenticate';
    }
    return availability === 'notEnrolled' ? 'needsSecuritySetup' : 'unavailable';
}

/** One combined button: the system prompt already offers biometrics and the passcode fallback. */
export function offeredMethods(availability: LockAvailability): UnlockMethod[] {
    return availability === 'available' ? ['any'] : [];
}

function errorMessage(error: unknown): string {
    if (typeof error === 'string') {
        return error;
    }
    if (error && typeof error === 'object' && 'message' in error) {
        const message = (error as { message?: unknown }).message;
        return typeof message === 'string' ? message : '';
    }
    return '';
}

/**
 * Counterpart of Compose `BiometricErrors.map`. The library rejects with a localized
 * OS string and no error code, so this is a best-effort keyword match; anything
 * unrecognized is a plain failure (message shown, retry allowed).
 */
export function mapAuthFailure(error: unknown): Exclude<AuthResult, 'success'> {
    const text = errorMessage(error).toLowerCase();
    if (/lock(ed)? ?out|too many|demasiados|intentos|attempts|bloquead/.test(text)) {
        return 'lockedOut';
    }
    if (/cancel/.test(text)) {
        return 'canceled';
    }
    if (/not set|not enrolled|no biometrics|no fingerprints|enroll|no configurad/.test(text)) {
        return 'notEnrolled';
    }
    if (/hardware|unavailable|not available|no disponible/.test(text)) {
        return 'unavailable';
    }
    return 'failed';
}

export function messageForResult(result: AuthResult): LockMessage | null {
    switch (result) {
        case 'success':
        case 'canceled':
            return null;
        case 'lockedOut':
            return 'lockedOut';
        case 'notEnrolled':
            return 'notEnrolled';
        case 'unavailable':
            return 'unavailable';
        default:
            return 'failed';
    }
}
