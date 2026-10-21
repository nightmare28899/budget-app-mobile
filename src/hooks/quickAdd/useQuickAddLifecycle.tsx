import { QuickAddLifecycleContext } from './quickAddLifecycleContext';
export { QuickAddLifecycleContext };
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { usePreventRemove } from '@react-navigation/native';
import type { RootScreenProps } from '../../navigation/types';
import { useAppAlert } from '../../components/alerts/AlertProvider';
import { useI18n } from '../shared/useI18n';
import { closeDecision, type FormLifecycle } from '../../modules/quickAdd/lifecycle';

export function useQuickAddLifecycle(navigation: RootScreenProps<'AddEntry'>['navigation']) {
    const { alert } = useAppAlert();
    const { t } = useI18n();
    const current = useRef<FormLifecycle>({ dirty: false, busy: false, saved: false });
    const [state, setState] = useState(current.current);
    const pendingConfirmation = useRef(false);
    const report = useCallback((dirty: boolean, busy: boolean) => {
        const previous = current.current;
        if (previous.saved) { return; }
        if (previous.dirty === dirty && previous.busy === busy && !previous.saved) { return; }
        current.current = { dirty, busy, saved: false };
        setState(current.current);
    }, []);
    const saved = useCallback(() => {
        current.current = { ...current.current, saved: true };
        setState(current.current);
    }, []);
    const channel = useMemo(() => ({ report, saved }), [report, saved]);
    const request = useCallback((action: () => void, cancelled?: () => void) => {
        const decision = closeDecision(current.current);
        if (decision === 'blocked') { cancelled?.(); return; }
        if (decision === 'allow') { action(); return; }
        if (pendingConfirmation.current) { cancelled?.(); return; }
        pendingConfirmation.current = true;
        alert(t('quickAdd.discardTitle'), t('quickAdd.discardMessage'), [
            { text: t('quickAdd.keepEditing'), style: 'cancel', onPress: () => {
                pendingConfirmation.current = false; cancelled?.();
            } },
            { text: t('quickAdd.discard'), style: 'destructive', onPress: () => {
                pendingConfirmation.current = false;
                if (current.current.busy) { cancelled?.(); return; }
                // A tab change may unmount the old form before the next report arrives.
                current.current = { dirty: false, busy: false, saved: true };
                setState(current.current);
                action();
            } },
        ], { cancelable: false });
    }, [alert, t]);
    usePreventRemove(!state.saved && (state.dirty || state.busy), ({ data }) => {
        request(() => navigation.dispatch(data.action));
    });
    useLayoutEffect(() => {
        // Native iOS interactive dismissal cannot show a discard prompt before animating.
        navigation.setOptions({ gestureEnabled: !state.dirty && !state.busy });
    }, [navigation, state.dirty, state.busy]);
    const startForm = () => {
        current.current = { dirty: false, busy: false, saved: false };
        setState(current.current);
    };
    return { channel, request, startForm };
}
