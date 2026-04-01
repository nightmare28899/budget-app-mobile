import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Subscription } from '../../types';
import { formatCurrency } from '../../utils/format';
import { withAlpha } from '../../utils/subscriptions';
import { formatCreditCardLabel } from '../../utils/creditCards';
import {
    getPaymentMethodOption,
    PAYMENT_METHOD_FALLBACK_ICON,
} from '../../utils/paymentMethod';
import {
    borderRadius,
    spacing,
    typography,
    useResponsive,
    useTheme,
    useThemedStyles,
} from '../../theme';
import { useI18n } from '../../hooks/useI18n';

const ACTION_WIDTH = 150;
const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);
const HEX_COLOR_PATTERN = /^#(?:[0-9A-F]{3}){1,2}$/i;

interface SubscriptionItemProps {
    subscription: Subscription;
    locale: 'en-US' | 'es-MX';
    onPress?: (id: string) => void;
    onEdit?: (id: string) => void;
    onDelete?: (id: string) => void;
    activeSwipeableRef?: React.MutableRefObject<any>;
    activeSwipeableIdRef?: React.MutableRefObject<string | null>;
    animationDelay?: number;
    compact?: boolean;
}

function formatChargeDate(value: string, locale: 'en-US' | 'es-MX') {
    const date = new Date(`${value}T12:00:00`);
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
}

function resolveAccentColor(value: string | null | undefined, fallback: string): string {
    if (!value) {
        return fallback;
    }

    const trimmed = value.trim();
    return HEX_COLOR_PATTERN.test(trimmed) ? trimmed : fallback;
}

export function SubscriptionItem({
    subscription,
    locale,
    onPress,
    onEdit,
    onDelete,
    activeSwipeableRef,
    activeSwipeableIdRef,
    animationDelay = 0,
    compact = false,
}: SubscriptionItemProps) {
    const { t } = useI18n();
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);
    const { isSmallPhone, scaleFont, scaleSize } = useResponsive();
    const appear = useRef(new Animated.Value(0)).current;
    const pressScale = useRef(new Animated.Value(1)).current;
    const swipeableRef = useRef<any>(null);
    const [isSwipedOpen, setIsSwipedOpen] = useState(false);

    const closeSwipeable = () => {
        setIsSwipedOpen(false);
        if (activeSwipeableIdRef && activeSwipeableIdRef.current === subscription.id) {
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
            if (activeSwipeableIdRef && activeSwipeableIdRef.current === subscription.id) {
                activeSwipeableIdRef.current = null;
            }
            if (activeSwipeableRef) {
                activeSwipeableRef.current = null;
            }
        };
    }, [activeSwipeableIdRef, activeSwipeableRef, subscription.id]);

    const animatePress = (toValue: number) => {
        Animated.spring(pressScale, {
            toValue,
            speed: 28,
            bounciness: 3,
            useNativeDriver: true,
        }).start();
    };

    const renderRightActions = () => (
        <View style={styles.swipeActionsContainer}>
            {onEdit && (
                <TouchableOpacity
                    style={styles.editAction}
                    onPress={() => {
                        closeSwipeable();
                        onEdit(subscription.id);
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
                        onDelete(subscription.id);
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

    const chargeLabel = formatChargeDate(subscription.chargeDate, locale);
    const accentColor = resolveAccentColor(subscription.color, colors.primary);
    const cardBorderColor = withAlpha(accentColor, 0.42);
    const iconBackground = withAlpha(accentColor, 0.2);
    const iconBorderColor = withAlpha(accentColor, 0.55);
    const amountBackground = withAlpha(accentColor, 0.18);
    const paymentMethodOption = getPaymentMethodOption(subscription.paymentMethod);
    const paymentMethodLabel = paymentMethodOption
        ? (t(paymentMethodOption.labelKey as any) || paymentMethodOption.fallback)
        : null;
    const creditCardLabel = formatCreditCardLabel(subscription.creditCard);
    const paymentMethodIcon = paymentMethodOption?.icon ?? PAYMENT_METHOD_FALLBACK_ICON;
    const subscriptionMeta = [
        `${t('subscriptions.chargeDate')} • ${chargeLabel}`,
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

    const innerContent = (
        <AnimatedTouchableOpacity
            style={[
                styles.subscriptionItem,
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
                onPress?.(subscription.id);
            }}
            activeOpacity={0.7}
            onPressIn={() => animatePress(0.98)}
            onPressOut={() => animatePress(1)}
        >
            <View
                style={[
                    styles.subscriptionIcon,
                    {
                        width: iconSize,
                        height: iconSize,
                        backgroundColor: iconBackground,
                        borderColor: iconBorderColor,
                        marginRight: infoMarginRight,
                    },
                ]}
            >
                <Icon
                    name={subscription.icon || 'card-outline'}
                    size={iconGlyphSize}
                    color={colors.textSecondary}
                />
            </View>
            <View style={[styles.subscriptionInfo, { marginRight: infoMarginRight }]}>
                <Text
                    style={[styles.subscriptionName, { fontSize: titleFontSize }]}
                    numberOfLines={1}
                >
                    {subscription.name}
                </Text>
                <Text
                    style={[styles.subscriptionMeta, { fontSize: metaFontSize }]}
                    numberOfLines={1}
                >
                    {subscriptionMeta}
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
                    styles.amountChip,
                    {
                        backgroundColor: amountBackground,
                        borderColor: iconBorderColor,
                        paddingHorizontal: amountChipHorizontalPadding,
                        paddingVertical: amountChipVerticalPadding,
                    },
                ]}
            >
                <Text
                    style={[styles.subscriptionCost, { fontSize: amountFontSize }]}
                >
                    {formatCurrency(subscription.cost, subscription.currency, locale)}
                </Text>
            </View>
        </AnimatedTouchableOpacity>
    );

    return (
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
                key={subscription.id}
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
                        activeSwipeableIdRef.current !== subscription.id
                    ) {
                        activeSwipeableRef.current.close?.();
                    }

                    activeSwipeableRef.current = swipeableRef.current;
                    activeSwipeableIdRef.current = subscription.id;
                }}
                onSwipeableClose={() => {
                    setIsSwipedOpen(false);
                    if (!activeSwipeableRef || !activeSwipeableIdRef) {
                        return;
                    }

                    if (activeSwipeableIdRef.current === subscription.id) {
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
    );
}

const createStyles = (colors: any) => StyleSheet.create({
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
    subscriptionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surfaceCard,
        borderRadius: borderRadius.xl,
        paddingHorizontal: spacing.md + 2,
        paddingVertical: spacing.sm + 1,
        minHeight: 82,
    },
    subscriptionIcon: {
        width: 44,
        height: 44,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.sm + 2,
    },
    subscriptionInfo: {
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
    subscriptionName: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.bold,
    },
    subscriptionMeta: {
        color: colors.textMuted,
        marginTop: spacing.xs,
    },
    amountChip: {
        borderRadius: borderRadius.full,
        borderWidth: 1,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs + 1,
    },
    subscriptionCost: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.bold,
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
        textAlign: 'center',
    },
});
