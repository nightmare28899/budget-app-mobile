import { Alert } from 'react-native';

export type GlobalAlertButtonStyle = 'default' | 'cancel' | 'destructive';

export type GlobalAlertButton = {
    text: string;
    onPress?: () => void;
    style?: GlobalAlertButtonStyle;
};

export type GlobalAlertOptions = {
    cancelable?: boolean;
};

export type GlobalAlertFn = (
    title: string,
    message?: string,
    buttons?: GlobalAlertButton[],
    options?: GlobalAlertOptions,
) => void;

let globalAlertFn: GlobalAlertFn | null = null;

export function setGlobalAlert(fn: GlobalAlertFn | null) {
    globalAlertFn = fn;
}

export function showGlobalAlert(
    title: string,
    message?: string,
    buttons?: GlobalAlertButton[],
    options?: GlobalAlertOptions,
) {
    if (globalAlertFn) {
        globalAlertFn(title, message, buttons, options);
        return;
    }

    Alert.alert(title, message, buttons, {
        cancelable: options?.cancelable ?? true,
    });
}
