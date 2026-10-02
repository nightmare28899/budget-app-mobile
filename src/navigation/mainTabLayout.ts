import { spacing } from '../theme/index';

type MainTabLayoutParams = {
    insetsBottom?: number;
    fabSize?: number;
    isSmallPhone: boolean;
    isTablet?: boolean;
};

type MainTabListPaddingParams = MainTabLayoutParams & {
    scaleSize: (size: number, strength?: number) => number;
    extraSpacing?: number;
};

export const MAIN_TAB_DOCK_SIDE_MARGIN = spacing.base;

export function getMainTabBarHeight({
    isSmallPhone,
    isTablet = false,
}: MainTabLayoutParams) {
    return isSmallPhone ? 62 : isTablet ? 74 : 68;
}

export function getMainTabDockBottomOffset({
    insetsBottom = 0,
    isTablet = false,
}: Pick<MainTabLayoutParams, 'insetsBottom' | 'isTablet'>) {
    const floatingGap = isTablet ? spacing.md : spacing.sm;

    return Math.max(insetsBottom, spacing.xs) + floatingGap;
}

export function getMainTabFabSize({
    isSmallPhone,
    isTablet = false,
    scaleSize,
}: Pick<MainTabListPaddingParams, 'isSmallPhone' | 'scaleSize' | 'isTablet'>) {
    return isSmallPhone ? scaleSize(46, 0.55) : isTablet ? scaleSize(54, 0.5) : scaleSize(50, 0.55);
}

export function getMainTabDockTotalHeight({
    insetsBottom = 0,
    isSmallPhone,
    isTablet = false,
}: MainTabLayoutParams) {
    return getMainTabDockBottomOffset({ insetsBottom, isTablet })
        + getMainTabBarHeight({ isSmallPhone, isTablet });
}

export function getMainTabListBottomPadding({
    insetsBottom = 0,
    isSmallPhone,
    isTablet = false,
    extraSpacing = isTablet ? spacing.xl : spacing.base,
}: MainTabListPaddingParams) {
    return getMainTabDockTotalHeight({ insetsBottom, isSmallPhone, isTablet }) + extraSpacing;
}
