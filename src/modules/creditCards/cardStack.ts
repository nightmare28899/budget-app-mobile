/** Pure layout rules for the card carousel: a 3-deep peek stack that expands into a vertical fan. */

export type StackSlot = {
    index: number;
    depth: number;
    /** Upward shift (dp) behind the front card. */
    offset: number;
    scale: number;
    alpha: number;
    elevation: number;
    zIndex: number;
};

export type FanSlot = { index: number; top: number; selected: boolean; zIndex: number };

export type FanOutcome = { selected: number; expanded: boolean };

export const CARD_STACK = {
    maxVisible: 3,
    peekStrips: 2,
    skeletonCards: 3,
    cornerRadius: 18,
    minFanStrip: 48,
    fanStrip: 56,
    fanMaxHeight: 420,
    /** Width / height of the card art (ISO ID-1). */
    aspectRatio: 1.586,
} as const;

const OFFSET_STEP = 18;
const SCALES = [1, 0.94, 0.88];
const ALPHAS = [1, 0.82, 0.64];
const ELEVATIONS = [8, 4, 1];

function clampIndex(value: number, count: number): number {
    return Math.min(Math.max(value, 0), Math.max(count - 1, 0));
}

export function visibleSlots(count: number, selected: number): StackSlot[] {
    if (count <= 0) {
        return [];
    }
    const front = clampIndex(selected, count);
    return Array.from({ length: Math.min(count, CARD_STACK.maxVisible) }, (_, i) => ({
        index: (front + i) % count,
        depth: i,
        offset: OFFSET_STEP * i,
        scale: SCALES[i],
        alpha: ALPHAS[i],
        elevation: ELEVATIONS[i],
        zIndex: CARD_STACK.maxVisible - i,
    }));
}

export function nextIndex(count: number, selected: number): number {
    return count <= 0 ? -1 : (clampIndex(selected, count) + 1) % count;
}

export function previousIndex(count: number, selected: number): number {
    return count <= 0 ? -1 : (clampIndex(selected, count) + count - 1) % count;
}

export function showsNumericIndicator(count: number): boolean {
    return count > CARD_STACK.maxVisible;
}

export function expandedLayout(
    count: number,
    selected: number,
    strip: number = CARD_STACK.fanStrip,
): FanSlot[] {
    if (count <= 0) {
        return [];
    }
    const step = Math.max(strip, CARD_STACK.minFanStrip);
    const sel = clampIndex(selected, count);
    return Array.from({ length: count }, (_, i) => ({
        index: i,
        top: i * step,
        selected: i === sel,
        zIndex: i,
    }));
}

export function expandedHeight(
    count: number,
    cardHeight: number,
    strip: number = CARD_STACK.fanStrip,
): number {
    return count <= 0 ? 0 : (count - 1) * Math.max(strip, CARD_STACK.minFanStrip) + cardHeight;
}

export function fanViewport(content: number, max: number = CARD_STACK.fanMaxHeight): number {
    return Math.min(content, max);
}

export function toggleExpanded(expanded: boolean, count: number): boolean {
    return count > 1 && !expanded;
}

export function isExpanded(requested: boolean, count: number): boolean {
    return requested && count > 1;
}

export function afterFanTap(count: number, selected: number, tapped: number): FanOutcome {
    const inRange = tapped >= 0 && tapped < count;
    return { selected: inRange ? tapped : clampIndex(selected, count), expanded: false };
}

export function afterDismiss(count: number, selected: number): FanOutcome {
    return { selected: clampIndex(selected, count), expanded: false };
}

/** Index of `selectedId`, else `previousIndex` clamped into range; -1 when there are no cards. */
export function resolveSelection(
    ids: readonly string[],
    selectedId: string | null | undefined,
    previous: number,
): number {
    if (ids.length === 0) {
        return -1;
    }
    const found = selectedId != null ? ids.indexOf(selectedId) : -1;
    return found >= 0 ? found : clampIndex(previous, ids.length);
}

/** One-based [position, total] for the pager label. */
export function selectionPosition(index: number, count: number): [number, number] {
    return [index + 1, count];
}
