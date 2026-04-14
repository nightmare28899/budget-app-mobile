import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../../../theme/index';
import { withAlpha } from '../../../utils/domain/subscriptions';

export function HomeBackground() {
    const { colors, isDark } = useTheme();

    return (
        <View pointerEvents="none" style={styles.backgroundArt}>
            <View
                style={[
                    styles.orb,
                    styles.orbTop,
                    {
                        backgroundColor: withAlpha(colors.success, isDark ? 0.17 : 0.09),
                    },
                ]}
            />
            <View
                style={[
                    styles.orb,
                    styles.orbBottom,
                    {
                        backgroundColor: withAlpha(colors.primaryAction, isDark ? 0.2 : 0.08),
                    },
                ]}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    backgroundArt: {
        ...StyleSheet.absoluteFillObject,
    },
    orb: {
        position: 'absolute',
        borderRadius: 999,
    },
    orbTop: {
        width: 260,
        height: 260,
        top: -120,
        right: -60,
    },
    orbBottom: {
        width: 220,
        height: 220,
        bottom: 120,
        left: -100,
    },
});
