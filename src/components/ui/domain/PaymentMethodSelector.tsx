import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Easing,
    Pressable,
    PanResponder,
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
    SemanticColors,
} from '../../../theme/index';
import { useI18n } from '../../../hooks/useI18n';
import {
    getPaymentMethodOption,
    PAYMENT_METHOD_OPTIONS,
} from '../../../utils/domain/paymentMethod';

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
    const windowHeight = Dimensions.get('window').height;
    const sheetHeight = Math.min(420, Math.max(300, windowHeight * 0.52));
    const translateY = useRef(new Animated.Value(sheetHeight)).current;
    const backdropOpacity = useRef(new Animated.Value(0)).current;

    const selectedMethod = getPaymentMethodOption(value);

    const displayLabel = selectedMethod
        ? t(selectedMethod.labelKey)
        : t('paymentMethod.select');
    const displayIcon = selectedMethod ? selectedMethod.icon : 'wallet-outline';
    const displayColor = selectedMethod ? colors.primaryLight : colors.textSecondary;

    const closeSheet = useCallback(() => {
        Animated.parallel([
            Animated.timing(translateY, {
                toValue: sheetHeight,
                duration: 220,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
            Animated.timing(backdropOpacity, {
                toValue: 0,
                duration: 180,
                useNativeDriver: true,
            }),
        ]).start(({ finished }) => {
            if (finished) {
                setVisible(false);
            }
        });
    }, [backdropOpacity, sheetHeight, translateY]);

    const openSheet = useCallback(() => {
        setVisible(true);
        requestAnimationFrame(() => {
            Animated.parallel([
                Animated.timing(translateY, {
                    toValue: 0,
                    duration: 260,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                }),
                Animated.timing(backdropOpacity, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        });
    }, [backdropOpacity, translateY]);

    const handleSelect = (id: string | undefined) => {
        onChange(id);
        closeSheet();
    };

    const panResponder = useMemo(
        () =>
            PanResponder.create({
                onMoveShouldSetPanResponder: (_evt, gestureState) =>
                    gestureState.dy > 6 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
                onPanResponderMove: (_evt, gestureState) => {
                    if (gestureState.dy <= 0) return;
                    const progress = Math.max(0, Math.min(1, gestureState.dy / sheetHeight));
                    translateY.setValue(gestureState.dy);
                    backdropOpacity.setValue(1 - progress);
                },
                onPanResponderRelease: (_evt, gestureState) => {
                    const shouldClose = gestureState.dy > 100 || gestureState.vy > 1;
                    if (shouldClose) {
                        closeSheet();
                        return;
                    }
                    Animated.parallel([
                        Animated.spring(translateY, {
                            toValue: 0,
                            bounciness: 0,
                            speed: 18,
                            useNativeDriver: true,
                        }),
                        Animated.timing(backdropOpacity, {
                            toValue: 1,
                            duration: 160,
                            useNativeDriver: true,
                        }),
                    ]).start();
                },
            }),
        [backdropOpacity, closeSheet, sheetHeight, translateY],
    );

    return (
        <View style={styles.container}>
            <Text style={[styles.label, { fontSize: scaleFont(typography.fontSize.sm) }]}>
                {t('paymentMethod.label')}
            </Text>

            <TouchableOpacity
                style={styles.selectorButton}
                activeOpacity={0.7}
                onPress={openSheet}
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
                animationType="none"
                onRequestClose={closeSheet}
            >
                <View style={styles.modalOverlay}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={closeSheet}>
                        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} />
                    </Pressable>
                    <Animated.View
                        style={[
                            styles.modalContent,
                            {
                                maxHeight: sheetHeight,
                                transform: [{ translateY }],
                            },
                        ]}
                    >
                        <View style={styles.dragZone} {...panResponder.panHandlers}>
                            <View style={styles.dragHandle} />
                        </View>
                        <TouchableWithoutFeedback>
                            <View style={styles.modalBody}>
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
                    </Animated.View>
                </View>
            </Modal>
        </View>
    );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
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
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        width: '100%',
        backgroundColor: colors.surfaceCard,
        borderTopLeftRadius: borderRadius.xl,
        borderTopRightRadius: borderRadius.xl,
        borderWidth: 1,
        borderColor: colors.border,
    },
    modalBody: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.xl,
        paddingTop: spacing.sm,
    },
    dragZone: {
        alignItems: 'center',
        paddingTop: spacing.sm,
        paddingBottom: spacing.xs,
    },
    dragHandle: {
        width: 44,
        height: 5,
        borderRadius: borderRadius.full,
        backgroundColor: colors.border,
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
