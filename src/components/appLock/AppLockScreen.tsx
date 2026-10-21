import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { LockMessage } from '../../modules/appLock';
import { Button } from '../ui/primitives/Button';
import { useI18n } from '../../hooks/shared/useI18n';
import { SemanticColors, spacing, typography, useTheme, useThemedStyles } from '../../theme/index';
import type { TranslationKey } from '../../i18n/index';

const MESSAGE_KEYS: Record<LockMessage, TranslationKey> = {
    failed: 'appLock.msgFailed',
    lockedOut: 'appLock.msgLockedOut',
    notEnrolled: 'appLock.msgNotEnrolled',
    unavailable: 'appLock.msgUnavailable',
};

export function lockMessageKey(message: LockMessage): TranslationKey {
    return MESSAGE_KEYS[message];
}

interface AppLockScreenProps {
    /** False renders only the opaque cover (privacy shield while the app is not active). */
    interactive: boolean;
    authenticating: boolean;
    message: LockMessage | null;
    hasMethods: boolean;
    onUnlock: () => void;
    onTurnOff: () => void;
}

/** Full-screen cover that swallows every touch so nothing underneath is reachable. */
export function AppLockScreen({
    interactive,
    authenticating,
    message,
    hasMethods,
    onUnlock,
    onTurnOff,
}: AppLockScreenProps) {
    const { t } = useI18n();
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);
    const canTurnOff = message === 'notEnrolled' || message === 'unavailable';

    return (
        <View style={styles.cover} accessibilityViewIsModal={true}>
            {interactive ? (
                <View style={styles.content}>
                    <View style={styles.iconCircle}>
                        <Icon name="lock-closed" size={40} color={colors.primaryLight} />
                    </View>
                    <Text style={styles.title}>{t('appLock.screenTitle')}</Text>
                    <Text style={styles.subtitle}>{t('appLock.screenSubtitle')}</Text>
                    {message ? (
                        <Text style={styles.error} accessibilityLiveRegion="polite">
                            {t(lockMessageKey(message))}
                        </Text>
                    ) : null}
                    {hasMethods ? (
                        <Button
                            title={t('appLock.unlock')}
                            onPress={onUnlock}
                            disabled={authenticating}
                            loading={authenticating}
                        />
                    ) : null}
                    {canTurnOff ? (
                        <TouchableOpacity onPress={onTurnOff} activeOpacity={0.7}>
                            <Text style={styles.link}>{t('appLock.turnOff')}</Text>
                        </TouchableOpacity>
                    ) : null}
                </View>
            ) : null}
        </View>
    );
}

const createStyles = (colors: SemanticColors) =>
    StyleSheet.create({
        cover: {
            ...StyleSheet.absoluteFillObject,
            backgroundColor: colors.background,
            justifyContent: 'center',
            padding: spacing.xl,
            zIndex: 1000,
            elevation: 1000,
        },
        content: {
            alignItems: 'stretch',
            gap: spacing.base,
        },
        iconCircle: {
            alignSelf: 'center',
            width: 88,
            height: 88,
            borderRadius: 44,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.surfaceElevated,
        },
        title: {
            color: colors.textPrimary,
            fontSize: typography.fontSize['2xl'],
            fontWeight: typography.fontWeight.bold,
            textAlign: 'center',
        },
        subtitle: {
            color: colors.textMuted,
            fontSize: typography.fontSize.base,
            textAlign: 'center',
        },
        error: {
            color: colors.error,
            fontSize: typography.fontSize.sm,
            textAlign: 'center',
        },
        link: {
            color: colors.primaryLight,
            fontSize: typography.fontSize.base,
            fontWeight: typography.fontWeight.semibold,
            textAlign: 'center',
            paddingVertical: spacing.sm,
        },
    });
