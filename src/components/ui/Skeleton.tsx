import React, { useEffect, useRef } from 'react';
import {
    Animated,
    StyleProp,
    StyleSheet,
    View,
    ViewStyle,
} from 'react-native';
import { borderRadius, spacing, useThemedStyles } from '../../theme';

type SkeletonProps = {
    width?: number | `${number}%` | '100%';
    height: number;
    radius?: number;
    style?: StyleProp<ViewStyle>;
};

export function Skeleton({
    width = '100%',
    height,
    radius = borderRadius.md,
    style,
}: SkeletonProps) {
    const styles = useThemedStyles(createStyles);
    const pulse = useRef(new Animated.Value(0.35)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(pulse, {
                    toValue: 0.75,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(pulse, {
                    toValue: 0.35,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ]),
        );
        loop.start();
        return () => loop.stop();
    }, [pulse]);

    return (
        <Animated.View
            style={[
                styles.base,
                { width, height, borderRadius: radius, opacity: pulse },
                style,
            ]}
        />
    );
}

interface BlockProps {
    horizontalPadding: number;
    contentMaxWidth?: number;
}

export function DashboardSkeleton({ horizontalPadding, contentMaxWidth }: BlockProps) {
    const styles = useThemedStyles(createStyles);
    return (
        <View style={{ paddingHorizontal: horizontalPadding }}>
            <View
                style={[
                    styles.card,
                    contentMaxWidth ? { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' } : null,
                ]}
            >
                <Skeleton width="45%" height={16} />
                <Skeleton width="60%" height={44} style={{ marginTop: spacing.sm }} />
                <Skeleton width="100%" height={8} radius={borderRadius.full} style={{ marginTop: spacing.base }} />
                <View style={styles.row}>
                    <Skeleton width="44%" height={38} />
                    <Skeleton width="44%" height={38} />
                </View>
            </View>

            <View style={styles.listSection}>
                <Skeleton width="38%" height={16} />
                {Array.from({ length: 4 }).map((_, index) => (
                    <View key={`dash-skeleton-${index}`} style={styles.listItem}>
                        <Skeleton width={44} height={44} radius={borderRadius.md} />
                        <View style={styles.flex1}>
                            <Skeleton width="58%" height={14} />
                            <Skeleton width="32%" height={12} style={{ marginTop: spacing.xs }} />
                        </View>
                        <Skeleton width={64} height={16} />
                    </View>
                ))}
            </View>
        </View>
    );
}

export function HistorySkeleton({ horizontalPadding, contentMaxWidth }: BlockProps) {
    const styles = useThemedStyles(createStyles);
    return (
        <View
            style={[
                { paddingHorizontal: horizontalPadding },
                contentMaxWidth ? { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' } : null,
            ]}
        >
            <Skeleton width="100%" height={48} />
            <View style={{ marginTop: spacing.base }}>
                {Array.from({ length: 6 }).map((_, index) => (
                    <View key={`history-skeleton-${index}`} style={styles.listItem}>
                        <Skeleton width={44} height={44} radius={borderRadius.md} />
                        <View style={styles.flex1}>
                            <Skeleton width="55%" height={14} />
                            <Skeleton width="40%" height={12} style={{ marginTop: spacing.xs }} />
                        </View>
                        <Skeleton width={72} height={14} />
                    </View>
                ))}
            </View>
        </View>
    );
}

export function AnalyticsSkeleton({ horizontalPadding, contentMaxWidth }: BlockProps) {
    const styles = useThemedStyles(createStyles);
    return (
        <View
            style={[
                { paddingHorizontal: horizontalPadding },
                contentMaxWidth ? { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' } : null,
            ]}
        >
            <View style={styles.card}>
                <Skeleton width="34%" height={16} />
                <Skeleton width="50%" height={42} style={{ marginTop: spacing.md }} />
                <View style={styles.row}>
                    <Skeleton width="30%" height={34} />
                    <Skeleton width="30%" height={34} />
                    <Skeleton width="30%" height={34} />
                </View>
            </View>
            <View style={styles.card}>
                <Skeleton width="46%" height={16} />
                <Skeleton width="100%" height={170} style={{ marginTop: spacing.md }} />
            </View>
            <View style={styles.card}>
                <Skeleton width="30%" height={16} />
                {Array.from({ length: 4 }).map((_, index) => (
                    <View key={`analytics-cat-skeleton-${index}`} style={styles.listItem}>
                        <Skeleton width={24} height={24} radius={borderRadius.sm} />
                        <View style={styles.flex1}>
                            <Skeleton width="45%" height={14} />
                            <Skeleton width="32%" height={12} style={{ marginTop: spacing.xs }} />
                        </View>
                        <Skeleton width={92} height={12} />
                    </View>
                ))}
            </View>
        </View>
    );
}

export function CategorySelectorSkeleton() {
    const styles = useThemedStyles(createStyles);
    return (
        <View style={styles.categorySkeletonRow}>
            {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton
                    key={`category-chip-skeleton-${index}`}
                    width={index === 0 ? 94 : index === 1 ? 108 : 88}
                    height={38}
                    radius={borderRadius.full}
                />
            ))}
        </View>
    );
}

export function AppBootstrapSkeleton() {
    const styles = useThemedStyles(createStyles);
    return (
        <View style={styles.bootstrapContainer}>
            <View style={styles.bootstrapCard}>
                <Skeleton width={64} height={64} radius={borderRadius.full} />
                <Skeleton width="44%" height={18} style={styles.bootstrapTitle} />
                <Skeleton width="68%" height={14} style={styles.bootstrapSubtitle} />
            </View>
        </View>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    base: {
        backgroundColor: colors.shimmer,
    },
    card: {
        backgroundColor: colors.surfaceCard,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.xl,
        padding: spacing.xl,
        marginBottom: spacing.base,
    },
    row: {
        marginTop: spacing.base,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    listSection: {
        marginTop: spacing.sm,
        marginBottom: spacing.base,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surfaceElevated,
        borderRadius: borderRadius.lg,
        padding: spacing.base,
        marginTop: spacing.sm,
        gap: spacing.sm,
    },
    flex1: {
        flex: 1,
    },
    categorySkeletonRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    bootstrapContainer: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
    },
    bootstrapCard: {
        width: '100%',
        maxWidth: 320,
        alignItems: 'center',
        backgroundColor: colors.surfaceCard,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.xl,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing['2xl'],
    },
    bootstrapTitle: {
        marginTop: spacing.lg,
    },
    bootstrapSubtitle: {
        marginTop: spacing.sm,
    },
});
