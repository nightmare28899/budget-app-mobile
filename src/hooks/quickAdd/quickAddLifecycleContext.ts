import { createContext, useContext, useLayoutEffect, useRef } from 'react';

export type LifecycleChannel = {
    report: (dirty: boolean, busy: boolean) => void;
    saved: () => void;
};
export const QuickAddLifecycleContext = createContext<LifecycleChannel | null>(null);

/** Embedded forms report through this channel; standalone forms retain their existing behavior. */
export function useQuickAddForm(fields: unknown, busy: boolean) {
    const channel = useContext(QuickAddLifecycleContext);
    const fingerprint = JSON.stringify(fields);
    const initial = useRef(fingerprint);
    const dirty = initial.current !== fingerprint;
    useLayoutEffect(() => { channel?.report(dirty, busy); }, [channel, dirty, busy]);
    return channel;
}

