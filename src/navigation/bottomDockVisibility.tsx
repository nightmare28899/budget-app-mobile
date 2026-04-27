import React from 'react';
import {
    Animated,
    Easing,
    LayoutChangeEvent,
    NativeScrollEvent,
    NativeSyntheticEvent,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

type BottomDockVisibilityContextValue = {
    isVisible: boolean;
    progress: Animated.Value;
    showDock: () => void;
    hideDock: () => void;
};

type BottomDockVisibilityProviderProps = {
    children: React.ReactNode;
};

type BottomDockScrollOptions = {
    minimumScrollableOffset?: number;
    minimumScrollDelta?: number;
    topOffsetThreshold?: number;
    forceVisible?: boolean;
    resetKey?: string | number | boolean | null;
};

type BottomDockScrollHandlers = {
    onLayout: (event: LayoutChangeEvent) => void;
    onContentSizeChange: (width: number, height: number) => void;
    onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
    scrollEventThrottle: number;
};

const DEFAULT_MINIMUM_SCROLLABLE_OFFSET = 48;
const DEFAULT_MINIMUM_SCROLL_DELTA = 10;
const DEFAULT_TOP_OFFSET_THRESHOLD = 12;

const BottomDockVisibilityContext = React.createContext<BottomDockVisibilityContextValue | null>(null);

export function BottomDockVisibilityProvider({
    children,
}: BottomDockVisibilityProviderProps) {
    const progress = React.useRef(new Animated.Value(1)).current;
    const [isVisible, setIsVisible] = React.useState(true);
    const isVisibleRef = React.useRef(true);

    const animateTo = React.useCallback((nextVisible: boolean) => {
        progress.stopAnimation();
        setIsVisible(nextVisible);
        Animated.timing(progress, {
            toValue: nextVisible ? 1 : 0,
            duration: 180,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }).start();
    }, [progress]);

    const showDock = React.useCallback(() => {
        if (isVisibleRef.current) {
            return;
        }

        isVisibleRef.current = true;
        animateTo(true);
    }, [animateTo]);

    const hideDock = React.useCallback(() => {
        if (!isVisibleRef.current) {
            return;
        }

        isVisibleRef.current = false;
        animateTo(false);
    }, [animateTo]);

    const value = React.useMemo(
        () => ({
            isVisible,
            progress,
            showDock,
            hideDock,
        }),
        [hideDock, isVisible, progress, showDock],
    );

    return (
        <BottomDockVisibilityContext.Provider value={value}>
            {children}
        </BottomDockVisibilityContext.Provider>
    );
}

export function useBottomDockVisibility() {
    const context = React.useContext(BottomDockVisibilityContext);

    if (!context) {
        throw new Error('useBottomDockVisibility must be used within BottomDockVisibilityProvider.');
    }

    return context;
}

export function useBottomDockScrollVisibility(
    options: BottomDockScrollOptions = {},
): BottomDockScrollHandlers {
    const { showDock, hideDock } = useBottomDockVisibility();
    const {
        minimumScrollableOffset = DEFAULT_MINIMUM_SCROLLABLE_OFFSET,
        minimumScrollDelta = DEFAULT_MINIMUM_SCROLL_DELTA,
        topOffsetThreshold = DEFAULT_TOP_OFFSET_THRESHOLD,
        forceVisible = false,
        resetKey = null,
    } = options;
    const containerHeightRef = React.useRef(0);
    const contentHeightRef = React.useRef(0);
    const lastOffsetYRef = React.useRef(0);

    const canHideDock = React.useCallback(() => (
        contentHeightRef.current - containerHeightRef.current > minimumScrollableOffset
    ), [minimumScrollableOffset]);

    const syncDockWithContentSize = React.useCallback(() => {
        if (!forceVisible && canHideDock()) {
            return;
        }

        lastOffsetYRef.current = 0;
        showDock();
    }, [canHideDock, forceVisible, showDock]);

    const onLayout = React.useCallback((event: LayoutChangeEvent) => {
        containerHeightRef.current = event.nativeEvent.layout.height;
        syncDockWithContentSize();
    }, [syncDockWithContentSize]);

    const onContentSizeChange = React.useCallback((_width: number, height: number) => {
        contentHeightRef.current = height;
        syncDockWithContentSize();
    }, [syncDockWithContentSize]);

    const onScroll = React.useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const nextOffsetY = Math.max(event.nativeEvent.contentOffset.y, 0);

        if (forceVisible || !canHideDock()) {
            lastOffsetYRef.current = nextOffsetY;
            showDock();
            return;
        }

        if (nextOffsetY <= topOffsetThreshold) {
            lastOffsetYRef.current = nextOffsetY;
            showDock();
            return;
        }

        const deltaY = nextOffsetY - lastOffsetYRef.current;
        lastOffsetYRef.current = nextOffsetY;

        if (deltaY >= minimumScrollDelta) {
            hideDock();
            return;
        }

        if (deltaY <= -minimumScrollDelta) {
            showDock();
        }
    }, [canHideDock, forceVisible, hideDock, minimumScrollDelta, showDock, topOffsetThreshold]);

    React.useEffect(() => {
        lastOffsetYRef.current = 0;
        showDock();
    }, [forceVisible, resetKey, showDock]);

    useFocusEffect(
        React.useCallback(() => {
            showDock();
            lastOffsetYRef.current = 0;

            return () => {
                showDock();
                lastOffsetYRef.current = 0;
            };
        }, [showDock]),
    );

    return {
        onLayout,
        onContentSizeChange,
        onScroll,
        scrollEventThrottle: 16,
    };
}
