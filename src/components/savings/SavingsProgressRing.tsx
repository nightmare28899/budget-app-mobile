import React, { ReactNode, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useThemedStyles } from '../../theme';

interface SavingsProgressRingProps {
    progress: number;
    size?: number;
    strokeWidth?: number;
    color: string;
    trackColor: string;
    children?: ReactNode;
}

export function SavingsProgressRing({
    progress,
    size = 188,
    strokeWidth = 14,
    color,
    trackColor,
    children,
}: SavingsProgressRingProps) {
    const styles = useThemedStyles(createStyles);
    const segments = 32;
    const clampedProgress = Math.max(0, Math.min(progress, 100));
    const activeSegments = Math.round((clampedProgress / 100) * segments);
    const radius = size / 2;
    const segmentWidth = Math.max(4, strokeWidth * 0.55);
    const segmentHeight = Math.max(8, strokeWidth * 1.65);
    const centerSize = size - strokeWidth * 2.8;

    const segmentStyles = useMemo(
        () =>
            Array.from({ length: segments }, (_, index) => {
                const angle = (360 / segments) * index;
                return {
                    key: `segment-${index}`,
                    style: {
                        width: segmentWidth,
                        height: segmentHeight,
                        borderRadius: segmentWidth / 2,
                        left: radius - segmentWidth / 2,
                        top: radius - segmentHeight / 2,
                        backgroundColor: index < activeSegments ? color : trackColor,
                        transform: [
                            { rotate: `${angle - 90}deg` },
                            { translateY: -(radius - segmentHeight / 2) },
                        ],
                    },
                };
            }),
        [
            activeSegments,
            color,
            radius,
            segmentHeight,
            segmentWidth,
            trackColor,
        ],
    );

    return (
        <View style={[styles.container, { width: size, height: size }]}>
            {segmentStyles.map((segment) => (
                <View
                    key={segment.key}
                    style={[styles.segment, segment.style]}
                />
            ))}
            <View
                style={[
                    styles.center,
                    {
                        width: centerSize,
                        height: centerSize,
                        borderRadius: centerSize / 2,
                    },
                ]}
            >
                {children}
            </View>
        </View>
    );
}

const createStyles = (colors: any) =>
    StyleSheet.create({
        container: {
            alignItems: 'center',
            justifyContent: 'center',
        },
        segment: {
            position: 'absolute',
        },
        center: {
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.surfaceCard,
            borderWidth: 1,
            borderColor: colors.border,
        },
    });
