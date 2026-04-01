import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { useNavigation } from '@react-navigation/native';
import { MainTabScreenProps } from '../../navigation/types';
import { CategoryIcon } from '../CategoryIcon';
import { formatCurrency, formatTime } from '../../utils/format';
import { withAlpha } from '../../utils/subscriptions';
import { formatCreditCardLabel } from '../../utils/creditCards';
import {
    getPaymentMethodOption,
    PAYMENT_METHOD_FALLBACK_ICON,
} from '../../utils/paymentMethod';
import {
    getInstallmentProgress,
    isInstallmentExpense,
} from '../../utils/installments';
import {
    spacing,
    typography,
    borderRadius,
    useResponsive,
    useTheme,
    useThemedStyles,
} from '../../theme';
import { Expense } from '../../types';
import { useI18n } from '../../hooks/useI18n';

const ACTION_WIDTH = 150;
const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);
const HEX_COLOR_PATTERN = /^#(?:[0-9A-F]{3}){1,2}$/i;

function resolveAccentColor(value: string | null | undefined, fallback: string): string {
    if (!value) {
        return fallback;
    }

    const trimmed = value.trim();
    return HEX_COLOR_PATTERN.test(trimmed) ? trimmed : fallback;
}

function formatExpenseDateHeading(value: string, locale: 'en-US' | 'es-MX') {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return '';
    }

    const formatted = date.toLocaleDateString(locale, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
    });
    if (!formatted) {
        return '';
    }

    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

interface ExpenseItemProps {
    expense: Expense;
    onPress?: (id: string) => void;
    onDelete?: (id: string) => void;
    onEdit?: (id: string) => void;
    activeSwipeableRef?: React.MutableRefObject<any>;
    activeSwipeableIdRef?: React.MutableRefObject<string | null>;
    disableSwipe?: boolean;
    animationDelay?: number;
    showDateHeader?: boolean;
    dateHeaderOverride?: string;
    compact?: boolean;
}

export function ExpenseItem({
    expense,
    onPress,
    onDelete,
    onEdit,
    activeSwipeableRef,
    activeSwipeableIdRef,
    disableSwipe,
    animationDelay = 0,
    showDateHeader,
    dateHeaderOverride,
    compact = false,
}: ExpenseItemProps) {
    const navigation = useNavigation<MainTabScreenProps<'Dashboard'>['navigation']>();
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);
    const { t, language } = useI18n();
    const { isSmallPhone, scaleFont, scaleSize } = useResponsive();
    const appear = useRef(new Animated.Value(0)).current;
    const pressScale = useRef(new Animated.Value(1)).current;
    const swipeableRef = useRef<any>(null);
    const [isSwipedOpen, setIsSwipedOpen] = useState(false);

    const closeSwipeable = () => {
        setIsSwipedOpen(false);
        if (activeSwipeableIdRef && activeSwipeableIdRef.current === expense.id) {
            activeSwipeableIdRef.current = null;
        }
        if (activeSwipeableRef) {
            activeSwipeableRef.current = null;
        }
        swipeableRef.current?.close?.();
    };

    useEffect(() => {
        const animation = Animated.timing(appear, {
            toValue: 1,
            duration: 320,
            delay: animationDelay,
            useNativeDriver: true,
        });
        animation.start();
        return () => animation.stop();
    }, [animationDelay, appear]);

    useEffect(() => {
        return () => {
            if (activeSwipeableIdRef && activeSwipeableIdRef.current === expense.id) {
                activeSwipeableIdRef.current = null;
            }
            if (activeSwipeableRef) {
                activeSwipeableRef.current = null;
            }
        };
    }, [activeSwipeableIdRef, activeSwipeableRef, expense.id]);

    const animatePress = (toValue: number) => {
        Animated.spring(pressScale, {
            toValue,
            speed: 28,
            bounciness: 3,
            useNativeDriver: true,
        }).start();
    };

    const accentColor = resolveAccentColor(expense.category?.color, colors.primary);
    const cardBorderColor = withAlpha(accentColor, 0.4);
    const iconBackground = withAlpha(accentColor, 0.2);
    const iconBorderColor = withAlpha(accentColor, 0.55);
    const locale: 'en-US' | 'es-MX' = language === 'es' ? 'es-MX' : 'en-US';
    const dateHeaderLabel =
        dateHeaderOverride ?? formatExpenseDateHeading(expense.date, locale);
    const shouldShowDateHeader =
        showDateHeader ?? (!disableSwipe && Boolean(onEdit || onDelete));
    const paymentMethodOption = getPaymentMethodOption(expense.paymentMethod);
    const paymentMethodLabel = paymentMethodOption
        ? (t(paymentMethodOption.labelKey as any) || paymentMethodOption.fallback)
        : null;
    const creditCardLabel = formatCreditCardLabel(expense.creditCard);
    const paymentMethodIcon = paymentMethodOption?.icon ?? PAYMENT_METHOD_FALLBACK_ICON;
    const installmentProgress = getInstallmentProgress(expense);
    const installmentMeta = isInstallmentExpense(expense)
        && installmentProgress.currentInstallment
        && installmentProgress.installmentCount
        ? t('expense.installmentPositionLabel', {
            current: installmentProgress.currentInstallment,
            count: installmentProgress.installmentCount,
        })
        : null;
    const expenseMeta = [
        expense.category?.name ?? t('expenseDetail.uncategorized'),
        formatTime(expense.date),
        installmentMeta,
        paymentMethodLabel,
        creditCardLabel,
    ]
        .filter(Boolean)
        .join(' • ');
    const itemHorizontalPadding = compact ? spacing.md : spacing.md + 2;
    const itemVerticalPadding = compact ? spacing.sm : spacing.sm + 1;
    const itemMinHeight = compact ? 72 : 82;
    const iconSize = isSmallPhone
        ? scaleSize(compact ? 34 : 40, 0.6)
        : scaleSize(compact ? 38 : 44, 0.6);
    const iconGlyphSize = compact ? 18 : 21;
    const infoMarginRight = compact ? spacing.xs + 2 : spacing.sm + 2;
    const paymentChipSize = compact ? 28 : 32;
    const paymentChipMarginRight = compact ? spacing.xs + 2 : spacing.sm;
    const amountChipHorizontalPadding = compact ? spacing.xs + 2 : spacing.sm;
    const amountChipVerticalPadding = compact ? spacing.xs : spacing.xs + 1;
    const titleFontSize = scaleFont(
        compact ? typography.fontSize.md : typography.fontSize.base,
    );
    const metaFontSize = scaleFont(
        compact ? typography.fontSize.sm : typography.fontSize.md,
    );
    const amountFontSize = scaleFont(
        compact ? typography.fontSize.md : typography.fontSize.base,
    );

    const renderRightActions = () => {
        return (
            <View style={styles.swipeActionsContainer}>
                {onEdit && (
                    <TouchableOpacity
                        style={styles.editAction}
                        onPress={() => {
                            closeSwipeable();
                            onEdit(expense.id);
                        }}
                        activeOpacity={0.8}
                    >
                        <View style={styles.swipeActionContent}>
                            <Icon name="create-outline" size={22} color="#fff" />
                            <Text style={styles.swipeActionText}>{t('common.edit')}</Text>
                        </View>
                    </TouchableOpacity>
                )}
                {onDelete && (
                    <TouchableOpacity
                        style={styles.deleteAction}
                        onPress={() => {
                            closeSwipeable();
                            onDelete(expense.id);
                        }}
                        activeOpacity={0.8}
                    >
                        <View style={styles.swipeActionContent}>
                            <Icon name="trash-outline" size={22} color="#fff" />
                            <Text style={styles.swipeActionText}>{t('common.delete')}</Text>
                        </View>
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    const innerContent = (
        <AnimatedTouchableOpacity
            style={[
                styles.expenseItem,
                {
                    paddingHorizontal: itemHorizontalPadding,
                    paddingVertical: itemVerticalPadding,
                    minHeight: itemMinHeight,
                },
                { transform: [{ scale: pressScale }] },
            ]}
            onPress={() => {
                if (isSwipedOpen) {
                    closeSwipeable();
                    return;
                }
                if (onPress) {
                    onPress(expense.id);
                    return;
                }
                if (disableSwipe && onEdit) {
                    onEdit(expense.id);
                    return;
                }
                navigation.navigate('ExpenseDetail', { id: expense.id });
            }}
            activeOpacity={0.7}
            onPressIn={() => animatePress(0.98)}
            onPressOut={() => animatePress(1)}
        >
            <View
                style={[
                    styles.expenseIcon,
                    {
                        width: iconSize,
                        height: iconSize,
                        backgroundColor: iconBackground,
                        borderColor: iconBorderColor,
                        marginRight: infoMarginRight,
                    },
                ]}
            >
                <CategoryIcon
                    icon={expense.category?.icon}
                    categoryName={expense.category?.name}
                    size={iconGlyphSize}
                    color={colors.textSecondary}
                />
            </View>
            <View style={[styles.expenseInfo, { marginRight: infoMarginRight }]}>
                <Text
                    style={[styles.expenseTitle, { fontSize: titleFontSize }]}
                    numberOfLines={compact ? 1 : undefined}
                >
                    {expense.title}
                </Text>
                <Text
                    style={[
                        styles.expenseCategory,
                        { fontSize: metaFontSize },
                    ]}
                    numberOfLines={compact ? 1 : undefined}
                >
                    {expenseMeta}
                </Text>
            </View>
            <View
                style={[
                    styles.paymentMethodChip,
                    {
                        width: paymentChipSize,
                        height: paymentChipSize,
                        backgroundColor: paymentMethodOption
                            ? withAlpha(colors.primaryLight, 0.18)
                            : colors.surfaceElevated,
                        borderColor: paymentMethodOption
                            ? withAlpha(colors.primaryLight, 0.45)
                            : colors.border,
                        marginRight: paymentChipMarginRight,
                    },
                ]}
            >
                <Icon
                    name={paymentMethodIcon}
                    size={compact ? 14 : 16}
                    color={paymentMethodOption ? colors.primaryLight : colors.textMuted}
                />
            </View>
            <View
                style={[
                    styles.costChip,
                    {
                        paddingHorizontal: amountChipHorizontalPadding,
                        paddingVertical: amountChipVerticalPadding,
                    },
                ]}
            >
                <Text
                    style={[styles.expenseCost, { fontSize: amountFontSize }]}
                >
                    -{formatCurrency(Number(expense.cost), expense.currency, locale)}
                </Text>
            </View>
        </AnimatedTouchableOpacity>
    );

    if (disableSwipe) {
        return (
            <View style={[styles.itemWrapper, compact ? styles.itemWrapperCompact : null]}>
                {shouldShowDateHeader && dateHeaderLabel ? (
                    <Text style={styles.dateHeaderText}>{dateHeaderLabel}</Text>
                ) : null}
                <Animated.View
                    key={expense.id}
                    style={[
                        styles.swipeableContainer,
                        styles.swipeableChildContainer,
                        { borderColor: cardBorderColor },
                        {
                            opacity: appear,
                            transform: [
                                {
                                    translateY: appear.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [10, 0],
                                    }),
                                },
                            ],
                        },
                    ]}
                >
                    {innerContent}
                </Animated.View>
            </View>
        );
    }

    return (
        <View style={[styles.itemWrapper, compact ? styles.itemWrapperCompact : null]}>
            {shouldShowDateHeader && dateHeaderLabel ? (
                <Text style={styles.dateHeaderText}>{dateHeaderLabel}</Text>
            ) : null}
            <Animated.View
                style={{
                    opacity: appear,
                    transform: [
                        {
                            translateY: appear.interpolate({
                                inputRange: [0, 1],
                                outputRange: [10, 0],
                            }),
                        },
                    ],
                }}
            >
                <Swipeable
                    ref={swipeableRef}
                    key={expense.id}
                    containerStyle={styles.swipeableContainer}
                    childrenContainerStyle={[
                        styles.swipeableChildContainer,
                        isSwipedOpen ? styles.swipeableChildContainerOpen : null,
                        { borderColor: cardBorderColor },
                    ]}
                    renderRightActions={onEdit || onDelete ? renderRightActions : undefined}
                    overshootRight={false}
                    friction={2}
                    rightThreshold={40}
                    onSwipeableWillOpen={() => {
                        setIsSwipedOpen(true);
                        if (!activeSwipeableRef || !activeSwipeableIdRef) {
                            return;
                        }

                        if (
                            activeSwipeableRef.current &&
                            activeSwipeableIdRef.current &&
                            activeSwipeableIdRef.current !== expense.id
                        ) {
                            activeSwipeableRef.current.close?.();
                        }

                        activeSwipeableRef.current = swipeableRef.current;
                        activeSwipeableIdRef.current = expense.id;
                    }}
                    onSwipeableClose={() => {
                        setIsSwipedOpen(false);
                        if (!activeSwipeableRef || !activeSwipeableIdRef) {
                            return;
                        }

                        if (activeSwipeableIdRef.current === expense.id) {
                            activeSwipeableIdRef.current = null;
                            activeSwipeableRef.current = null;
                        }
                    }}
                    onSwipeableWillClose={() => {
                        setIsSwipedOpen(false);
                    }}
                >
                    {innerContent}
                </Swipeable>
            </Animated.View>
        </View>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    itemWrapper: {
        marginBottom: spacing.md,
    },
    itemWrapperCompact: {
        marginBottom: spacing.sm,
    },
    dateHeaderText: {
        color: colors.textSecondary,
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.semibold,
        marginBottom: spacing.sm,
        marginTop: spacing.lg,
    },
    swipeableContainer: {
        borderRadius: borderRadius.xl,
        overflow: 'hidden',
    },
    swipeableChildContainer: {
        backgroundColor: colors.surfaceCard,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.xl,
        overflow: 'hidden',
    },
    swipeableChildContainerOpen: {
        borderTopRightRadius: 0,
        borderBottomRightRadius: 0,
    },
    expenseItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surfaceCard,
        borderRadius: borderRadius.xl,
        paddingHorizontal: spacing.md + 2,
        paddingVertical: spacing.sm + 1,
        minHeight: 82,
    },
    expenseIcon: {
        width: 44,
        height: 44,
        borderRadius: borderRadius.lg,
        backgroundColor: colors.surfaceElevated,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.sm + 2,
    },
    expenseInfo: {
        flex: 1,
        marginRight: spacing.sm + 2,
    },
    paymentMethodChip: {
        width: 32,
        height: 32,
        borderRadius: borderRadius.full,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.sm,
    },
    expenseTitle: {
        fontSize: typography.fontSize.base,
        fontWeight: typography.fontWeight.bold,
        color: colors.textPrimary,
    },
    expenseCategory: {
        fontSize: typography.fontSize.md,
        color: colors.textMuted,
        marginTop: spacing.xs,
    },
    costChip: {
        backgroundColor: withAlpha(colors.error, 0.18),
        borderColor: withAlpha(colors.error, 0.4),
        borderWidth: 1,
        borderRadius: borderRadius.full,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs + 1,
    },
    expenseCost: {
        fontSize: typography.fontSize.base,
        fontWeight: typography.fontWeight.bold,
        color: colors.error,
    },
    swipeActionsContainer: {
        flexDirection: 'row',
        width: ACTION_WIDTH,
        borderTopRightRadius: borderRadius.xl,
        borderBottomRightRadius: borderRadius.xl,
        overflow: 'hidden',
    },
    editAction: {
        backgroundColor: colors.secondary ?? '#45B7D1',
        justifyContent: 'center',
        alignItems: 'center',
        flex: 1,
    },
    deleteAction: {
        backgroundColor: colors.error,
        justifyContent: 'center',
        alignItems: 'center',
        flex: 1,
    },
    swipeActionContent: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
    },
    swipeActionText: {
        color: '#fff',
        fontSize: typography.fontSize.xs,
        fontWeight: typography.fontWeight.bold,
        marginTop: 4,
    },
});
