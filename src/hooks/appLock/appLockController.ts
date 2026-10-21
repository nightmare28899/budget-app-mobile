import RNBiometrics from 'react-native-simple-biometrics';
import { translate } from '../../i18n/index';
import {
    createAppLockController,
    createBiometricAuthenticator,
} from '../../modules/appLock';
import { appLockSettings } from '../../store/appLockSettingsStore';
import { usePreferencesStore } from '../../store/preferencesStore';

const t = (key: Parameters<typeof translate>[1]) =>
    translate(usePreferencesStore.getState().language, key);

/** App-wide singleton: created at import so a cold start is locked before the first frame. */
export const appLockController = createAppLockController({
    settings: appLockSettings,
    authenticator: createBiometricAuthenticator(RNBiometrics, {
        title: () => t('appLock.promptTitle'),
        message: () => t('appLock.promptMessage'),
        cancelLabel: () => t('appLock.cancel'),
    }),
    clock: { nowMs: () => Date.now() },
});
