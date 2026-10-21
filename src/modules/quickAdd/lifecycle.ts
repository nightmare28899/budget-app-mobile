export type FormLifecycle = { dirty: boolean; busy: boolean; saved: boolean };
export function closeDecision(state: FormLifecycle): 'allow' | 'blocked' | 'confirm' {
    if (state.saved) { return 'allow'; }
    if (state.busy) { return 'blocked'; }
    return state.dirty ? 'confirm' : 'allow';
}
