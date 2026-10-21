import React, { ReactNode, useEffect, useMemo, useState } from 'react';
import { LayoutChangeEvent, Platform, StyleSheet, View } from 'react-native';
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
    const { count } = props;
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
    // Always fanned: cards flow vertically with the page; no horizontal swipe, no nested scroller.
    const fanOpen = true;

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
    const gesture = useMemo(() => Gesture.Tap().runOnJS(true).onEnd((_event, success) => {
        if (success) {
            onTap();
        }
    }), [onTap]);
    return (
        <GestureDetector gesture={gesture}>
            <View style={styles.fill}>{children}</View>
        </GestureDetector>
    );
}

function CardStackPeek({
    count,
    selected,
    keyOf,
    onSelect,
    onExpandedChange,
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

    const gesture = useMemo(() => {
        if (!front) {
            return Gesture.Tap().runOnJS(true).onEnd((_event, success) => {
                if (success) {
                    onTapBehind();
                }
            });
        }
        const pan = Gesture.Pan()
            .runOnJS(true)
            .activeOffsetX([-12, 12])
            .failOffsetY([-12, 12])
            .onEnd(event => {
                if (event.translationX <= -SWIPE_THRESHOLD) {
                    onSwipeNext();
                } else if (event.translationX >= SWIPE_THRESHOLD) {
                    onSwipePrevious();
                }
            });
        const tap = Gesture.Tap().runOnJS(true).onEnd((_event, success) => {
            if (success) {
                onTapFront();
            }
        });
        return Gesture.Race(pan, tap);
    }, [front, onSwipeNext, onSwipePrevious, onTapFront, onTapBehind]);

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
            <GestureDetector gesture={gesture}>
                <View style={styles.fill}>{children}</View>
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
