import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    TouchableWithoutFeedback,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {
    spacing,
    typography,
    borderRadius,
    useResponsive,
    useTheme,
    useThemedStyles,
} from '../../theme';
import { useI18n } from '../../hooks/useI18n';
import {
    getPaymentMethodOption,
    PAYMENT_METHOD_OPTIONS,
} from '../../utils/paymentMethod';

interface PaymentMethodSelectorProps {
    value: string | undefined;
    onChange: (value: string | undefined) => void;
}

export function PaymentMethodSelector({ value, onChange }: PaymentMethodSelectorProps) {
    const [visible, setVisible] = useState(false);
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);
    const { scaleFont } = useResponsive();
    const { t } = useI18n();

    const selectedMethod = getPaymentMethodOption(value);

    const displayLabel = selectedMethod
        ? t(selectedMethod.labelKey)
        : t('paymentMethod.select');
    const displayIcon = selectedMethod ? selectedMethod.icon : 'wallet-outline';
    const displayColor = selectedMethod ? colors.primaryLight : colors.textSecondary;

    const handleSelect = (id: string | undefined) => {
        onChange(id);
        setVisible(false);
    };

    return (
        <View style={styles.container}>
            <Text style={[styles.label, { fontSize: scaleFont(typography.fontSize.sm) }]}>
                {t('paymentMethod.label')}
            </Text>

            <TouchableOpacity
                style={styles.selectorButton}
                activeOpacity={0.7}
                onPress={() => setVisible(true)}
            >
                <View style={styles.selectorContent}>
                    <Icon name={displayIcon} size={20} color={displayColor} />
                    <Text
                        style={[
                            styles.selectorText,
                            { fontSize: scaleFont(typography.fontSize.base) },
                            !selectedMethod && { color: colors.textSecondary },
                        ]}
                    >
                        {displayLabel}
                    </Text>
                </View>
                <Icon name="chevron-down" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            <Modal
                visible={visible}
                transparent
                animationType="fade"
                onRequestClose={() => setVisible(false)}
            >
                <TouchableWithoutFeedback onPress={() => setVisible(false)}>
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback>
                            <View style={styles.modalContent}>
                                <Text style={[styles.modalTitle, { fontSize: scaleFont(typography.fontSize.lg) }]}>
                                    {t('paymentMethod.label')}
                                </Text>

                                <TouchableOpacity
                                    style={[
                                        styles.optionButton,
                                        !value && styles.optionButtonSelected,
                                    ]}
                                    activeOpacity={0.7}
                                    onPress={() => handleSelect(undefined)}
                                >
                                    <View style={styles.optionContent}>
                                        <Icon
                                            name="remove-circle-outline"
                                            size={24}
                                            color={!value ? colors.primaryLight : colors.textSecondary}
                                        />
                                        <Text
                                            style={[
                                                styles.optionText,
                                                { fontSize: scaleFont(typography.fontSize.base) },
                                                !value && styles.optionTextSelected,
                                            ]}
                                        >
                                            {t('paymentMethod.none')}
                                        </Text>
                                    </View>
                                    {!value && (
                                        <Icon name="checkmark" size={24} color={colors.primaryLight} />
                                    )}
                                </TouchableOpacity>

                                {PAYMENT_METHOD_OPTIONS.map((method) => {
                                    const isSelected = value === method.id;
                                    return (
                                        <TouchableOpacity
                                            key={method.id}
                                            style={[
                                                styles.optionButton,
                                                isSelected && styles.optionButtonSelected
                                            ]}
                                            activeOpacity={0.7}
                                            onPress={() => handleSelect(method.id)}
                                        >
                                            <View style={styles.optionContent}>
                                                <Icon
                                                    name={method.icon}
                                                    size={24}
                                                    color={
                                                        isSelected
                                                            ? colors.primaryLight
                                                            : colors.textPrimary
                                                    }
                                                />
                                                <Text
                                                    style={[
                                                        styles.optionText,
                                                        { fontSize: scaleFont(typography.fontSize.base) },
                                                        isSelected && styles.optionTextSelected,
                                                    ]}
                                                >
                                                    {t(method.labelKey)}
                                                </Text>
                                            </View>
                                            {isSelected && (
                                                <Icon name="checkmark" size={24} color={colors.primaryLight} />
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </View>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        marginBottom: spacing.lg,
    },
    label: {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.medium,
        color: colors.textSecondary,
        marginBottom: spacing.sm,
        marginLeft: spacing.xs,
    },
    selectorButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.surfaceElevated,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
    },
    selectorContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    selectorText: {
        fontSize: typography.fontSize.base,
        color: colors.textPrimary,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    modalContent: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: colors.surfaceCard,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        borderWidth: 1,
        borderColor: colors.border,
    },
    modalTitle: {
        fontSize: typography.fontSize.lg,
        fontWeight: typography.fontWeight.bold,
        color: colors.textPrimary,
        marginBottom: spacing.lg,
        textAlign: 'center',
    },
    optionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.md,
        marginBottom: spacing.xs,
    },
    optionButtonSelected: {
        backgroundColor: colors.primary + '15',
    },
    optionContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    optionText: {
        fontSize: typography.fontSize.base,
        color: colors.textPrimary,
    },
    optionTextSelected: {
        color: colors.primaryLight,
        fontWeight: typography.fontWeight.semibold,
    },
});
