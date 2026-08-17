import React, { useState } from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Text } from 'react-native';
import { ErrorBoundary } from '../src/components/ErrorBoundary';

function ThrowingChild(): React.ReactElement {
    throw new Error('render failed');
}

test('renders a recoverable fallback after a render error', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    let renderer!: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
        renderer = ReactTestRenderer.create(
            <ErrorBoundary>
                <ThrowingChild />
            </ErrorBoundary>,
        );
    });

    expect(renderer.root.findByProps({ testID: 'error-boundary-fallback' })).toBeTruthy();
    expect(renderer.root.findByProps({ testID: 'error-boundary-retry' })).toBeTruthy();

    consoleError.mockRestore();
});

test('retries rendering children after the fallback action', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    let shouldThrow = true;

    function RecoverableChild() {
        const [, rerender] = useState(0);
        if (shouldThrow) {
            throw new Error('temporary render failure');
        }

        return (
            <Text onPress={() => rerender((value) => value + 1)} testID="recovered-child">
                Recovered
            </Text>
        );
    }

    let renderer!: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
        renderer = ReactTestRenderer.create(
            <ErrorBoundary>
                <RecoverableChild />
            </ErrorBoundary>,
        );
    });

    shouldThrow = false;
    ReactTestRenderer.act(() => {
        renderer.root.findByProps({ testID: 'error-boundary-retry' }).props.onPress();
    });

    expect(renderer.root.findByProps({ testID: 'recovered-child' })).toBeTruthy();
    consoleError.mockRestore();
});
