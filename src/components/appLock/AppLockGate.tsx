import React, { useEffect, useState } from 'react';
import { AppState, AppStateStatus, Modal, StyleSheet, View } from 'react-native';
import { useAppLock } from '../../hooks/appLock/useAppLock';
import { AppLockScreen } from './AppLockScreen';

const ignoreRequestClose = () => undefined;

/**
 * Hides the app behind the lock screen on cold start and after the grace period, and
 * shows an opaque shield while the app is inactive so the app switcher never shows content.
 */
export function AppLockGate({ children }: { children: React.ReactNode }) {
    const lock = useAppLock();
    const { controller } = lock;
    const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', (next) => {
            setAppState(next);
            if (next === 'active') {
                controller.onForeground();
            } else {
                controller.onLeave();
            }
        });
        return () => subscription.remove();
    }, [controller]);

    // The system prompt inactivates the app itself; the shield must not flash over it.
    const shielded =
        lock.enabled && appState !== 'active' && !lock.authenticating;
    const covered = lock.covered;

    return (
        <View style={styles.root}>
            <View
                style={styles.root}
                accessibilityElementsHidden={covered}
                importantForAccessibility={covered ? 'no-hide-descendants' : 'auto'}
                pointerEvents={covered ? 'none' : 'auto'}
            >
                {children}
            </View>
            {/*
              * A native Modal, not a sibling View: modals (and iOS modal screens) presented earlier render above
              * any View, so only a later-presented Modal can cover them. Hardware back must not dismiss it.
              */}
            <Modal
                visible={covered || shielded}
                transparent={false}
                animationType="none"
                statusBarTranslucent
                onRequestClose={ignoreRequestClose}
            >
                <AppLockScreen
                    interactive={covered}
                    authenticating={lock.authenticating}
                    message={lock.message}
                    hasMethods={lock.methods.length > 0}
                    onUnlock={() => controller.unlock('any')}
                    onTurnOff={controller.disable}
                />
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
    },
});
