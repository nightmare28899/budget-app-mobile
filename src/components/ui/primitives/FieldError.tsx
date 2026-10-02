import React from 'react';
import {
    StyleProp,
    StyleSheet,
    Text,
    View,
    ViewStyle,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {
    borderRadius,
    SemanticColors,
    spacing,
    typography,
    useResponsive,
    useThemedStyles,
} from '../../../theme/index';

type FieldErrorProps = {
    message?: string;
    containerStyle?: StyleProp<ViewStyle>;
};

export function FieldError({ message, containerStyle }: FieldErrorProps) {
    const styles = useThemedStyles(createStyles);
    const { scaleFont } = useResponsive();

    if (!message) {
        return null;
    }

    return (
        <View
            style={[styles.container, containerStyle]}
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
        >
            <Icon name="alert-circle-outline" size={17} style={styles.icon} />
            <Text
                style={[
                    styles.message,
                    { fontSize: scaleFont(typography.fontSize.sm) },
                ]}
            >
                {message}
            </Text>
        </View>
    );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
    container: {
        minHeight: 36,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: `${colors.error}70`,
        backgroundColor: `${colors.error}12`,
    },
    icon: {
        color: colors.error,
    },
    message: {
        flex: 1,
        color: colors.error,
        fontWeight: typography.fontWeight.medium,
        lineHeight: 18,
    },
});
