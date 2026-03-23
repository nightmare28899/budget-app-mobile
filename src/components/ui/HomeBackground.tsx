import React from 'react';
import { StyleSheet, View } from 'react-native';

export function HomeBackground() {
    return (
        <View pointerEvents="none" style={styles.backgroundArt}>
            <View style={[styles.orb, styles.orbTop]} />
            <View style={[styles.orb, styles.orbBottom]} />
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
        backgroundColor: 'rgba(0, 230, 118, 0.17)',
    },
    orbBottom: {
        width: 220,
        height: 220,
        bottom: 120,
        left: -100,
        backgroundColor: 'rgba(90, 146, 255, 0.2)',
    },
});
