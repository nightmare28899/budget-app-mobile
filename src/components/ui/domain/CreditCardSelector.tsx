import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Easing,
    Modal,
    PanResponder,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { CreditCard } from '../../../types/index';
import { useI18n } from '../../../hooks/useI18n';
import {
    borderRadius,
    spacing,
    typography,
    useResponsive,
    useTheme,
    useThemedStyles,
    SemanticColors,
} from '../../../theme/index';
import {
    formatCreditCardLabel,
    formatCreditCardSummary,
} from '../../../utils/domain/creditCards';

interface CreditCardSelectorProps {
    label?: string;
    value?: string | null;
    cards: CreditCard[];
    isLoading?: boolean;
    onChange: (value: string | undefined) => void;
    onAddCard?: () => void;
}

export function CreditCardSelector({
    label,
    value,
    cards,
    isLoading,
    onChange,
    onAddCard,
}: CreditCardSelectorProps) {
    const [visible, setVisible] = useState(false);
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);
    const { scaleFont } = useResponsive();
    const { t } = useI18n();
    const windowHeight = Dimensions.get('window').height;
    const sheetHeight = Math.min(560, Math.max(360, windowHeight * 0.68));
    const optionListMaxHeight = Math.max(180, sheetHeight - 220);
    const translateY = useRef(new Animated.Value(sheetHeight)).current;
    const backdropOpacity = useRef(new Animated.Value(0)).current;

    const selectedCard = useMemo(
        () => cards.find((item) => item.id === value) ?? null,
        [cards, value],
    );

    const displayLabel = selectedCard
        ? formatCreditCardLabel(selectedCard)
        : cards.length
            ? t('creditCards.select')
            : t('creditCards.emptyShort');
    const displayHint = selectedCard
        ? formatCreditCardSummary(selectedCard)
        : cards.length
            ? t('creditCards.helper')
            : t('creditCards.emptyHint');

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

    const handleSelect = (nextValue?: string) => {
        onChange(nextValue);
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
                {label ?? t('creditCards.label')}
            </Text>

            <TouchableOpacity
                style={styles.selectorButton}
                activeOpacity={0.75}
                onPress={openSheet}
            >
                <View style={styles.selectorContent}>
                    <Icon
                        name="card-outline"
                        size={20}
                        color={selectedCard ? colors.primaryLight : colors.textSecondary}
                    />
                    <View style={styles.selectorTextWrap}>
                        <Text
                            style={[
                                styles.selectorText,
                                { fontSize: scaleFont(typography.fontSize.base) },
                                !selectedCard && { color: colors.textSecondary },
                            ]}
                            numberOfLines={1}
                        >
                            {displayLabel}
                        </Text>
                        <Text
                            style={[
                                styles.selectorHint,
                                { fontSize: scaleFont(typography.fontSize.xs) },
                            ]}
                            numberOfLines={1}
                        >
                            {isLoading ? t('common.loading') : displayHint}
                        </Text>
                    </View>
                </View>
                <Icon name="chevron-down" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            {cards.length === 0 && onAddCard ? (
                <TouchableOpacity
                    style={styles.addCardButton}
                    activeOpacity={0.78}
                    onPress={onAddCard}
                >
                    <Icon name="add-circle-outline" size={18} color={colors.primaryLight} />
                    <Text
                        style={[
                            styles.addCardText,
                            { fontSize: scaleFont(typography.fontSize.sm) },
                        ]}
                    >
                        {t('creditCards.addFirst')}
                    </Text>
                </TouchableOpacity>
            ) : null}

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
                                <Text
                                    style={[
                                        styles.modalTitle,
                                        { fontSize: scaleFont(typography.fontSize.lg) },
                                    ]}
                                >
                                    {t('creditCards.label')}
                                </Text>

                                <ScrollView
                                    style={[styles.optionsScroll, { maxHeight: optionListMaxHeight }]}
                                    contentContainerStyle={styles.optionsContent}
                                    showsVerticalScrollIndicator={false}
                                >
                                    <TouchableOpacity
                                        style={[
                                            styles.optionButton,
                                            !value ? styles.optionButtonSelected : null,
                                        ]}
                                        activeOpacity={0.75}
                                        onPress={() => handleSelect(undefined)}
                                    >
                                        <View style={styles.optionTextWrap}>
                                            <Text
                                                style={[
                                                    styles.optionText,
                                                    { fontSize: scaleFont(typography.fontSize.base) },
                                                    !value ? styles.optionTextSelected : null,
                                                ]}
                                            >
                                                {t('creditCards.none')}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>

                                    {cards.map((card) => {
                                        const isSelected = value === card.id;
                                        return (
                                            <TouchableOpacity
                                                key={card.id}
                                                style={[
                                                    styles.optionButton,
                                                    isSelected ? styles.optionButtonSelected : null,
                                                ]}
                                                activeOpacity={0.75}
                                                onPress={() => handleSelect(card.id)}
                                            >
                                                <View style={styles.optionRow}>
                                                    <View
                                                        style={[
                                                            styles.optionColorDot,
                                                            {
                                                                backgroundColor:
                                                                    card.color || colors.primaryAction,
                                                            },
                                                        ]}
                                                    />
                                                    <View style={styles.optionTextWrap}>
                                                        <Text
                                                            style={[
                                                                styles.optionText,
                                                                { fontSize: scaleFont(typography.fontSize.base) },
                                                                isSelected ? styles.optionTextSelected : null,
                                                            ]}
                                                        >
                                                            {formatCreditCardLabel(card)}
                                                        </Text>
                                                        <Text
                                                            style={[
                                                                styles.optionHint,
                                                                { fontSize: scaleFont(typography.fontSize.xs) },
                                                            ]}
                                                        >
                                                            {formatCreditCardSummary(card)}
                                                        </Text>
                                                    </View>
                                                </View>
                                                {isSelected ? (
                                                    <Icon name="checkmark" size={22} color={colors.primaryLight} />
                                                ) : null}
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>

                                {onAddCard ? (
                                    <TouchableOpacity
                                        style={styles.addCardFooter}
                                        activeOpacity={0.78}
                                        onPress={() => {
                                            closeSheet();
                                            onAddCard();
                                        }}
                                    >
                                        <Icon name="add-circle-outline" size={18} color={colors.primaryLight} />
                                        <Text
                                            style={[
                                                styles.addCardText,
                                                { fontSize: scaleFont(typography.fontSize.sm) },
                                            ]}
                                        >
                                            {t('creditCards.addNew')}
                                        </Text>
                                    </TouchableOpacity>
                                    ) : null}
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
        flex: 1,
    },
    selectorTextWrap: {
        flex: 1,
    },
    selectorText: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.semibold,
    },
    selectorHint: {
        color: colors.textMuted,
        marginTop: 2,
    },
    addCardButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        marginTop: spacing.sm,
        marginLeft: spacing.xs,
    },
    addCardText: {
        color: colors.primaryLight,
        fontWeight: typography.fontWeight.semibold,
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
        gap: spacing.sm,
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
    optionsScroll: {
        width: '100%',
    },
    optionsContent: {
        gap: spacing.sm,
    },
    modalTitle: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.bold,
        marginBottom: spacing.sm,
        textAlign: 'center',
    },
    optionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surfaceElevated,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
    },
    optionButtonSelected: {
        borderColor: colors.primaryLight,
        backgroundColor: `${colors.primaryAction}18`,
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        flex: 1,
    },
    optionColorDot: {
        width: 12,
        height: 12,
        borderRadius: borderRadius.full,
    },
    optionTextWrap: {
        flex: 1,
    },
    optionText: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.semibold,
    },
    optionTextSelected: {
        color: colors.primaryLight,
    },
    optionHint: {
        color: colors.textMuted,
        marginTop: 2,
    },
    addCardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        marginTop: spacing.xs,
        paddingTop: spacing.sm,
    },
});
