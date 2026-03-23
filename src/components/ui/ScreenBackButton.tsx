import React from 'react';
import { StyleProp, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme, useThemedStyles } from '../../theme';

type ScreenBackButtonProps = {
    onPress: () => void;
    containerStyle?: StyleProp<ViewStyle>;
};

export function ScreenBackButton({ onPress, containerStyle }: ScreenBackButtonProps) {
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);

    return (
        <TouchableOpacity
            style={[styles.button, containerStyle]}
            onPress={onPress}
            activeOpacity={0.8}
        >
            <Icon name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    button: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surfaceCard,
        borderWidth: 1,
        borderColor: colors.border,
    },
});
