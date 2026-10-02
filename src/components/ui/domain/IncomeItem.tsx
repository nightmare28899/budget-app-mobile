import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Income } from '../../../types/index';
import { formatCurrency } from '../../../utils/core/format';
import { withAlpha } from '../../../utils/domain/subscriptions';
import {
    borderRadius,
    spacing,
    typography,
    useResponsive,
    useTheme,
    useThemedStyles,
    SemanticColors,
} from '../../../theme/index';
import { useI18n } from '../../../hooks/shared/useI18n';
import { SwipeableRef } from '../../../types/swipeable';
import {
    SwipeActions,
    SWIPE_ANIMATION_OPTIONS,
} from './SwipeActions';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

type IncomeItemProps = {
    income: Income;
    locale: 'en-US' | 'es-MX';
    onPress?: (income: Income) => void;
    onEdit?: (income: Income) => void;
    onDelete?: (id: string, title: string) => void;
    activeSwipeableRef?: React.MutableRefObject<SwipeableRef | null>;
    activeSwipeableIdRef?: React.MutableRefObject<string | null>;
    animationDelay?: number;
    compact?: boolean;
    showDateInMeta?: boolean;
};

function formatIncomeDate(value: string, locale: 'en-US' | 'es-MX', includeYear = true) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    const options: Intl.DateTimeFormatOptions = {
        month: 'short',
        day: 'numeric',
    };

    if (includeYear) {
        options.year = 'numeric';
    }

    return date.toLocaleDateString(locale, {
        ...options,
    });
}

export function IncomeItem({
    income,
    locale,
    onPress,
    onEdit,
    onDelete,
    activeSwipeableRef,
    activeSwipeableIdRef,
    animationDelay = 0,
    compact = false,
    showDateInMeta = true,
}: IncomeItemProps) {
    const { t } = useI18n();
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);
    const { isSmallPhone, scaleFont, scaleSize } = useResponsive();
    const appear = useRef(new Animated.Value(0)).current;
    const pressScale = useRef(new Animated.Value(1)).current;
    const swipeableRef = useRef<SwipeableRef | null>(null);
    const [isSwipedOpen, setIsSwipedOpen] = useState(false);

    const closeSwipeable = () => {
        setIsSwipedOpen(false);
        if (activeSwipeableIdRef && activeSwipeableIdRef.current === income.id) {
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
            if (activeSwipeableIdRef && activeSwipeableIdRef.current === income.id) {
                activeSwipeableIdRef.current = null;
            }
            if (activeSwipeableRef) {
                activeSwipeableRef.current = null;
            }
        };
    }, [activeSwipeableIdRef, activeSwipeableRef, income.id]);

    const animatePress = (toValue: number) => {
        Animated.spring(pressScale, {
            toValue,
            speed: 28,
            bounciness: 3,
            useNativeDriver: true,
        }).start();
    };

    const renderRightActions = (progress: Parameters<NonNullable<React.ComponentProps<typeof Swipeable>['renderRightActions']>>[0]) => (
        <SwipeActions
            progress={progress}
            editLabel={t('common.edit')}
            deleteLabel={t('common.delete')}
            editColor={colors.primaryAction}
            deleteColor={colors.error}
            textColor={colors.textOnAction}
            onEdit={onEdit ? () => {
                closeSwipeable();
                onEdit(income);
            } : undefined}
            onDelete={onDelete ? () => {
                closeSwipeable();
                onDelete(income.id, income.title);
            } : undefined}
        />
    );

    const formattedDate = formatIncomeDate(income.date, locale, !compact || showDateInMeta);
    const metaText = useMemo(() => {
        const note = income.note?.trim();
        const parts = [
            showDateInMeta ? formattedDate : null,
            note || null,
        ].filter(Boolean);

        return parts.join(' • ') || formattedDate;
    }, [formattedDate, income.note, showDateInMeta]);

    const borderColor = withAlpha(colors.success, 0.28);
    const iconBackground = withAlpha(colors.success, 0.14);
    const amountBackground = withAlpha(colors.success, 0.12);
    const itemHorizontalPadding = compact ? spacing.md : spacing.base;
    const itemVerticalPadding = compact ? spacing.sm : spacing.sm + 2;
    const itemMinHeight = compact ? 72 : 82;
    const iconSize = isSmallPhone
        ? scaleSize(compact ? 34 : 40, 0.56)
        : scaleSize(compact ? 38 : 44, 0.56);
    const titleFontSize = scaleFont(
        compact ? typography.fontSize.base : typography.fontSize.lg,
    );
    const metaFontSize = scaleFont(
        compact ? typography.fontSize.sm : typography.fontSize.base,
    );
    const amountFontSize = scaleFont(
        compact ? typography.fontSize.base : typography.fontSize.lg,
    );

    const innerContent = (
        <AnimatedTouchableOpacity
            style={[
                styles.incomeItem,
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
                onPress?.(income);
            }}
            activeOpacity={0.74}
            onPressIn={() => animatePress(0.98)}
            onPressOut={() => animatePress(1)}
        >
            <View
                style={[
                    styles.incomeIconWrap,
                    {
                        width: iconSize,
                        height: iconSize,
                        borderRadius: iconSize / 2,
                        backgroundColor: iconBackground,
                        borderColor,
                    },
                ]}
            >
                <Icon
                    name="trending-up-outline"
                    size={compact ? 18 : 20}
                    color={colors.success}
                />
            </View>
            <View style={styles.incomeCopy}>
                <Text
                    style={[styles.incomeTitle, { fontSize: titleFontSize }]}
                    numberOfLines={1}
                >
                    {income.title}
                </Text>
                <Text
                    style={[styles.incomeMeta, { fontSize: metaFontSize }]}
                    numberOfLines={compact ? 1 : 2}
                >
                    {metaText}
                </Text>
            </View>
            <View
                style={[
                    styles.amountChip,
                    {
                        backgroundColor: amountBackground,
                        borderColor,
                    },
                ]}
            >
                <Text
                    style={[styles.incomeAmount, { fontSize: amountFontSize }]}
                >
                    {formatCurrency(income.amount, income.currency, locale)}
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
                key={income.id}
                containerStyle={styles.swipeableContainer}
                childrenContainerStyle={[
                    styles.swipeableChildContainer,
                    isSwipedOpen ? styles.swipeableChildContainerOpen : null,
                    { borderColor },
                ]}
                renderRightActions={onEdit || onDelete ? renderRightActions : undefined}
                overshootRight={false}
                friction={2}
                rightThreshold={40}
                animationOptions={SWIPE_ANIMATION_OPTIONS}
                onSwipeableWillOpen={() => {
                    setIsSwipedOpen(true);
                    if (!activeSwipeableRef || !activeSwipeableIdRef) {
                        return;
                    }

                    if (
                        activeSwipeableRef.current &&
                        activeSwipeableIdRef.current &&
                        activeSwipeableIdRef.current !== income.id
                    ) {
                        activeSwipeableRef.current.close?.();
                    }

                    activeSwipeableRef.current = swipeableRef.current;
                    activeSwipeableIdRef.current = income.id;
                }}
                onSwipeableClose={() => {
                    setIsSwipedOpen(false);
                    if (!activeSwipeableRef || !activeSwipeableIdRef) {
                        return;
                    }

                    if (activeSwipeableIdRef.current === income.id) {
                        activeSwipeableIdRef.current = null;
                        activeSwipeableRef.current = null;
                    }
                }}
            >
                {innerContent}
            </Swipeable>
        </Animated.View>
    );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
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
    incomeItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: colors.surfaceCard,
    },
    incomeIconWrap: {
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    incomeCopy: {
        flex: 1,
        gap: 2,
    },
    incomeTitle: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.semibold,
    },
    incomeMeta: {
        color: colors.textMuted,
    },
    amountChip: {
        borderRadius: borderRadius.full,
        borderWidth: 1,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs + 1,
        justifyContent: 'center',
    },
    incomeAmount: {
        color: colors.success,
        fontWeight: typography.fontWeight.bold,
    },
});
