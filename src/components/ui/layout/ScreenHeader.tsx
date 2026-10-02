import React from 'react';
import {
    StyleProp,
    StyleSheet,
    Text,
    View,
    ViewStyle,
} from 'react-native';
import {
    SemanticColors,
    spacing,
    typography,
    useResponsive,
    useThemedStyles,
} from '../../../theme/index';
import { ScreenBackButton } from '../primitives/ScreenBackButton';

type ScreenHeaderProps = {
    title: string;
    subtitle?: string;
    onBack: () => void;
    backAccessibilityLabel?: string;
    rightAction?: React.ReactNode;
    containerStyle?: StyleProp<ViewStyle>;
};

export function ScreenHeader({
    title,
    subtitle,
    onBack,
    backAccessibilityLabel,
    rightAction,
    containerStyle,
}: ScreenHeaderProps) {
    const styles = useThemedStyles(createStyles);
    const { scaleFont } = useResponsive();

    return (
        <View style={[styles.container, containerStyle]}>
            <ScreenBackButton
                onPress={onBack}
                accessibilityLabel={backAccessibilityLabel}
            />
            <View style={styles.copy}>
                <Text
                    style={[
                        styles.title,
                        { fontSize: scaleFont(typography.fontSize['2xl']) },
                    ]}
                    accessibilityRole="header"
                    numberOfLines={2}
                >
                    {title}
                </Text>
                {subtitle ? (
                    <Text
                        style={[
                            styles.subtitle,
                            { fontSize: scaleFont(typography.fontSize.md) },
                        ]}
                        numberOfLines={2}
                    >
                        {subtitle}
                    </Text>
                ) : null}
            </View>
            {rightAction ? <View style={styles.rightAction}>{rightAction}</View> : null}
        </View>
    );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
    container: {
        minHeight: 52,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.base,
    },
    copy: {
        flex: 1,
        minHeight: 44,
        justifyContent: 'center',
    },
    title: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.bold,
        lineHeight: 28,
    },
    subtitle: {
        color: colors.textMuted,
        marginTop: spacing.xs,
        lineHeight: 20,
    },
    rightAction: {
        minWidth: 44,
        minHeight: 44,
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
});
