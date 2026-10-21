import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

const mockAlert = jest.fn();
const mockPreventRemove = jest.fn();
jest.mock('@react-navigation/native', () => ({ usePreventRemove: (...args: unknown[]) => mockPreventRemove(...args) }));
jest.mock('../../../src/components/alerts/AlertProvider', () => ({ useAppAlert: () => ({ alert: mockAlert }) }));
jest.mock('../../../src/hooks/shared/useI18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }));

import { useQuickAddLifecycle } from '../../../src/hooks/quickAdd/useQuickAddLifecycle';
import { QuickAddLifecycleContext, useQuickAddForm } from '../../../src/hooks/quickAdd/quickAddLifecycleContext';
import type { RootScreenProps } from '../../../src/navigation/types';

let controls: ReturnType<typeof useQuickAddLifecycle>;
let form: ReturnType<typeof useQuickAddForm>;
const navigation = { dispatch: jest.fn(), setOptions: jest.fn() };
function Form({ value, busy }: { value: string; busy: boolean }) {
    form = useQuickAddForm({ value }, busy);
    return null;
}
function Harness({ value = '', busy = false }: { value?: string; busy?: boolean }) {
    controls = useQuickAddLifecycle(navigation as unknown as RootScreenProps<'AddEntry'>['navigation']);
    return <QuickAddLifecycleContext.Provider value={controls.channel}><Form value={value} busy={busy} /></QuickAddLifecycleContext.Provider>;
}
function removal() {
    return mockPreventRemove.mock.calls[mockPreventRemove.mock.calls.length - 1];
}

describe('QuickAdd actual lifecycle wiring', () => {
    let renderer: TestRenderer.ReactTestRenderer;
    beforeEach(async () => {
        jest.clearAllMocks();
        await act(async () => { renderer = TestRenderer.create(<Harness />); });
    });
    afterEach(async () => { await act(async () => renderer.unmount()); });
    it('protects dirty tab/drag/close actions and native back with discard confirmation', async () => {
        await act(async () => renderer.update(<Harness value="changed" />));
        expect(navigation.setOptions).toHaveBeenLastCalledWith({ gestureEnabled: false });
        const tabOrClose = jest.fn();
        act(() => controls.request(tabOrClose));
        expect(tabOrClose).not.toHaveBeenCalled();
        act(() => mockAlert.mock.calls[0][2][0].onPress());
        expect(tabOrClose).not.toHaveBeenCalled();
        const [enabled, onRemove] = removal();
        expect(enabled).toBe(true);
        act(() => onRemove({ data: { action: { type: 'GO_BACK' } } }));
        expect(navigation.dispatch).not.toHaveBeenCalled();
        act(() => mockAlert.mock.calls[1][2][1].onPress());
        expect(navigation.dispatch).toHaveBeenCalledWith({ type: 'GO_BACK' });
    });
    it('blocks close, tabs and native back during a save', async () => {
        await act(async () => renderer.update(<Harness value="changed" busy />));
        const action = jest.fn();
        act(() => controls.request(action));
        act(() => removal()[1]({ data: { action: { type: 'GO_BACK' } } }));
        expect(action).not.toHaveBeenCalled();
        expect(navigation.dispatch).not.toHaveBeenCalled();
        expect(mockAlert).not.toHaveBeenCalled();
    });
    it('marks a successful save terminal before navigation, even while busy', async () => {
        await act(async () => renderer.update(<Harness value="changed" busy />));
        const action = jest.fn();
        act(() => { form?.saved(); controls.request(action); });
        expect(action).toHaveBeenCalledTimes(1);
        expect(mockAlert).not.toHaveBeenCalled();
        await act(async () => renderer.update(<Harness value="" />));
        expect(removal()[0]).toBe(false);
    });
    it('keeps forms open when discard confirmation races a save', async () => {
        await act(async () => renderer.update(<Harness value="changed" />));
        const action = jest.fn();
        act(() => controls.request(action));
        await act(async () => renderer.update(<Harness value="changed" busy />));
        act(() => mockAlert.mock.calls[0][2][1].onPress());
        expect(action).not.toHaveBeenCalled();
    });
});
