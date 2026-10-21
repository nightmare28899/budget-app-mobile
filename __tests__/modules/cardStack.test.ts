import {
    afterDismiss,
    afterFanTap,
    CARD_STACK,
    expandedHeight,
    expandedLayout,
    fanViewport,
    isExpanded,
    nextIndex,
    previousIndex,
    resolveSelection,
    selectionPosition,
    toggleExpanded,
    showsNumericIndicator,
    visibleSlots,
} from '../../src/modules/creditCards/cardStack';

describe('visibleSlots', () => {
    it('shows nothing for an empty list', () => {
        expect(visibleSlots(0, 0)).toEqual([]);
        expect(nextIndex(0, 0)).toBe(-1);
        expect(previousIndex(0, 0)).toBe(-1);
    });

    it('single card is only the front', () => {
        const slots = visibleSlots(1, 0);
        expect(slots).toHaveLength(1);
        expect(slots[0]).toMatchObject({ index: 0, depth: 0, offset: 0, scale: 1, alpha: 1 });
    });

    it('two cards stack the next one behind', () => {
        expect(visibleSlots(2, 0).map(s => [s.index, s.depth])).toEqual([[0, 0], [1, 1]]);
        expect(visibleSlots(2, 1).map(s => [s.index, s.depth])).toEqual([[1, 0], [0, 1]]);
    });

    it('window is capped at three cards', () => {
        const slots = visibleSlots(10, 4);
        expect(slots.map(s => s.index)).toEqual([4, 5, 6]);
        expect(slots.map(s => s.depth)).toEqual([0, 1, 2]);
    });

    it('window wraps around the end of the list', () => {
        expect(visibleSlots(10, 9).map(s => s.index)).toEqual([9, 0, 1]);
        expect(visibleSlots(10, 8).map(s => s.index)).toEqual([8, 9, 0]);
    });

    it('clamps an out of range selection', () => {
        expect(visibleSlots(3, 99).map(s => s.index)).toEqual([2, 0, 1]);
        expect(visibleSlots(3, -5).map(s => s.index)).toEqual([0, 1, 2]);
    });

    it('depth shrinks, fades and shifts down progressively', () => {
        const s = visibleSlots(5, 0);
        expect(s.map(x => x.scale)).toEqual([1, 0.94, 0.88]);
        expect(s.map(x => x.offset)).toEqual([0, 18, 36]);
        expect(s[0].alpha).toBeGreaterThan(s[1].alpha);
        expect(s[1].alpha).toBeGreaterThan(s[2].alpha);
        expect(s[0].elevation).toBeGreaterThan(s[1].elevation);
        expect(s[1].elevation).toBeGreaterThan(s[2].elevation);
        expect(s[0].zIndex).toBeGreaterThan(s[1].zIndex);
        expect(s[1].zIndex).toBeGreaterThan(s[2].zIndex);
    });
});

describe('navigation', () => {
    it('next and previous cycle', () => {
        expect(nextIndex(3, 0)).toBe(1);
        expect(nextIndex(3, 2)).toBe(0);
        expect(previousIndex(3, 0)).toBe(2);
        expect(previousIndex(3, 1)).toBe(0);
        expect(nextIndex(1, 0)).toBe(0);
        expect(previousIndex(1, 0)).toBe(0);
    });

    it('numeric indicator only beyond the visible window', () => {
        expect(showsNumericIndicator(3)).toBe(false);
        expect(showsNumericIndicator(4)).toBe(true);
    });
});

describe('fan', () => {
    it('lists every card top to bottom with a generous strip', () => {
        const fan = expandedLayout(4, 2, 56);
        expect(fan.map(s => s.index)).toEqual([0, 1, 2, 3]);
        expect(fan.map(s => s.top)).toEqual([0, 56, 112, 168]);
        expect(fan.map(s => s.selected)).toEqual([false, false, true, false]);
        expect(fan.every((s, i) => i === 0 || fan[i - 1].zIndex < s.zIndex)).toBe(true);
    });

    it('strip never drops below the touch target', () => {
        expect(expandedLayout(2, 0, 10).map(s => s.top)).toEqual([0, 48]);
        expect(CARD_STACK.minFanStrip).toBe(48);
        expect(CARD_STACK.fanStrip).toBeGreaterThanOrEqual(CARD_STACK.minFanStrip);
    });

    it('clamps selection and handles empty', () => {
        expect(expandedLayout(0, 0)).toEqual([]);
        expect(expandedLayout(2, 99).map(s => s.selected)).toEqual([false, true]);
        expect(expandedLayout(2, -3).map(s => s.selected)).toEqual([true, false]);
    });

    it('height is strips plus one full card and bounded by the viewport', () => {
        expect(expandedHeight(4, 200, 56)).toBe(168 + 200);
        expect(expandedHeight(0, 200, 56)).toBe(0);
        expect(expandedHeight(1, 200, 56)).toBe(200);
        expect(fanViewport(500, 300)).toBe(300);
        expect(fanViewport(250, 300)).toBe(250);
    });

    it('front tap toggles expansion but a lone card never expands', () => {
        expect(toggleExpanded(false, 3)).toBe(true);
        expect(toggleExpanded(true, 3)).toBe(false);
        expect(toggleExpanded(false, 1)).toBe(false);
        expect(toggleExpanded(false, 0)).toBe(false);
    });

    it('expansion collapses by itself when cards shrink to one', () => {
        expect(isExpanded(true, 2)).toBe(true);
        expect(isExpanded(true, 1)).toBe(false);
        expect(isExpanded(false, 5)).toBe(false);
    });

    it('tapping a fan card selects it and collapses', () => {
        expect(afterFanTap(5, 1, 3)).toEqual({ selected: 3, expanded: false });
        expect(afterFanTap(5, 1, 1)).toEqual({ selected: 1, expanded: false });
    });

    it('invalid fan tap keeps the selection and collapses', () => {
        expect(afterFanTap(5, 1, 9)).toEqual({ selected: 1, expanded: false });
        expect(afterFanTap(5, 1, -1)).toEqual({ selected: 1, expanded: false });
    });

    it('dismiss collapses without changing selection', () => {
        expect(afterDismiss(4, 2)).toEqual({ selected: 2, expanded: false });
        expect(afterDismiss(4, 99)).toEqual({ selected: 3, expanded: false });
    });

    it('skeleton mirrors the loaded stack with two peeking strips', () => {
        const slots = visibleSlots(CARD_STACK.skeletonCards, 0);
        expect(slots).toHaveLength(1 + CARD_STACK.peekStrips);
        expect(slots).toHaveLength(CARD_STACK.maxVisible);
        expect(CARD_STACK.cornerRadius).toBe(18);
    });
});

describe('resolveSelection', () => {
    const ids = ['a', 'b', 'c'];

    it('empty list has no selection', () => {
        expect(resolveSelection([], 'a', 0)).toBe(-1);
        expect(resolveSelection([], null, 3)).toBe(-1);
    });

    it('a single card is always selected', () => {
        expect(resolveSelection(['a'], null, 0)).toBe(0);
        expect(resolveSelection(['a'], 'gone', 5)).toBe(0);
    });

    it('an existing id wins over the previous index', () => {
        expect(resolveSelection(ids, 'c', 0)).toBe(2);
        expect(resolveSelection(ids, 'b', 2)).toBe(1);
    });

    it('a vanished id falls to the card now at the previous position', () => {
        expect(resolveSelection(['a', 'c'], 'b', 1)).toBe(1);
        expect(resolveSelection(['c', 'd'], 'a', 0)).toBe(0);
    });

    it('a shortened list clamps to the last card', () => {
        expect(resolveSelection(['a', 'b'], 'c', 2)).toBe(1);
        expect(resolveSelection(['a'], 'z', 9)).toBe(0);
    });

    it('no selection yet starts at the previous index clamped', () => {
        expect(resolveSelection(ids, null, 0)).toBe(0);
        expect(resolveSelection(ids, null, 7)).toBe(2);
        expect(resolveSelection(ids, null, -4)).toBe(0);
    });

    it('position label is one based', () => {
        expect(selectionPosition(0, 3)).toEqual([1, 3]);
        expect(selectionPosition(2, 3)).toEqual([3, 3]);
    });
});
