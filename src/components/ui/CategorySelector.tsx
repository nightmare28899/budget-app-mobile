import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import {
    spacing,
    typography,
    borderRadius,
    useResponsive,
    useTheme,
    useThemedStyles,
} from '../../theme';
import { Category } from '../../types';
import { CategoryIcon } from '../CategoryIcon';
import { CategorySelectorSkeleton } from './Skeleton';
import { useI18n } from '../../hooks/useI18n';
import { withAlpha } from '../../utils/subscriptions';

interface CategorySelectorProps {
    categories: Category[];
    isLoading: boolean;
    selectedCategory: string | undefined;
    onSelectCategory: (id: string) => void;
}

export function CategorySelector({
    categories,
    isLoading,
    selectedCategory,
    onSelectCategory,
}: CategorySelectorProps) {
    const { isSmallPhone, scaleFont, scaleSize } = useResponsive();
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);
    const { t } = useI18n();

    const chipVerticalPadding = isSmallPhone ? spacing.xs : spacing.sm;
    const chipHorizontalPadding = scaleSize(spacing.base);

    if (isLoading) {
        return (
            <View style={styles.categoryLoading}>
                <CategorySelectorSkeleton />
            </View>
        );
    }

    if (categories.length === 0) {
        return (
            <Text style={styles.noCategoryText}>
                {t('category.noneAvailable')}
            </Text>
        );
    }

    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
        >
            {categories.map((cat: Category) => (
                <TouchableOpacity
                    key={cat.id}
                    style={[
                        styles.categoryChip,
                        {
                            paddingVertical: chipVerticalPadding,
                            paddingHorizontal: chipHorizontalPadding,
                        },
                        selectedCategory === cat.id && styles.categoryChipSelected,
                    ]}
                    onPress={() => onSelectCategory(cat.id)}
                    activeOpacity={0.7}
                >
                    <View style={styles.categoryIcon}>
                        <CategoryIcon
                            icon={cat.icon}
                            categoryName={cat.name}
                            size={16}
                            color={
                                selectedCategory === cat.id
                                    ? colors.primaryLight
                                    : colors.textSecondary
                            }
                        />
                    </View>
                    <Text
                        style={[
                            styles.categoryName,
                            { fontSize: scaleFont(typography.fontSize.sm) },
                            selectedCategory === cat.id &&
                            styles.categoryNameSelected,
                        ]}
                    >
                        {cat.name}
                    </Text>
                </TouchableOpacity>
            ))}
        </ScrollView>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    categoryScroll: {
        gap: spacing.sm,
    },
    categoryLoading: {
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surfaceElevated,
        borderRadius: borderRadius.full,
        paddingHorizontal: spacing.base,
        paddingVertical: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border,
    },
    categoryChipSelected: {
        backgroundColor: withAlpha(colors.primary, 0.3),
        borderColor: colors.primary,
    },
    categoryIcon: {
        marginRight: spacing.xs,
    },
    categoryName: {
        fontSize: typography.fontSize.sm,
        color: colors.textSecondary,
        fontWeight: typography.fontWeight.medium,
    },
    categoryNameSelected: {
        color: colors.primaryLight,
    },
    noCategoryText: {
        fontSize: typography.fontSize.sm,
        color: colors.textMuted,
    },
});
