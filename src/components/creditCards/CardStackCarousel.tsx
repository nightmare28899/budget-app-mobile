import React, { ReactNode, useEffect, useMemo, useState } from 'react';
import { LayoutChangeEvent, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import { useI18n } from '../../hooks/shared/useI18n';
import {
    CARD_STACK,
    FanSlot,
    StackSlot,
    afterFanTap,
    expandedHeight,
    expandedLayout,
    isExpanded,
    nextIndex,
    previousIndex,
    toggleExpanded,
    visibleSlots,
} from '../../modules/creditCards/cardStack';
import { useTheme } from '../../theme/index';

const SWIPE_THRESHOLD = 40;
const MOTION = { duration: 260 };

type CardStackCarouselProps = {
    count: number;
    selected: number;
    keyOf: (index: number) => string;
    onSelect: (index: number) => void;
    expanded: boolean;
    onExpandedChange: (expanded: boolean) => void;
    /** True while a finger is down on the collapsed stack, so the host can freeze its page scroll. */
    onTouchingChange?: (touching: boolean) => void;
    labelOf: (index: number) => string;
    renderCard: (index: number) => ReactNode;
};

const cardShadow = (elevation: number) => ({
    elevation,
    shadowColor: '#000',
    shadowOpacity: Platform.OS === 'ios' ? 0.08 + elevation * 0.012 : 0,
    shadowRadius: elevation * 1.2,
    shadowOffset: { width: 0, height: elevation * 0.6 },
});

/**
 * Wallet-style card stack. Collapsed it shows the selected card with up to two peeking behind it (swipe or use the
 * accessibility actions to change card, tap to expand); expanded it fans out every card in a scrollable column where a tap selects.
 */
export function CardStackCarousel(props: CardStackCarouselProps) {
    const { count, expanded } = props;
    const [width, setWidth] = useState(0);
    const onLayout = (event: LayoutChangeEvent) => {
        const next = Math.round(event.nativeEvent.layout.width);
        if (next !== width) {
            setWidth(next);
        }
    };

    if (count <= 0) {
        return null;
    }

    const cardHeight = width / CARD_STACK.aspectRatio;
    const fanOpen = isExpanded(expanded, count);

    return (
        <View style={styles.root} onLayout={onLayout}>
            {width > 0 ? (
                fanOpen ? (
                    <CardFan {...props} width={width} cardHeight={cardHeight} />
                ) : (
                    <CardStackPeek {...props} width={width} cardHeight={cardHeight} />
                )
            ) : null}
        </View>
    );
}

type LayoutProps = CardStackCarouselProps & { width: number; cardHeight: number };

function CardFan({
    count,
    selected,
    keyOf,
    onSelect,
    onExpandedChange,
    labelOf,
    renderCard,
    cardHeight,
}: LayoutProps) {
    const { t } = useI18n();
    const slots = useMemo(() => expandedLayout(count, selected), [count, selected]);
    const contentHeight = expandedHeight(count, cardHeight);

    const collapse = () => onExpandedChange(false);
    const tapped = (index: number) => {
        const outcome = afterFanTap(count, selected, index);
        onSelect(outcome.selected);
        onExpandedChange(outcome.expanded);
    };

    return (
        <View
            accessibilityState={{ expanded: true }}
            accessibilityValue={{ text: t('creditCards.stackExpandedState') }}
            accessibilityActions={[{ name: 'collapse', label: t('creditCards.stackCollapse') }]}
            onAccessibilityAction={collapse}
        >
            <View>
                <View style={{ height: contentHeight }}>
                    {slots.map(slot => (
                        <FanCard
                            key={keyOf(slot.index)}
                            slot={slot}
                            cardHeight={cardHeight}
                            label={labelOf(slot.index)}
                            stateText={
                                slot.selected
                                    ? t('creditCards.fanSelected')
                                    : t('creditCards.fanNotSelected')
                            }
                            actionLabel={t('creditCards.stackSelect')}
                            onTap={() => tapped(slot.index)}
                        >
                            {renderCard(slot.index)}
                        </FanCard>
                    ))}
                </View>
            </View>
        </View>
    );
}

type FanCardProps = {
    slot: FanSlot;
    cardHeight: number;
    label: string;
    stateText: string;
    actionLabel: string;
    onTap: () => void;
    children: ReactNode;
};

function FanCard({ slot, cardHeight, label, stateText, actionLabel, onTap, children }: FanCardProps) {
    const { colors } = useTheme();
    const top = useSharedValue(0);
    useEffect(() => {
        top.value = withTiming(slot.top, MOTION);
    }, [slot.top, top]);
    const animated = useAnimatedStyle(() => ({ top: top.value }));

    return (
        <Reanimated.View
            style={[
                styles.absolute,
                {
                    height: cardHeight,
                    zIndex: slot.zIndex,
                    backgroundColor: colors.surface,
                    ...cardShadow(slot.selected ? 8 : 3),
                },
                animated,
            ]}
            accessible
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityValue={{ text: stateText }}
            accessibilityState={{ selected: slot.selected }}
            accessibilityActions={[{ name: 'activate', label: actionLabel }]}
            onAccessibilityAction={onTap}
            onTouchEnd={undefined}
        >
            <Tappable onTap={onTap}>{children}</Tappable>
        </Reanimated.View>
    );
}

function Tappable({ onTap, children }: { onTap: () => void; children: ReactNode }) {
    // Native Pressable (not an RNGH detector) so vertical drags still reach the page ScrollView.
    return (
        <Pressable style={styles.fill} onPress={onTap} accessible={false}>
            {children}
        </Pressable>
    );
}

function CardStackPeek({
    count,
    selected,
    keyOf,
    onSelect,
    onExpandedChange,
    onTouchingChange,
    renderCard,
    cardHeight,
}: LayoutProps) {
    const { t } = useI18n();
    const slots = useMemo(() => visibleSlots(count, selected), [count, selected]);
    const maxOffset = slots.reduce((max, slot) => Math.max(max, slot.offset), 0);

    const goNext = () => onSelect(nextIndex(count, selected));
    const goPrevious = () => onSelect(previousIndex(count, selected));
    const expand = () => onExpandedChange(toggleExpanded(false, count));

    const onAction = (name: string) => {
        if (name === 'next') {
            goNext();
        } else if (name === 'previous') {
            goPrevious();
        } else if (name === 'expand') {
            expand();
        }
    };

    return (
        <View style={{ height: cardHeight + maxOffset }}>
            {[...slots].reverse().map(slot => {
                const front = slot.depth === 0;
                return (
                    <StackedCard
                        key={keyOf(slot.index)}
                        slot={slot}
                        top={maxOffset}
                        cardHeight={cardHeight}
                        front={front}
                        canNavigate={count > 1}
                        onSwipeNext={goNext}
                        onSwipePrevious={goPrevious}
                        onTouchingChange={onTouchingChange}
                        onTapFront={() => count > 1 && expand()}
                        onTapBehind={() => onSelect(slot.index)}
                        onAction={onAction}
                        collapsedState={t('creditCards.stackCollapsedState')}
                        labels={{
                            next: t('creditCards.stackNext'),
                            previous: t('creditCards.stackPrevious'),
                            expand: t('creditCards.stackExpand'),
                            select: t('creditCards.stackSelect'),
                        }}
                    >
                        {renderCard(slot.index)}
                    </StackedCard>
                );
            })}
        </View>
    );
}

type StackedCardProps = {
    slot: StackSlot;
    top: number;
    cardHeight: number;
    front: boolean;
    canNavigate: boolean;
    onSwipeNext: () => void;
    onSwipePrevious: () => void;
    onTouchingChange?: (touching: boolean) => void;
    onTapFront: () => void;
    onTapBehind: () => void;
    onAction: (name: string) => void;
    collapsedState: string;
    labels: { next: string; previous: string; expand: string; select: string };
    children: ReactNode;
};

/** Positions one card of the peek stack: shifted up behind the front card, scaled down and faded by depth. */
function StackedCard({
    slot,
    top,
    cardHeight,
    front,
    canNavigate,
    onSwipeNext,
    onSwipePrevious,
    onTouchingChange,
    onTapFront,
    onTapBehind,
    onAction,
    collapsedState,
    labels,
    children,
}: StackedCardProps) {
    const { colors } = useTheme();
    const offset = useSharedValue(slot.offset);
    const scale = useSharedValue(slot.scale);
    const alpha = useSharedValue(slot.alpha);

    useEffect(() => {
        offset.value = withTiming(slot.offset, MOTION);
        scale.value = withTiming(slot.scale, MOTION);
        alpha.value = withTiming(slot.alpha, MOTION);
    }, [slot.offset, slot.scale, slot.alpha, offset, scale, alpha]);

    const animated = useAnimatedStyle(() => ({
        opacity: alpha.value,
        transform: [{ translateY: -offset.value }, { scale: scale.value }],
    }));

    const onPress = front ? onTapFront : onTapBehind;

    // Vertical drag on the front card steps through the cards: up = next, down = previous.
    const swipe = useMemo(
        () =>
            Gesture.Pan()
                .runOnJS(true)
                .enabled(front && canNavigate)
                .activeOffsetY([-10, 10])
                .failOffsetX([-24, 24])
                .onBegin(() => onTouchingChange?.(true))
                .onEnd(event => {
                    if (event.translationY <= -SWIPE_THRESHOLD) {
                        onSwipeNext();
                    } else if (event.translationY >= SWIPE_THRESHOLD) {
                        onSwipePrevious();
                    }
                })
                .onFinalize(() => onTouchingChange?.(false)),
        [front, canNavigate, onSwipeNext, onSwipePrevious, onTouchingChange],
    );

    const actions = front && canNavigate
        ? [
            { name: 'next', label: labels.next },
            { name: 'previous', label: labels.previous },
            { name: 'expand', label: labels.expand },
        ]
        : !front
            ? [{ name: 'select', label: labels.select }]
            : undefined;

    return (
        <Reanimated.View
            style={[
                styles.absolute,
                {
                    top,
                    height: cardHeight,
                    zIndex: slot.zIndex,
                    backgroundColor: colors.surface,
                    ...cardShadow(slot.elevation),
                },
                animated,
            ]}
            accessibilityValue={front ? { text: collapsedState } : undefined}
            accessibilityActions={actions}
            onAccessibilityAction={event =>
                event.nativeEvent.actionName === 'select' ? onTapBehind() : onAction(event.nativeEvent.actionName)
            }
        >
            <GestureDetector gesture={swipe}>
                <Pressable style={styles.fill} onPress={onPress} accessible={false}>
                    {children}
                </Pressable>
            </GestureDetector>
        </Reanimated.View>
    );
}

const styles = StyleSheet.create({
    root: {
        width: '100%',
    },
    absolute: {
        position: 'absolute',
        left: 0,
        right: 0,
        borderRadius: CARD_STACK.cornerRadius,
    },
    fill: {
        flex: 1,
    },
});
