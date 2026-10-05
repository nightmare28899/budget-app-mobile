import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Button } from '../ui/primitives/Button';
import { Input } from '../ui/primitives/Input';
import { CategoryIcon } from '../CategoryIcon';
import { useI18n } from '../../hooks/shared/useI18n';
import {
    CATEGORY_COLOR_OPTIONS,
    CATEGORY_ICON_OPTIONS,
} from '../../hooks/categories/useCategoryCreator';
import { useCategoryManager } from '../../hooks/categories/useCategoryManager';
import {
    CATEGORY_NAME_MAX_LENGTH,
} from '../../utils/domain/categoryManagement';
import {
    borderRadius,
    spacing,
    typography,
    useResponsive,
    useThemedStyles,
    SemanticColors,
} from '../../theme/index';

export type EditableCategory = {
    id: string;
    name: string;
    icon?: string | null;
    color?: string | null;
};

type Props = {
    category: EditableCategory | null;
    onClose: () => void;
};

export function CategoryEditModal({ category, onClose }: Props) {
    const styles = useThemedStyles(createStyles);
    const { modalMaxWidth, scaleFont } = useResponsive();
    const { t } = useI18n();
    const [name, setName] = React.useState('');
    const [icon, setIcon] = React.useState<string>(CATEGORY_ICON_OPTIONS[0]);
    const [color, setColor] = React.useState<string>(CATEGORY_COLOR_OPTIONS[0]);
    const [error, setError] = React.useState<string | undefined>();
    const { updateCategory, confirmDelete, isPending } = useCategoryManager(onClose);

    React.useEffect(() => {
        if (category) {
            setName(category.name);
            setIcon(category.icon || CATEGORY_ICON_OPTIONS[0]);
            setColor(category.color || CATEGORY_COLOR_OPTIONS[0]);
            setError(undefined);
        }
    }, [category]);

    const onSave = () => {
        if (!category) {
            return;
        }
        const trimmed = name.trim();
        if (!trimmed || trimmed.length > CATEGORY_NAME_MAX_LENGTH) {
            setError(t('parity.category.nameInvalid'));
            return;
        }
        updateCategory({
            original: {
                id: category.id,
                name: category.name,
                icon: category.icon,
                color: category.color,
            },
            next: { name: trimmed, icon, color },
        });
    };

    return (
        <Modal animationType="fade" transparent visible={!!category} onRequestClose={onClose}>
            <View style={styles.backdrop}>
                <ScrollView
                    style={[styles.card, { maxWidth: modalMaxWidth }]}
                    contentContainerStyle={styles.cardContent}
                    keyboardShouldPersistTaps="handled"
                >
                    <Text style={[styles.title, { fontSize: scaleFont(typography.fontSize.xl) }]}>
                        {t('parity.category.editTitle')}
                    </Text>
                    <Input
                        label={t('parity.category.name')}
                        value={name}
                        onChangeText={(value) => {
                            setName(value);
                            setError(undefined);
                        }}
                        maxLength={CATEGORY_NAME_MAX_LENGTH}
                        error={error}
                    />
                    <Text style={styles.label}>{t('parity.category.icon')}</Text>
                    <View style={styles.optionsRow}>
                        {CATEGORY_ICON_OPTIONS.map((option) => (
                            <TouchableOpacity
                                key={option}
                                onPress={() => setIcon(option)}
                                style={[styles.iconOption, icon === option && styles.optionSelected]}
                            >
                                <CategoryIcon icon={option} categoryName="" size={20} color={color} />
                            </TouchableOpacity>
                        ))}
                    </View>
                    <Text style={styles.label}>{t('parity.category.color')}</Text>
                    <View style={styles.optionsRow}>
                        {CATEGORY_COLOR_OPTIONS.map((option) => (
                            <TouchableOpacity
                                key={option}
                                onPress={() => setColor(option)}
                                style={[
                                    styles.colorOption,
                                    { backgroundColor: option },
                                    color === option && styles.optionSelected,
                                ]}
                            />
                        ))}
                    </View>
                    <Button title={t('common.save')} onPress={onSave} loading={isPending} />
                    <Button
                        title={t('parity.category.delete')}
                        variant="danger"
                        onPress={() => category && confirmDelete(category)}
                        disabled={isPending}
                    />
                    <Button
                        title={t('common.cancel')}
                        variant="ghost"
                        onPress={onClose}
                        disabled={isPending}
                    />
                </ScrollView>
            </View>
        </Modal>
    );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.42)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    card: {
        width: '100%',
        maxHeight: '90%',
        borderRadius: borderRadius.xl,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
    },
    cardContent: {
        padding: spacing.xl,
        gap: spacing.base,
    },
    title: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.bold,
    },
    label: {
        color: colors.textSecondary,
        fontWeight: typography.fontWeight.semibold,
    },
    optionsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    iconOption: {
        width: 42,
        height: 42,
        borderRadius: borderRadius.full,
        borderWidth: 2,
        borderColor: 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.border,
    },
    colorOption: {
        width: 34,
        height: 34,
        borderRadius: borderRadius.full,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    optionSelected: {
        borderColor: colors.primaryAction,
    },
});
