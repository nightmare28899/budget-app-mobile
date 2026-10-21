import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('../../src/store/authStore', () => {
    const { create: make } = require('zustand');
    const store = make((set: (value: unknown) => void) => ({
        user: { id: 'a', isPremium: true }, sessionRevision: 1, isAuthenticated: true, isLoading: false,
        setUser: (user: unknown) => set({ user }),
    }));
    return { useAuthStore: store };
});
jest.mock('../../src/api/resources/users', () => ({ usersApi: { getEntitlements: jest.fn(), getMe: jest.fn() } }));
import { useAuthStore } from '../../src/store/authStore';
import { usersApi } from '../../src/api/resources/users';
import { useEntitlements } from '../../src/hooks/access/useEntitlements';
import { normalizeEntitlements } from '../../src/modules/access/entitlements';
import { useProfileSync } from '../../src/hooks/auth/useProfileSync';
import type { User } from '../../src/types/index';

const api = usersApi as jest.Mocked<typeof usersApi>;
let result: ReturnType<typeof useEntitlements>;
function Harness({ profile = false }: { profile?: boolean }) {
    result = useEntitlements();
    // Subscribe to the status fields that the paywall actually renders.
    const status = { error: result.isError, fetching: result.isFetching };
    if (status.error && status.fetching) { return null; }
    return profile ? <Profile /> : null;
}
function Profile() { useProfileSync(); return null; }
const tick = () => new Promise<void>(resolve => setTimeout(resolve, 15));
function deferred<T>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>(done => { resolve = done; });
    return { resolve, promise };
}
const user = (id: string, premium = true) => ({ id, email: `${id}@example.test`, name: id, isPremium: premium } as User);

describe('authenticated entitlement refresh', () => {
    let client: QueryClient;
    let renderer: Renderer.ReactTestRenderer;
    beforeEach(() => {
        jest.resetAllMocks();
        useAuthStore.setState({ user: user('a'), sessionRevision: 1, isAuthenticated: true, isLoading: false });
        client = new QueryClient({ defaultOptions: { queries: { retry: false, retryDelay: 0, gcTime: Infinity } } });
    });
    afterEach(async () => { if (renderer) { await act(async () => renderer.unmount()); } client.clear(); });
    const mount = async (profile = false) => {
        await act(async () => { renderer = Renderer.create(<QueryClientProvider client={client}><Harness profile={profile} /></QueryClientProvider>); await tick(); });
        for (let i = 0; i < 4; i += 1) { await act(async () => { await tick(); }); }
    };
    it('applies disabled override to the shared profile, including profile refresh', async () => {
        api.getMe.mockResolvedValue(user('a'));
        api.getEntitlements.mockResolvedValue(normalizeEntitlements({ account: { isPremium: true, isDisabled: true } }));
        await mount(true);
        expect(useAuthStore.getState().user?.isPremium).toBe(false);
    });
    it('reapplies known disabled entitlements if a profile mutation restores a stale premium flag', async () => {
        api.getEntitlements.mockResolvedValue(normalizeEntitlements({ account: { isPremium: true, isDisabled: true } }));
        await mount();
        expect(useAuthStore.getState().user?.isPremium).toBe(false);
        await act(async () => { useAuthStore.getState().setUser(user('a', true)); await tick(); });
        expect(useAuthStore.getState().user?.isPremium).toBe(false);
        expect(api.getEntitlements).toHaveBeenCalledTimes(1);
    });
    it('unknown account keeps cached premium and a retry exposes query loading/error state', async () => {
        api.getEntitlements.mockRejectedValue(new Error('offline'));
        await mount();
        expect(result.isError).toBe(true);
        expect(useAuthStore.getState().user?.isPremium).toBe(true);
        api.getEntitlements.mockResolvedValue(normalizeEntitlements({ account: null }));
        await act(async () => { await result.refetch(); await tick(); });
        expect(result.isError).toBe(false);
        expect(useAuthStore.getState().user?.isPremium).toBe(true);
    });
    it('ignores previous-account results and same-account previous-session results', async () => {
        const old = deferred<Awaited<ReturnType<typeof api.getEntitlements>>>();
        const next = deferred<Awaited<ReturnType<typeof api.getEntitlements>>>();
        api.getEntitlements.mockReturnValueOnce(old.promise).mockReturnValueOnce(next.promise);
        await mount();
        await act(async () => { useAuthStore.setState({ user: user('a'), sessionRevision: 3 }); await tick(); });
        await act(async () => { old.resolve(normalizeEntitlements({ account: { isPremium: false } })); await tick(); });
        expect(useAuthStore.getState().user?.isPremium).toBe(true);
        await act(async () => { useAuthStore.setState({ user: user('b'), sessionRevision: 4, isAuthenticated: false }); next.resolve(normalizeEntitlements({ account: { isPremium: false } })); await tick(); });
        expect(useAuthStore.getState().user).toMatchObject({ id: 'b', isPremium: true });
    });
});
