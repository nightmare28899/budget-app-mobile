import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { ScreenBackButton } from '../ui/primitives/ScreenBackButton';
import {
    borderRadius,
    SemanticColors,
    spacing,
    typography,
    useResponsive,
    useThemedStyles,
} from '../../theme/index';

type StatementScreenHeaderProps = {
    title: string;
    subtitle?: string;
    onBack: () => void;
    actionIcon?: string;
    actionLabel?: string;
    onAction?: () => void;
};

export function StatementScreenHeader({
    title,
    subtitle,
    onBack,
    actionIcon,
    actionLabel,
    onAction,
}: StatementScreenHeaderProps) {
    const styles = useThemedStyles(createStyles);
    const insets = useSafeAreaInsets();
    const { horizontalPadding, contentMaxWidth, scaleFont } = useResponsive();
    const maxWidthStyle = contentMaxWidth
        ? { maxWidth: contentMaxWidth, alignSelf: 'center' as const, width: '100%' as const }
        : null;

    return (
        <View
            style={[
                styles.header,
                { paddingTop: insets.top + spacing.base, paddingHorizontal: horizontalPadding },
                maxWidthStyle,
            ]}
        >
            <View style={styles.row}>
                <ScreenBackButton onPress={onBack} containerStyle={styles.back} />
                <View style={styles.textWrap}>
                    <Text style={[styles.title, { fontSize: scaleFont(typography.fontSize['2xl']) }]}>
                        {title}
                    </Text>
                    {subtitle ? (
                        <Text style={[styles.subtitle, { fontSize: scaleFont(typography.fontSize.md) }]}>
                            {subtitle}
                        </Text>
                    ) : null}
                </View>
                {actionIcon && onAction ? (
                    <TouchableOpacity
                        style={styles.action}
                        activeOpacity={0.85}
                        onPress={onAction}
                        accessibilityRole="button"
                        accessibilityLabel={actionLabel}
                    >
                        <Icon name={actionIcon} size={22} color="#FFFFFF" />
                    </TouchableOpacity>
                ) : null}
            </View>
        </View>
    );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
    header: {
        paddingBottom: spacing.base,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: spacing.base,
    },
    back: {
        marginTop: 2,
    },
    textWrap: {
        flex: 1,
    },
    title: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.bold,
    },
    subtitle: {
        color: colors.textSecondary,
        marginTop: spacing.xs,
    },
    action: {
        width: 42,
        height: 42,
        borderRadius: borderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primaryAction,
    },
});
