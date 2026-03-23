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

        const deviceScale = clamp(shortestSide / 390, 0.86, 1.22);

        const scaleSize = (size: number, strength = 0.45) =>
            Math.round(size + (size * deviceScale - size) * strength);

        const scaleFont = (size: number, strength = 0.6) =>
            Math.round(size + (size * deviceScale - size) * strength);

        const horizontalPadding = isTablet
            ? spacing['3xl']
            : isSmallPhone
                ? spacing.base
                : isLargePhone
                    ? spacing['2xl']
                    : spacing.xl;

        const contentMaxWidth = isTablet ? 760 : undefined;

        return {
            width,
            height,
            isSmallPhone,
            isLargePhone,
            isTablet,
            scaleSize,
            scaleFont,
            horizontalPadding,
            contentMaxWidth,
        };
    }, [height, width]);
}
