import { spacing } from '../theme';

type MainTabLayoutParams = {
    insetsBottom?: number;
    isSmallPhone: boolean;
    isTablet?: boolean;
};

type MainTabListPaddingParams = MainTabLayoutParams & {
    scaleSize: (size: number, strength?: number) => number;
    extraSpacing?: number;
};

export function getMainTabBarHeight({
    insetsBottom = 0,
    isSmallPhone,
    isTablet = false,
}: MainTabLayoutParams) {
    return (isSmallPhone ? 72 : isTablet ? 84 : 80) + insetsBottom;
}

export function getMainTabFabBottomOffset({
    insetsBottom = 0,
    isSmallPhone,
    isTablet = false,
}: MainTabLayoutParams) {
    return insetsBottom + (isSmallPhone ? 34 : isTablet ? 42 : 40);
}

export function getMainTabFabSize({
    isSmallPhone,
    isTablet = false,
    scaleSize,
}: Pick<MainTabListPaddingParams, 'isSmallPhone' | 'scaleSize' | 'isTablet'>) {
    return isSmallPhone ? scaleSize(56, 0.62) : isTablet ? scaleSize(64, 0.58) : scaleSize(62, 0.62);
}

export function getMainTabListBottomPadding({
    insetsBottom,
    isSmallPhone,
    isTablet = false,
    scaleSize,
    extraSpacing = isTablet ? spacing.xl : spacing.base,
}: MainTabListPaddingParams) {
    const tabBarClearance = spacing.xs + getMainTabBarHeight({ insetsBottom, isSmallPhone, isTablet });
    const fabClearance = getMainTabFabBottomOffset({ insetsBottom, isSmallPhone, isTablet })
        + getMainTabFabSize({ isSmallPhone, isTablet, scaleSize });

    return Math.max(tabBarClearance, fabClearance) + extraSpacing;
}
