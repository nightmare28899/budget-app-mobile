import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { spacing } from './spacing';

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}

export function useResponsive() {
    const { width, height } = useWindowDimensions();

    return useMemo(() => {
        const shortestSide = Math.min(width, height);
        const isSmallPhone = shortestSide < 360;
        const isLargePhone = shortestSide >= 430;
        const isTablet = shortestSide >= 600;
        const isTabletLandscape = isTablet && width > height;
        const isLargeTablet = isTablet && (shortestSide >= 744 || width >= 1024);

        const deviceScale = clamp(shortestSide / 390, 0.86, 1.22);

        const scaleSize = (size: number, strength = 0.45) =>
            Math.round(size + (size * deviceScale - size) * strength);

        const scaleFont = (size: number, strength = 0.6) =>
            Math.round(size + (size * deviceScale - size) * strength);

        const horizontalPadding = isTablet
            ? (isLargeTablet ? spacing['2xl'] : spacing.xl)
            : isSmallPhone
                ? spacing.base
                : isLargePhone
                    ? spacing['2xl']
                    : spacing.xl;

        const contentMaxWidth = isTablet
            ? Math.min(
                Math.max(width - horizontalPadding * 2, 0),
                isLargeTablet
                    ? (isTabletLandscape ? 1180 : 980)
                    : isTabletLandscape
                        ? 980
                        : 860,
            )
            : undefined;
        const modalMaxWidth = isTablet
            ? Math.min(
                Math.max(width - horizontalPadding * 2, 0),
                isLargeTablet ? 620 : 540,
            )
            : 420;
        const tabBarMaxWidth = isTablet
            ? Math.min(
                Math.max(width - horizontalPadding * 2, 0),
                isLargeTablet ? 840 : 780,
            )
            : undefined;

        return {
            width,
            height,
            isSmallPhone,
            isLargePhone,
            isTablet,
            isTabletLandscape,
            isLargeTablet,
            scaleSize,
            scaleFont,
            horizontalPadding,
            contentMaxWidth,
            modalMaxWidth,
            tabBarMaxWidth,
        };
    }, [height, width]);
}
