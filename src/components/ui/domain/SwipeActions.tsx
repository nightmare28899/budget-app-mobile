import React from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Reanimated, {
    Extrapolation,
    interpolate,
    useAnimatedStyle,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import {
    borderRadius,
    spacing,
    typography,
} from '../../../theme/index';

export const SWIPE_ACTIONS_WIDTH = 150;
export const SWIPE_ANIMATION_OPTIONS = {
    mass: 0.9,
    damping: 28,
    stiffness: 240,
    overshootClamping: true,
    restDisplacementThreshold: 0.01,
    restSpeedThreshold: 0.01,
};

type SwipeActionsProps = {
    progress: SharedValue<number>;
    editLabel: string;
    deleteLabel: string;
    editColor: string;
    deleteColor: string;
    textColor: string;
    onEdit?: () => void;
    onDelete?: () => void;
};

export function SwipeActions({
    progress,
    editLabel,
    deleteLabel,
    editColor,
    deleteColor,
    textColor,
    onEdit,
    onDelete,
}: SwipeActionsProps) {
    const animatedStyle = useAnimatedStyle(() => {
        const normalizedProgress = Math.max(0, Math.min(progress.value, 1));

        return {
            opacity: interpolate(
                normalizedProgress,
                [0, 0.45, 1],
                [0, 0.85, 1],
                Extrapolation.CLAMP,
            ),
            transform: [
                {
                    translateX: interpolate(
                        normalizedProgress,
                        [0, 1],
                        [SWIPE_ACTIONS_WIDTH * 0.28, 0],
                        Extrapolation.CLAMP,
                    ),
                },
                {
                    scale: interpolate(
                        normalizedProgress,
                        [0, 1],
                        [0.94, 1],
                        Extrapolation.CLAMP,
                    ),
                },
            ],
        };
    }, [progress]);

    return (
        <Reanimated.View style={[styles.container, animatedStyle]}>
            {onEdit ? (
                <TouchableOpacity
                    style={[styles.action, { backgroundColor: editColor }]}
                    onPress={onEdit}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel={editLabel}
                >
                    <View style={styles.content}>
                        <Icon name="create-outline" size={22} color={textColor} />
                        <Text style={[styles.label, { color: textColor }]}>{editLabel}</Text>
                    </View>
                </TouchableOpacity>
            ) : null}
            {onDelete ? (
                <TouchableOpacity
                    style={[styles.action, { backgroundColor: deleteColor }]}
                    onPress={onDelete}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel={deleteLabel}
                >
                    <View style={styles.content}>
                        <Icon name="trash-outline" size={22} color={textColor} />
                        <Text style={[styles.label, { color: textColor }]}>{deleteLabel}</Text>
                    </View>
                </TouchableOpacity>
            ) : null}
        </Reanimated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        width: SWIPE_ACTIONS_WIDTH,
        borderTopRightRadius: borderRadius.xl,
        borderBottomRightRadius: borderRadius.xl,
        overflow: 'hidden',
        transformOrigin: 'right center',
    },
    action: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.md,
    },
    label: {
        marginTop: 4,
        fontSize: typography.fontSize.xs,
        fontWeight: typography.fontWeight.bold,
        textAlign: 'center',
    },
});
