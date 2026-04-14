import NetInfo from '@react-native-community/netinfo';

export type InternetAccessState = 'online' | 'offline' | 'unknown';

export async function getInternetAccessState(): Promise<InternetAccessState> {
    try {
        const state = await NetInfo.fetch();

        if (state.isConnected === false || state.isInternetReachable === false) {
            return 'offline';
        }

        if (state.isInternetReachable === true || state.isConnected === true) {
            return 'online';
        }

        return 'unknown';
    } catch {
        return 'unknown';
    }
}
