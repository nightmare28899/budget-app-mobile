import React, { useState } from 'react';
import { Linking, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAppAlert } from '../alerts/AlertProvider';
import { reminderPort } from '../../hooks/reminders/reminderRuntime';
import { useI18n } from '../../hooks/shared/useI18n';
import { LEAD_OPTIONS } from '../../modules/reminders';
import { useReminderSettingsStore } from '../../store/reminderSettingsStore';
import {
    SemanticColors,
    borderRadius,
    spacing,
    typography,
    useResponsive,
    useTheme,
    useThemedStyles,
} from '../../theme/index';
import type { TranslationKey } from '../../i18n/index';

const LEAD_LABELS: Record<number, TranslationKey> = {
    0: 'reminders.lead0',
    1: 'reminders.lead1',
    3: 'reminders.lead3',
};

/** Settings toggle for on-device payment reminders; the notification permission is asked here, in context. */
export function RemindersSettingsRow() {
    const { t } = useI18n();
    const { alert } = useAppAlert();
    const { colors } = useTheme();
    const { scaleFont } = useResponsive();
    const styles = useThemedStyles(createStyles);
    const enabled = useReminderSettingsStore(s => s.enabled);
    const leadDays = useReminderSettingsStore(s => s.leadDays);
    const setEnabled = useReminderSettingsStore(s => s.setEnabled);
    const setLeadDays = useReminderSettingsStore(s => s.setLeadDays);
    const [requesting, setRequesting] = useState(false);

    const onToggle = async (wanted: boolean) => {
        if (!wanted) {
            setEnabled(false);
            return;
        }
        setRequesting(true);
        try {
            if (await reminderPort.requestPermission()) {
                setEnabled(true);
                return;
            }
            alert(t('reminders.settingsTitle'), t('reminders.permissionDenied'), [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('reminders.openSettings'),
                    onPress: () => {
                        Linking.openSettings().catch(() => undefined);
                    },
                },
            ]);
        } finally {
            setRequesting(false);
        }
    };

    return (
        <View>
            <View style={styles.row}>
                <Icon name="notifications-outline" size={22} color={colors.primaryLight} />
                <View style={styles.info}>
                    <Text style={[styles.title, { fontSize: scaleFont(typography.fontSize.base) }]}>
                        {t('reminders.settingsTitle')}
                    </Text>
                    <Text style={[styles.subtitle, { fontSize: scaleFont(typography.fontSize.xs) }]}>
                        {t('reminders.settingsDescription')}
                    </Text>
                </View>
                <Switch
                    value={enabled}
                    onValueChange={onToggle}
                    disabled={requesting}
                    trackColor={{ false: colors.border, true: `${colors.primaryLight}66` }}
                    thumbColor={enabled ? colors.primaryLight : colors.surfaceElevated}
                    ios_backgroundColor={colors.border}
                />
            </View>
            {enabled ? (
                <View style={styles.leadBlock}>
                    <Text style={[styles.leadLabel, { fontSize: scaleFont(typography.fontSize.sm) }]}>
                        {t('reminders.leadLabel')}
                    </Text>
                    <View style={styles.chips}>
                        {LEAD_OPTIONS.map(days => {
                            const selected = leadDays === days;
                            return (
                                <TouchableOpacity
                                    key={days}
                                    style={[
                                        styles.chip,
                                        selected && {
                                            borderColor: colors.primaryLight,
                                            backgroundColor: `${colors.primaryLight}22`,
                                        },
                                    ]}
                                    onPress={() => setLeadDays(days)}
                                    accessibilityRole="button"
                                    accessibilityState={{ selected }}
                                    activeOpacity={0.7}
                                >
                                    <Text
                                        style={[
                                            styles.chipText,
                                            selected && { color: colors.textPrimary },
                                        ]}
                                    >
                                        {t(LEAD_LABELS[days])}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
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
        leadBlock: { paddingBottom: spacing.base },
        leadLabel: {
            color: colors.textSecondary,
            fontWeight: typography.fontWeight.medium,
        },
        chips: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: spacing.sm,
            marginTop: spacing.sm,
        },
        chip: {
            borderRadius: borderRadius.full,
            borderWidth: 1,
            borderColor: colors.border,
            paddingHorizontal: spacing.base,
            paddingVertical: spacing.sm,
        },
        chipText: {
            color: colors.textSecondary,
            fontWeight: typography.fontWeight.medium,
        },
    });
