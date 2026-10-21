import {
    BiometricsLibrary,
    createBiometricAuthenticator,
} from '../../../src/modules/appLock/authenticator';

function fakeLib(overrides: Partial<BiometricsLibrary> = {}) {
    const lib = {
        canAuthenticate: jest.fn().mockResolvedValue(true),
        requestBioAuth: jest.fn().mockResolvedValue(true),
        ...overrides,
    };
    return lib as BiometricsLibrary & {
        canAuthenticate: jest.Mock;
        requestBioAuth: jest.Mock;
    };
}

const copy = {
    title: () => 'Unlock',
    message: () => 'Confirm it is you',
    cancelLabel: () => 'Cancel',
};

describe('biometric authenticator adapter', () => {
    it('reports availability from canAuthenticate with device credentials allowed', async () => {
        const lib = fakeLib();
        const auth = createBiometricAuthenticator(lib, copy);
        await expect(auth.availability()).resolves.toBe('available');
        expect(lib.canAuthenticate).toHaveBeenCalledWith({ allowDeviceCredentials: true });
    });

    it('reports notEnrolled when the device cannot authenticate', async () => {
        const auth = createBiometricAuthenticator(
            fakeLib({ canAuthenticate: jest.fn().mockResolvedValue(false) }),
            copy,
        );
        await expect(auth.availability()).resolves.toBe('notEnrolled');
        await expect(auth.offeredMethods()).resolves.toEqual([]);
    });

    it('reports unavailable when the library throws', async () => {
        const auth = createBiometricAuthenticator(
            fakeLib({ canAuthenticate: jest.fn().mockRejectedValue(new Error('boom')) }),
            copy,
        );
        await expect(auth.availability()).resolves.toBe('unavailable');
    });

    it('offers the combined method when available', async () => {
        const auth = createBiometricAuthenticator(fakeLib(), copy);
        await expect(auth.offeredMethods()).resolves.toEqual(['any']);
    });

    it('any allows device credentials, biometric does not', async () => {
        const lib = fakeLib();
        const auth = createBiometricAuthenticator(lib, copy);
        await expect(auth.authenticate('any')).resolves.toBe('success');
        expect(lib.requestBioAuth).toHaveBeenLastCalledWith({
            promptTitle: 'Unlock',
            promptMessage: 'Confirm it is you',
            cancelLabel: 'Cancel',
            allowDeviceCredentials: true,
        });
        await auth.authenticate('biometric');
        expect(lib.requestBioAuth).toHaveBeenLastCalledWith(
            expect.objectContaining({ allowDeviceCredentials: false }),
        );
    });

    it('does not prompt when nothing is enrolled', async () => {
        const lib = fakeLib({ canAuthenticate: jest.fn().mockResolvedValue(false) });
        const auth = createBiometricAuthenticator(lib, copy);
        await expect(auth.authenticate('any')).resolves.toBe('notEnrolled');
        expect(lib.requestBioAuth).not.toHaveBeenCalled();
    });

    it('maps a rejected prompt through the failure mapper', async () => {
        const auth = createBiometricAuthenticator(
            fakeLib({ requestBioAuth: jest.fn().mockRejectedValue(new Error('User canceled')) }),
            copy,
        );
        await expect(auth.authenticate('any')).resolves.toBe('canceled');
    });

    it('treats a false resolution as failed', async () => {
        const auth = createBiometricAuthenticator(
            fakeLib({ requestBioAuth: jest.fn().mockResolvedValue(false) }),
            copy,
        );
        await expect(auth.authenticate('any')).resolves.toBe('failed');
    });
});
