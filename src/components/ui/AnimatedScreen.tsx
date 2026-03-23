import React, { useEffect, useRef } from 'react';
import { Animated, Easing, ViewStyle } from 'react-native';

interface AnimatedScreenProps {
    children: React.ReactNode;
    style?: ViewStyle | ViewStyle[];
    delay?: number;
    duration?: number;
    travelY?: number;
}

export function AnimatedScreen({
    children,
    style,
    delay = 0,
    duration = 360,
    travelY = 14,
}: AnimatedScreenProps) {
    const progress = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const animation = Animated.timing(progress, {
            toValue: 1,
            duration,
            delay,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        });

        animation.start();
        return () => animation.stop();
    }, [delay, duration, progress]);

    return (
        <Animated.View
            style={[
                style,
                {
                    opacity: progress,
                    transform: [
                        {
                            translateY: progress.interpolate({
                                inputRange: [0, 1],
                                outputRange: [travelY, 0],
                            }),
                        },
                    ],
                },
            ]}
        >
            {children}
        </Animated.View>
    );
}
