import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useI18n } from '../../hooks/useI18n';
import { borderRadius, spacing, typography, useTheme } from '../../theme';
import { Button } from './Button';

interface ThemeLivePreviewCardProps {
    onPress: () => void;
}

export function ThemeLivePreviewCard({ onPress }: ThemeLivePreviewCardProps) {
    const { colors } = useTheme();
    const { t } = useI18n();

    return (
        <View
            style={[
                styles.container,
                {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                },
            ]}
        >
            <Text style={[styles.title, { color: colors.textPrimary }]}>
                {t('settings.themeLivePreviewTitle')}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {t('settings.themeLivePreviewDesc')}
            </Text>
            <Button
                title={t('settings.themeLivePreviewButton')}
                onPress={onPress}
                containerStyle={styles.button}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderWidth: 1,
        borderRadius: borderRadius.lg,
        padding: spacing.base,
        marginTop: spacing.sm,
    },
    title: {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.bold,
    },
    subtitle: {
        fontSize: typography.fontSize.xs,
        marginTop: spacing.xs,
    },
    button: {
        marginTop: spacing.base,
    },
});
