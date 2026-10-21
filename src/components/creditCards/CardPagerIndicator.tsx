import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Reanimated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { selectionPosition, showsNumericIndicator } from '../../modules/creditCards/cardStack';
import { useI18n } from '../../hooks/shared/useI18n';
import { SemanticColors, spacing, typography, useThemedStyles, useTheme } from '../../theme/index';

type CardPagerIndicatorProps = {
    count: number;
    current: number;
};

function Dot({ selected, color, idleColor }: { selected: boolean; color: string; idleColor: string }) {
    const width = useSharedValue(selected ? 20 : 8);
    useEffect(() => {
        width.value = withTiming(selected ? 20 : 8, { duration: 200 });
    }, [selected, width]);
    const style = useAnimatedStyle(() => ({ width: width.value }));
    return (
        <Reanimated.View
            style={[styles.dot, { backgroundColor: selected ? color : idleColor }, style]}
        />
    );
}

/** Dots under the carousel (the selected one stretches); a "2 of 6" counter past the visible window. Hidden for a single card. */
export function CardPagerIndicator({ count, current }: CardPagerIndicatorProps) {
    const { colors } = useTheme();
    const themed = useThemedStyles(createStyles);
    const { t } = useI18n();
    if (count < 2) {
        return null;
    }
    const safe = Math.min(Math.max(current, 0), count - 1);
    const [position, total] = selectionPosition(safe, count);
    const positionText = t('creditCards.pagerPosition', { position, total });

    return (
        <View style={themed.row}>
            {showsNumericIndicator(count) ? (
                <Text style={themed.counter}>{positionText}</Text>
            ) : (
                <View style={styles.dots} accessible accessibilityLabel={positionText}>
                    {Array.from({ length: count }, (_, i) => (
                        <Dot
                            key={i}
                            selected={i === safe}
                            color={colors.primary}
                            idleColor={`${colors.border}`}
                        />
                    ))}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    dots: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    dot: {
        height: 8,
        borderRadius: 4,
    },
});

const createStyles = (colors: SemanticColors) => StyleSheet.create({
    row: {
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.base,
    },
    counter: {
        color: colors.textSecondary,
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.medium,
    },
});
