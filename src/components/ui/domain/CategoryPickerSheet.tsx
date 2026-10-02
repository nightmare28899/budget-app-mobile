import React, { useState } from 'react';
import {
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { Category } from '../../../types/index';
import { useI18n } from '../../../hooks/shared/useI18n';
import {
    borderRadius,
    spacing,
    typography,
    useResponsive,
    useTheme,
    useThemedStyles,
    SemanticColors,
} from '../../../theme/index';
import { withAlpha } from '../../../utils/domain/subscriptions';
import { CategoryIcon } from '../../CategoryIcon';
import { SearchField } from '../primitives/SearchField';

interface CategoryPickerSheetProps {
    categories: Category[];
    selectedCategory?: string;
    visible: boolean;
    onClose: () => void;
    onSelectCategory: (id: string) => void;
}

export function CategoryPickerSheet({
    categories,
    selectedCategory,
    visible,
    onClose,
    onSelectCategory,
}: CategoryPickerSheetProps) {
    const [query, setQuery] = useState('');
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);
    const { language, t } = useI18n();
    const { scaleFont } = useResponsive();
    const normalizedQuery = query.trim().toLowerCase();
    const filteredCategories = normalizedQuery.length > 0
        ? categories.filter((category) => category.name.toLowerCase().includes(normalizedQuery))
        : categories;
    const closeLabel = language === 'es' ? 'Cerrar' : 'Close';
    const clearLabel = language === 'es' ? 'Limpiar búsqueda' : 'Clear search';

    const handleSelect = (id: string) => {
        onSelectCategory(id);
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <KeyboardAvoidingView
                style={styles.overlay}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
            >
                <Pressable style={styles.backdrop} onPress={onClose} />
                <View
                    style={[
                        styles.sheet,
                        { paddingBottom: Math.max(insets.bottom, spacing.lg) },
                    ]}
                    accessibilityViewIsModal
                >
                    <View style={styles.handle} accessible={false} />
                    <View style={styles.header}>
                        <Text
                            style={[
                                styles.title,
                                { fontSize: scaleFont(typography.fontSize.lg) },
                            ]}
                        >
                            {t('editExpense.category')}
                        </Text>
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={onClose}
                            activeOpacity={0.75}
                            accessibilityRole="button"
                            accessibilityLabel={closeLabel}
                        >
                            <Icon name="close" size={22} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <SearchField
                        value={query}
                        onChangeText={setQuery}
                        placeholder={t('subscriptions.searchPlaceholder')}
                        clearAccessibilityLabel={clearLabel}
                        containerStyle={styles.search}
                    />

                    <FlatList<Category>
                        data={filteredCategories}
                        keyExtractor={(item: Category) => item.id}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.optionsContent}
                        ListEmptyComponent={(
                            <Text style={styles.emptyText}>
                                {t('category.noneAvailable')}
                            </Text>
                        )}
                        renderItem={({ item }) => {
                            const isSelected = selectedCategory === item.id;

                            return (
                                <TouchableOpacity
                                    style={[
                                        styles.option,
                                        isSelected ? styles.optionSelected : null,
                                    ]}
                                    onPress={() => handleSelect(item.id)}
                                    activeOpacity={0.78}
                                    accessibilityRole="button"
                                    accessibilityLabel={item.name}
                                    accessibilityState={{ selected: isSelected }}
                                >
                                    <CategoryIcon
                                        icon={item.icon}
                                        categoryName={item.name}
                                        size={22}
                                        color={
                                            isSelected
                                                ? colors.primaryLight
                                                : colors.textSecondary
                                        }
                                    />
                                    <Text
                                        style={[
                                            styles.optionText,
                                            { fontSize: scaleFont(typography.fontSize.base) },
                                            isSelected ? styles.optionTextSelected : null,
                                        ]}
                                        numberOfLines={1}
                                    >
                                        {item.name}
                                    </Text>
                                    {isSelected ? (
                                        <Icon
                                            name="checkmark"
                                            size={22}
                                            color={colors.primaryLight}
                                        />
                                    ) : null}
                                </TouchableOpacity>
                            );
                        }}
                    />
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: colors.overlay,
    },
    sheet: {
        width: '100%',
        maxHeight: '86%',
        minHeight: 320,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.sm,
        backgroundColor: colors.surfaceCard,
        borderTopLeftRadius: borderRadius.xl,
        borderTopRightRadius: borderRadius.xl,
        borderWidth: 1,
        borderColor: colors.border,
    },
    handle: {
        width: 40,
        height: 4,
        alignSelf: 'center',
        marginBottom: spacing.md,
        borderRadius: borderRadius.full,
        backgroundColor: colors.border,
    },
    header: {
        minHeight: 44,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.md,
    },
    title: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.bold,
    },
    closeButton: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: borderRadius.full,
    },
    search: {
        marginBottom: spacing.md,
    },
    optionsContent: {
        paddingBottom: spacing.sm,
        gap: spacing.sm,
    },
    option: {
        minHeight: 56,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.lg,
        backgroundColor: colors.surfaceElevated,
    },
    optionSelected: {
        borderColor: colors.primary,
        backgroundColor: withAlpha(colors.primary, 0.2),
    },
    optionText: {
        flex: 1,
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.medium,
    },
    optionTextSelected: {
        color: colors.primaryLight,
    },
    emptyText: {
        paddingVertical: spacing.lg,
        color: colors.textMuted,
        textAlign: 'center',
    },
});
