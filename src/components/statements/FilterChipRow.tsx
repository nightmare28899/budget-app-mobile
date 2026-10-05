import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import {
    borderRadius,
    SemanticColors,
    spacing,
    typography,
    useResponsive,
    useThemedStyles,
} from '../../theme/index';

export type FilterChip = { key: string; label: string };

type FilterChipRowProps = {
    chips: FilterChip[];
    selectedKey: string;
    onSelect: (key: string) => void;
    horizontalPadding: number;
};

export function FilterChipRow({ chips, selectedKey, onSelect, horizontalPadding }: FilterChipRowProps) {
    const styles = useThemedStyles(createStyles);
    const { scaleFont } = useResponsive();

    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.scroller}
            contentContainerStyle={[styles.row, { paddingHorizontal: horizontalPadding }]}
        >
            {chips.map(chip => {
                const selected = chip.key === selectedKey;
                return (
                    <TouchableOpacity
                        key={chip.key}
                        style={[styles.chip, selected ? styles.chipSelected : null]}
                        activeOpacity={0.85}
                        onPress={() => onSelect(chip.key)}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                    >
                        <Text
                            style={[
                                styles.chipText,
                                selected ? styles.chipTextSelected : null,
                                { fontSize: scaleFont(typography.fontSize.sm) },
                            ]}
                        >
                            {chip.label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </ScrollView>
    );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
    scroller: {
        flexGrow: 0,
        flexShrink: 0,
    },
    row: {
        alignItems: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.xs,
    },
    chip: {
        paddingHorizontal: spacing.base,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.full,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
    },
    chipSelected: {
        backgroundColor: colors.primaryAction,
        borderColor: colors.primaryAction,
    },
    chipText: {
        color: colors.textSecondary,
        fontWeight: typography.fontWeight.semibold,
    },
    chipTextSelected: {
        color: '#FFFFFF',
    },
});
