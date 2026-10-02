import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useI18n } from '../../../hooks/shared/useI18n';
import { withAlpha } from '../../../utils/domain/subscriptions';
import {
    borderRadius,
    spacing,
    typography,
    useResponsive,
    useTheme,
    useThemedStyles,
    SemanticColors,
} from '../../../theme/index';

type SwipeHintCardProps = {
    accentColor: string;
    onDismiss: () => void;
};

export function SwipeHintCard({ accentColor, onDismiss }: SwipeHintCardProps) {
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);
    const { t } = useI18n();
    const { scaleFont } = useResponsive();

    return (
        <View
            style={[
                styles.card,
                {
                    borderColor: withAlpha(accentColor, 0.26),
                    backgroundColor: withAlpha(accentColor, 0.1),
                },
            ]}
        >
            <View style={styles.topRow}>
                <View
                    style={[
                        styles.iconBadge,
                        {
                            backgroundColor: withAlpha(accentColor, 0.16),
                            borderColor: withAlpha(accentColor, 0.3),
                        },
                    ]}
                >
                    <Icon name="swap-horizontal-outline" size={18} color={accentColor} />
                </View>
                <TouchableOpacity
                    onPress={onDismiss}
                    activeOpacity={0.84}
                    style={[
                        styles.dismissButton,
                        {
                            backgroundColor: withAlpha(colors.surfaceCard, 0.72),
                            borderColor: withAlpha(accentColor, 0.24),
                        },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={t('common.gotIt')}
                >
                    <Text
                        style={[
                            styles.dismissText,
                            { fontSize: scaleFont(typography.fontSize.sm) },
                        ]}
                    >
                        {t('common.gotIt')}
                    </Text>
                </TouchableOpacity>
            </View>

            <Text
                style={[
                    styles.title,
                    { fontSize: scaleFont(typography.fontSize.base) },
                ]}
            >
                {t('swipeHint.title')}
            </Text>
            <Text
                style={[
                    styles.description,
                    { fontSize: scaleFont(typography.fontSize.sm) },
                ]}
            >
                {t('swipeHint.description')}
            </Text>

            <View style={styles.previewRow}>
                <View
                    style={[
                        styles.gesturePill,
                        {
                            backgroundColor: withAlpha(colors.surfaceCard, 0.76),
                            borderColor: withAlpha(accentColor, 0.22),
                        },
                    ]}
                >
                    <Icon name="arrow-back-outline" size={15} color={accentColor} />
                    <Text
                        style={[
                            styles.gestureText,
                            { fontSize: scaleFont(typography.fontSize.xs) },
                        ]}
                    >
                        {t('swipeHint.gesture')}
                    </Text>
                </View>

                <View style={styles.actionChips}>
                    <View
                        style={[
                            styles.actionChip,
                            {
                                backgroundColor: withAlpha(accentColor, 0.18),
                                borderColor: withAlpha(accentColor, 0.28),
                            },
                        ]}
                    >
                        <Text
                            style={[
                                styles.actionChipText,
                                { fontSize: scaleFont(typography.fontSize.xs) },
                            ]}
                        >
                            {t('common.edit')}
                        </Text>
                    </View>
                    <View
                        style={[
                            styles.actionChip,
                            {
                                backgroundColor: withAlpha(colors.error, 0.18),
                                borderColor: withAlpha(colors.error, 0.28),
                            },
                        ]}
                    >
                        <Text
                            style={[
                                styles.actionChipText,
                                { fontSize: scaleFont(typography.fontSize.xs) },
                            ]}
                        >
                            {t('common.delete')}
                        </Text>
                    </View>
                </View>
            </View>
        </View>
    );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
    card: {
        borderRadius: borderRadius.xl,
        borderWidth: 1,
        padding: spacing.base,
        marginBottom: spacing.lg,
        overflow: 'hidden',
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    iconBadge: {
        width: 34,
        height: 34,
        borderRadius: 17,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dismissButton: {
        minHeight: 44,
        borderRadius: borderRadius.full,
        borderWidth: 1,
        paddingHorizontal: spacing.base,
        justifyContent: 'center',
    },
    dismissText: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.semibold,
    },
    title: {
        marginTop: spacing.sm,
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.bold,
    },
    description: {
        marginTop: spacing.xs,
        color: colors.textSecondary,
        lineHeight: 20,
    },
    previewRow: {
        marginTop: spacing.base,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.sm,
        flexWrap: 'wrap',
    },
    gesturePill: {
        borderRadius: borderRadius.full,
        borderWidth: 1,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs + 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    gestureText: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.semibold,
    },
    actionChips: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    actionChip: {
        borderRadius: borderRadius.full,
        borderWidth: 1,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs + 1,
    },
    actionChipText: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.semibold,
    },
});
