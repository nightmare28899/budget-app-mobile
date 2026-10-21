import React, { useEffect } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAppLock } from '../../hooks/appLock/useAppLock';
import { useI18n } from '../../hooks/shared/useI18n';
import { SemanticColors, spacing, typography, useResponsive, useTheme, useThemedStyles } from '../../theme/index';
import { lockMessageKey } from './AppLockScreen';

/** Settings toggle; enabling requires a successful device authentication first. */
export function AppLockSettingsRow() {
    const { t } = useI18n();
    const { colors } = useTheme();
    const { scaleFont } = useResponsive();
    const styles = useThemedStyles(createStyles);
    const lock = useAppLock();
    const { controller } = lock;

    useEffect(() => () => controller.dismissMessage(), [controller]);

    return (
        <View>
            <View style={styles.row}>
                <Icon name="lock-closed-outline" size={22} color={colors.primaryLight} />
                <View style={styles.info}>
                    <Text style={[styles.title, { fontSize: scaleFont(typography.fontSize.base) }]}>
                        {t('appLock.settingsTitle')}
                    </Text>
                    <Text style={[styles.subtitle, { fontSize: scaleFont(typography.fontSize.xs) }]}>
                        {t('appLock.settingsDescription')}
                    </Text>
                </View>
                <Switch
                    value={lock.enabled}
                    onValueChange={(next) => {
                        if (next) {
                            controller.enable();
                        } else {
                            controller.disable();
                        }
                    }}
                    disabled={lock.authenticating}
                    trackColor={{ false: colors.border, true: `${colors.primaryLight}66` }}
                    thumbColor={lock.enabled ? colors.primaryLight : colors.surfaceElevated}
                    ios_backgroundColor={colors.border}
                />
            </View>
            {lock.message ? (
                <Text style={styles.error} accessibilityLiveRegion="polite">
                    {t(lockMessageKey(lock.message))}
                </Text>
            ) : null}
        </View>
    );
}

const createStyles = (colors: SemanticColors) =>
    StyleSheet.create({
        row: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.base,
            paddingVertical: spacing.base,
            borderTopWidth: 1,
            borderTopColor: colors.border,
        },
        info: { flex: 1 },
        title: {
            color: colors.textPrimary,
            fontWeight: typography.fontWeight.semibold,
        },
        subtitle: {
            color: colors.textMuted,
            marginTop: spacing.xs,
            lineHeight: 18,
        },
        error: {
            color: colors.error,
            fontSize: typography.fontSize.xs,
            marginBottom: spacing.sm,
        },
    });
