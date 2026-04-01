import { GOOGLE_WEB_CLIENT_ID } from '@env';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

let configuredWebClientId: string | null = null;

export function getGoogleWebClientId(): string | null {
    const normalized = GOOGLE_WEB_CLIENT_ID?.trim();
    return normalized ? normalized : null;
}

export function configureGoogleSignIn(): string | null {
    const webClientId = getGoogleWebClientId();
    if (!webClientId) {
        return null;
    }

    if (configuredWebClientId === webClientId) {
        return webClientId;
    }

    GoogleSignin.configure({
        webClientId,
        offlineAccess: false,
        scopes: ['email', 'profile'],
    });
    configuredWebClientId = webClientId;

    return webClientId;
}
