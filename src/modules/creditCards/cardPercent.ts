export type UtilizationTone = 'HEALTHY' | 'CAUTION' | 'HIGH';

export const CAUTION_FROM = 30;
export const HIGH_FROM = 60;

export function clampUtilization(percent: number | null | undefined): number {
    if (percent == null || Number.isNaN(percent)) {
        return 0;
    }
    return Math.min(Math.max(percent, 0), 100);
}

export function utilizationToneOf(percent: number | null | undefined): UtilizationTone {
    const value = clampUtilization(percent);
    if (value >= HIGH_FROM) {
        return 'HIGH';
    }
    return value >= CAUTION_FROM ? 'CAUTION' : 'HEALTHY';
}

/** Percent truncated (never rounded up) to one decimal; whole numbers print without a fraction. */
export function formatCardPercent(
    percent: number | null | undefined,
    decimalSeparator = '.',
): string {
    let value = 0;
    if (percent != null && !Number.isNaN(percent)) {
        if (Number.isFinite(percent)) {
            value = Math.max(percent, 0);
        } else if (percent > 0) {
            value = 100;
        }
    }
    const truncated = Math.floor(value * 10 + 1e-9) / 10;
    if (truncated === Math.floor(truncated)) {
        return String(truncated);
    }
    return truncated.toFixed(1).replace('.', decimalSeparator);
}
