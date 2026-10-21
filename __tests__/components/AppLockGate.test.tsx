import React from 'react';
import { AppState, Modal, Text } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';

const mockLock = {
    enabled: true,
    covered: false,
    authenticating: false,
    message: null,
    methods: ['biometric'],
    controller: { onForeground: jest.fn(), onLeave: jest.fn(), unlock: jest.fn(), disable: jest.fn() },
};

jest.mock('../../src/hooks/appLock/useAppLock', () => ({ useAppLock: () => mockLock }));
jest.mock('../../src/components/appLock/AppLockScreen', () => {
    const { Text: MockText } = require('react-native');
    return { AppLockScreen: () => <MockText>lock screen</MockText> };
});

import { AppLockGate } from '../../src/components/appLock/AppLockGate';

const render = async () => {
    let tree!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
        tree = ReactTestRenderer.create(
            <AppLockGate>
                <Text>secret balance</Text>
            </AppLockGate>,
        );
    });
    return tree;
};

describe('AppLockGate', () => {
    beforeEach(() => {
        mockLock.covered = false;
        mockLock.enabled = true;
        mockLock.authenticating = false;
        jest.spyOn(AppState, 'addEventListener').mockReturnValue({ remove: jest.fn() } as never);
        (AppState as { currentState: string }).currentState = 'active';
    });

    it('keeps the cover modal hidden while unlocked and active', async () => {
        const tree = await render();
        expect(tree.root.findByType(Modal).props.visible).toBe(false);
    });

    it('covers through a native modal so it stacks above app modals, and ignores hardware back', async () => {
        mockLock.covered = true;
        const tree = await render();
        const modal = tree.root.findByType(Modal);
        expect(modal.props.visible).toBe(true);
        expect(modal.props.transparent).toBe(false);
        expect(modal.props.statusBarTranslucent).toBe(true);
        expect(modal.props.animationType).toBe('none');
        expect(() => modal.props.onRequestClose()).not.toThrow();
        expect(mockLock.controller.unlock).not.toHaveBeenCalled();
        expect(tree.root.findAllByProps({ importantForAccessibility: 'no-hide-descendants' }).length).toBeGreaterThan(0);
    });

    it('shows the shield modal while the app is inactive', async () => {
        (AppState as { currentState: string }).currentState = 'inactive';
        const tree = await render();
        expect(tree.root.findByType(Modal).props.visible).toBe(true);
    });

    it('does not shield during the system auth prompt', async () => {
        (AppState as { currentState: string }).currentState = 'inactive';
        mockLock.authenticating = true;
        const tree = await render();
        expect(tree.root.findByType(Modal).props.visible).toBe(false);
    });
});
