import { spacing } from '../theme';

type MainTabLayoutParams = {
    insetsBottom?: number;
    isSmallPhone: boolean;
};

type MainTabListPaddingParams = MainTabLayoutParams & {
    scaleSize: (size: number, strength?: number) => number;
    extraSpacing?: number;
};

export function getMainTabBarHeight({
    insetsBottom = 0,
    isSmallPhone,
}: MainTabLayoutParams) {
    return (isSmallPhone ? 72 : 80) + insetsBottom;
}

export function getMainTabFabBottomOffset({
    insetsBottom = 0,
    isSmallPhone,
}: MainTabLayoutParams) {
    return insetsBottom + (isSmallPhone ? 34 : 40);
}

export function getMainTabFabSize({
    isSmallPhone,
    scaleSize,
}: Pick<MainTabListPaddingParams, 'isSmallPhone' | 'scaleSize'>) {
    return isSmallPhone ? scaleSize(56, 0.62) : scaleSize(62, 0.62);
}

export function getMainTabListBottomPadding({
    insetsBottom,
    isSmallPhone,
    scaleSize,
    extraSpacing = spacing.base,
}: MainTabListPaddingParams) {
    const tabBarClearance = spacing.xs + getMainTabBarHeight({ insetsBottom, isSmallPhone });
    const fabClearance = getMainTabFabBottomOffset({ insetsBottom, isSmallPhone })
        + getMainTabFabSize({ isSmallPhone, scaleSize });

    return Math.max(tabBarClearance, fabClearance) + extraSpacing;
}
