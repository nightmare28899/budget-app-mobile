import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
    borderRadius,
    spacing,
    typography,
    useThemedStyles,
    SemanticColors,
} from '../../theme/index';
import { translate } from '../../i18n/index';
import { usePreferencesStore } from '../../store/preferencesStore';
import {
    setGlobalAlert,
    type GlobalAlertButton,
    type GlobalAlertFn,
    type GlobalAlertOptions,
} from './alertBridge';

export type AppAlertButton = GlobalAlertButton;
type AppAlertOptions = GlobalAlertOptions;

type AlertState = {
    title: string;
    message?: string;
    buttons: AppAlertButton[];
    options?: AppAlertOptions;
};

type ShowAlert = GlobalAlertFn;

const AlertContext = createContext<ShowAlert | undefined>(undefined);

export function AlertProvider({ children }: { children: React.ReactNode }) {
    const styles = useThemedStyles(createStyles);
    const [alertState, setAlertState] = useState<AlertState | null>(null);

    const dismiss = useCallback((callback?: () => void) => {
        setAlertState(null);
        if (callback) {
            setTimeout(() => callback(), 0);
        }
    }, []);

    const onPressButton = useCallback(
        (button?: AppAlertButton) => {
            dismiss(button?.onPress);
        },
        [dismiss],
    );

    const onRequestClose = useCallback(() => {
        if (!alertState || alertState.options?.cancelable === false) {
            return;
        }

        const cancelButton = alertState.buttons.find(
            (button) => button.style === 'cancel',
        );
        onPressButton(cancelButton);
    }, [alertState, onPressButton]);

    const alert = useCallback<ShowAlert>((title, message, buttons, options) => {
        const language = usePreferencesStore.getState().language;
        setAlertState({
            title,
            message,
            buttons:
                buttons && buttons.length > 0
                    ? buttons
                    : [{ text: translate(language, 'common.ok') }],
            options,
        });
    }, []);

    useEffect(() => {
        setGlobalAlert(alert);
        return () => setGlobalAlert(null);
    }, [alert]);

    const contextValue = useMemo(() => alert, [alert]);
    const hasTwoButtons = alertState?.buttons.length === 2;

    return (
        <AlertContext.Provider value={contextValue}>
            {children}
            <Modal
                transparent
                animationType="fade"
                visible={alertState !== null}
                onRequestClose={onRequestClose}
                statusBarTranslucent
            >
                <View style={styles.overlay}>
                    <Pressable style={styles.backdropPressable} onPress={onRequestClose} />
                    {alertState && (
                        <View style={styles.card}>
                            <View style={styles.accent} />
                            <Text style={styles.title}>{alertState.title}</Text>
                            {!!alertState.message && (
                                <Text style={styles.message}>{alertState.message}</Text>
                            )}

                            <View
                                style={[
                                    styles.buttonContainer,
                                    hasTwoButtons
                                        ? styles.buttonContainerRow
                                        : styles.buttonContainerColumn,
                                ]}
                            >
                                {alertState.buttons.map((button, index) => (
                                    <TouchableOpacity
                                        key={`${button.text}-${index}`}
                                        style={[
                                            styles.button,
                                            hasTwoButtons && styles.buttonRow,
                                            button.style === 'cancel' && styles.buttonCancel,
                                            button.style === 'destructive' &&
                                                styles.buttonDestructive,
                                            (!button.style || button.style === 'default') &&
                                                styles.buttonDefault,
                                        ]}
                                        onPress={() => onPressButton(button)}
                                        activeOpacity={0.85}
                                    >
                                        <Text
                                            style={[
                                                styles.buttonText,
                                                button.style !== 'cancel' &&
                                                    styles.buttonTextSolid,
                                                button.style === 'cancel' &&
                                                    styles.buttonTextCancel,
                                            ]}
                                        >
                                            {button.text}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}
                </View>
            </Modal>
        </AlertContext.Provider>
    );
}

export function useAppAlert() {
    const alert = useContext(AlertContext);
    if (!alert) {
        throw new Error('useAppAlert must be used within an AlertProvider');
    }
    return { alert };
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
    },
    backdropPressable: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: colors.overlay,
    },
    card: {
        width: '100%',
        maxWidth: 420,
        backgroundColor: colors.surfaceCard,
        borderRadius: borderRadius.xl,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
        padding: spacing.xl,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.3,
        shadowRadius: 24,
        elevation: 12,
    },
    accent: {
        height: 4,
        borderRadius: borderRadius.full,
        backgroundColor: colors.primary,
        marginBottom: spacing.base,
    },
    title: {
        color: colors.textPrimary,
        fontSize: typography.fontSize.xl,
        fontWeight: typography.fontWeight.bold,
        marginBottom: spacing.xs,
    },
    message: {
        color: colors.textSecondary,
        fontSize: typography.fontSize.base,
        lineHeight: typography.fontSize.base * typography.lineHeight.normal,
    },
    buttonContainer: {
        marginTop: spacing.lg,
        gap: spacing.sm,
    },
    buttonContainerRow: {
        flexDirection: 'row',
    },
    buttonContainerColumn: {
        flexDirection: 'column',
    },
    button: {
        minHeight: 44,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.base,
        paddingVertical: spacing.sm,
    },
    buttonRow: {
        flex: 1,
    },
    buttonDefault: {
        backgroundColor: colors.primary,
    },
    buttonCancel: {
        backgroundColor: colors.surfaceElevated,
        borderWidth: 1,
        borderColor: colors.border,
    },
    buttonDestructive: {
        backgroundColor: colors.error,
    },
    buttonText: {
        color: colors.textPrimary,
        fontSize: typography.fontSize.base,
        fontWeight: typography.fontWeight.semibold,
    },
    buttonTextSolid: {
        color: '#FFFFFF',
    },
    buttonTextCancel: {
        color: colors.textSecondary,
    },
});
