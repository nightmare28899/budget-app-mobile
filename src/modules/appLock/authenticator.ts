import {
    AuthResult,
    availabilityFromCanAuthenticate,
    LockAvailability,
    mapAuthFailure,
    offeredMethods,
    UnlockMethod,
} from './policy';

export interface AppAuthenticator {
    availability(): Promise<LockAvailability>;
    offeredMethods(): Promise<UnlockMethod[]>;
    authenticate(method?: UnlockMethod): Promise<AuthResult>;
}

/** Subset of `react-native-simple-biometrics` used by the app, so tests can fake it. */
export interface BiometricsLibrary {
    canAuthenticate(options?: { allowDeviceCredentials?: boolean }): Promise<boolean>;
    requestBioAuth(request: {
        promptTitle: string;
        promptMessage: string;
        cancelLabel?: string;
        allowDeviceCredentials?: boolean;
    }): Promise<boolean>;
}

/** Prompt copy is resolved lazily so it follows the current app language. */
export interface BiometricPromptCopy {
    title: () => string;
    message: () => string;
    cancelLabel?: () => string;
}

export function createBiometricAuthenticator(
    library: BiometricsLibrary,
    copy: BiometricPromptCopy,
): AppAuthenticator {
    const availability = async (): Promise<LockAvailability> => {
        try {
            return availabilityFromCanAuthenticate(
                await library.canAuthenticate({ allowDeviceCredentials: true }),
            );
        } catch {
            return 'unavailable';
        }
    };

    return {
        availability,

        async offeredMethods() {
            return offeredMethods(await availability());
        },

        async authenticate(method = 'any') {
            const allowDeviceCredentials = method !== 'biometric';
            try {
                if (!(await library.canAuthenticate({ allowDeviceCredentials }))) {
                    return 'notEnrolled';
                }
            } catch {
                return 'unavailable';
            }

            try {
                const ok = await library.requestBioAuth({
                    promptTitle: copy.title(),
                    promptMessage: copy.message(),
                    cancelLabel: copy.cancelLabel?.(),
                    allowDeviceCredentials,
                });
                return ok ? 'success' : 'failed';
            } catch (error) {
                return mapAuthFailure(error);
            }
        },
    };
}
