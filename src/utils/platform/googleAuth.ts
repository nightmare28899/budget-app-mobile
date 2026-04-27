import { GOOGLE_IOS_CLIENT_ID, GOOGLE_WEB_CLIENT_ID } from '@env';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { Platform } from 'react-native';

let configuredWebClientId: string | null = null;
let configuredIosClientId: string | null = null;

export function getGoogleWebClientId(): string | null {
    const normalized = GOOGLE_WEB_CLIENT_ID?.trim();
    return normalized ? normalized : null;
}

export function getGoogleIosClientId(): string | null {
    const normalized = GOOGLE_IOS_CLIENT_ID?.trim();
    return normalized ? normalized : null;
}

export function configureGoogleSignIn(): string | null {
    const webClientId = getGoogleWebClientId();
    if (!webClientId) {
        return null;
    }

    const iosClientId =
        Platform.OS === 'ios'
            ? getGoogleIosClientId()
            : null;

    if (
        configuredWebClientId === webClientId &&
        configuredIosClientId === iosClientId
    ) {
        return webClientId;
    }

    GoogleSignin.configure({
        webClientId,
        iosClientId: iosClientId ?? undefined,
        offlineAccess: false,
        scopes: ['email', 'profile'],
    });
    configuredWebClientId = webClientId;
    configuredIosClientId = iosClientId;

    return webClientId;
}
