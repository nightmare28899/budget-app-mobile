import { Vibration } from 'react-native';

function clampDuration(ms: number): number {
    if (!Number.isFinite(ms)) {
        return 8;
    }
    return Math.max(1, Math.round(ms));
}

export function softHaptic(durationMs = 8): void {
    try {
        Vibration.vibrate(clampDuration(durationMs));
    } catch (error) {
        console.error('Failed to vibrate', error);
    }
}
