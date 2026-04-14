import { useCallback, useRef } from 'react';
import {
    NativeSyntheticEvent,
    ScrollView,
    TextInputFocusEventData,
} from 'react-native';

type ScrollViewWithKeyboardHelper = ScrollView & {
    scrollResponderScrollNativeHandleToKeyboard?: (
        nodeHandle: number,
        additionalOffset?: number,
        preventNegativeScrollOffset?: boolean,
    ) => void;
};

export function useScrollToFocusedInput(defaultExtraOffset: number = 96) {
    const scrollRef = useRef<ScrollView>(null);

    const scrollToFocusedInput = useCallback(
        (target: number | null | undefined, extraOffset: number = defaultExtraOffset) => {
            if (!target) {
                return;
            }

            requestAnimationFrame(() => {
                setTimeout(() => {
                    (
                        scrollRef.current as ScrollViewWithKeyboardHelper | null
                    )?.scrollResponderScrollNativeHandleToKeyboard?.(
                        target,
                        extraOffset,
                        true,
                    );
                }, 60);
            });
        },
        [defaultExtraOffset],
    );

    const createScrollOnFocusHandler = useCallback(
        (extraOffset: number = defaultExtraOffset) =>
            (event: NativeSyntheticEvent<TextInputFocusEventData>) => {
                scrollToFocusedInput(
                    typeof event?.target === 'number' ? event.target : null,
                    extraOffset,
                );
            },
        [defaultExtraOffset, scrollToFocusedInput],
    );

    return {
        scrollRef,
        scrollToFocusedInput,
        createScrollOnFocusHandler,
    };
}
