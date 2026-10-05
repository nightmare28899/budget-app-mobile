import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const mockAuthState = {
    isAuthenticated: true,
    accessToken: 'old-access',
    refreshToken: 'old-refresh',
    setTokens: jest.fn(),
    logout: jest.fn(),
};

jest.mock('../../src/store/authStore', () => ({
    useAuthStore: { getState: () => mockAuthState },
}));
jest.mock('../../src/navigation/navigationBridge', () => ({
    openPremiumPaywall: jest.fn(),
}));
jest.mock('../../src/components/alerts/alertBridge', () => ({
    showGlobalAlert: jest.fn(),
}));

import apiClient, { SessionRefreshError } from '../../src/api/client';

const { openPremiumPaywall } = jest.requireMock('../../src/navigation/navigationBridge') as {
    openPremiumPaywall: jest.Mock;
};
const { showGlobalAlert } = jest.requireMock('../../src/components/alerts/alertBridge') as {
    showGlobalAlert: jest.Mock;
};

function httpError(
    config: InternalAxiosRequestConfig,
    status: number,
    data: unknown = {},
) {
    return new AxiosError(
        `status ${status}`,
        'ERR_BAD_REQUEST',
        config,
        {},
        { status, data, statusText: '', headers: {}, config },
    );
}

const bareConfig = { headers: {} } as InternalAxiosRequestConfig;

let adapterCalls: InternalAxiosRequestConfig[];
let handler: (config: InternalAxiosRequestConfig) => Promise<unknown>;

beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    mockAuthState.isAuthenticated = true;
    mockAuthState.accessToken = 'old-access';
    mockAuthState.refreshToken = 'old-refresh';
    mockAuthState.setTokens.mockImplementation((a: string, r: string) => {
        mockAuthState.accessToken = a;
        mockAuthState.refreshToken = r;
    });
    adapterCalls = [];
    apiClient.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
        adapterCalls.push(config);
        return handler(config) as never;
    };
});

const ok = (config: InternalAxiosRequestConfig, data: unknown = { ok: true }) => ({
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
});

const rotated = { data: { accessToken: 'new-access', refreshToken: 'new-refresh' } };

describe('401 refresh flow', () => {
    it('refreshes then retries once and persists rotated tokens', async () => {
        const post = jest.spyOn(axios, 'post').mockResolvedValue(rotated);
        handler = async (config) => {
            if (config.headers.Authorization === 'Bearer new-access') {
                return ok(config);
            }
            throw httpError(config, 401);
        };

        const res = await apiClient.get('/expenses');

        expect(res.data).toEqual({ ok: true });
        expect(post).toHaveBeenCalledTimes(1);
        expect(post.mock.calls[0][1]).toEqual({ refreshToken: 'old-refresh' });
        expect(post.mock.calls[0][2]).toMatchObject({ timeout: 15000 });
        expect(mockAuthState.setTokens).toHaveBeenCalledWith('new-access', 'new-refresh');
        expect(adapterCalls).toHaveLength(2);
        expect(showGlobalAlert).not.toHaveBeenCalled();
        expect(mockAuthState.logout).not.toHaveBeenCalled();
    });

    it('does not loop when the retried request is still 401', async () => {
        jest.spyOn(axios, 'post').mockResolvedValue(rotated);
        handler = async (config) => {
            throw httpError(config, 401);
        };

        await expect(apiClient.get('/expenses')).rejects.toBeTruthy();
        expect(adapterCalls).toHaveLength(2);
    });

    it('concurrent 401s share one refresh', async () => {
        let resolveRefresh!: (v?: unknown) => void;
        const post = jest.spyOn(axios, 'post').mockImplementation(
            () => new Promise((resolve) => { resolveRefresh = resolve as (v?: unknown) => void; }),
        );
        handler = async (config) => {
            if (config.headers.Authorization === 'Bearer new-access') {
                return ok(config);
            }
            throw httpError(config, 401);
        };

        const all = Promise.all([
            apiClient.get('/a'),
            apiClient.get('/b'),
            apiClient.get('/c'),
        ]);
        await new Promise<void>((r) => setTimeout(r, 20));
        resolveRefresh(rotated);
        const results = await all;

        expect(results).toHaveLength(3);
        expect(post).toHaveBeenCalledTimes(1);
        expect(mockAuthState.setTokens).toHaveBeenCalledTimes(1);
    });

    it('refresh rejected with 401 logs out without any alert', async () => {
        jest.spyOn(axios, 'post').mockRejectedValue(httpError(bareConfig, 401));
        handler = async (config) => {
            throw httpError(config, 401);
        };

        await expect(apiClient.get('/expenses')).rejects.toBeInstanceOf(SessionRefreshError);
        expect(mockAuthState.logout).toHaveBeenCalledTimes(1);
        expect(showGlobalAlert).not.toHaveBeenCalled();
        expect(mockAuthState.setTokens).not.toHaveBeenCalled();
    });

    it('refresh network error is transient: no logout, retryable error', async () => {
        jest.spyOn(axios, 'post').mockRejectedValue(
            new AxiosError('Network Error', 'ERR_NETWORK'),
        );
        handler = async (config) => {
            throw httpError(config, 401);
        };

        const err = await apiClient.get('/expenses').catch((e) => e);
        expect(err).toBeInstanceOf(SessionRefreshError);
        expect(err.transient).toBe(true);
        expect(mockAuthState.logout).not.toHaveBeenCalled();
    });

    it('refresh 5xx is transient', async () => {
        jest.spyOn(axios, 'post').mockRejectedValue(httpError(bareConfig, 503));
        handler = async (config) => {
            throw httpError(config, 401);
        };

        await expect(apiClient.get('/x')).rejects.toMatchObject({ transient: true });
        expect(mockAuthState.logout).not.toHaveBeenCalled();
    });

    it('guests do not trigger refresh', async () => {
        mockAuthState.isAuthenticated = false;
        const post = jest.spyOn(axios, 'post');
        handler = async (config) => {
            throw httpError(config, 401);
        };

        await expect(apiClient.get('/x')).rejects.toBeTruthy();
        expect(post).not.toHaveBeenCalled();
    });
});

describe('premium 403 handling', () => {
    let now: jest.SpyInstance;
    let clock = 1e12;

    beforeEach(() => {
        // each test starts well outside the previous dedupe window
        clock += 60_000;
        now = jest.spyOn(Date, 'now').mockImplementation(() => clock);
    });
    afterEach(() => now.mockRestore());

    const premium403 = (feature?: string) => async (config: InternalAxiosRequestConfig) => {
        throw httpError(config, 403, { code: 'PREMIUM_REQUIRED', feature });
    };

    it.each([
        ['credit_cards_catalog', 'credit_cards'],
        ['installment_expenses', 'installments'],
        ['statement_imports', 'generic'],
        [undefined, 'generic'],
    ])('maps feature %s to %s', async (feature, expected) => {
        handler = premium403(feature);

        await expect(apiClient.get('/premium')).rejects.toBeTruthy();
        expect(openPremiumPaywall).toHaveBeenCalledWith(expected);
    });

    it('dedupes repeated 403s inside the window', async () => {
        handler = premium403('credit_cards');

        await apiClient.get('/a').catch(() => undefined);
        await apiClient.get('/b').catch(() => undefined);
        expect(openPremiumPaywall).toHaveBeenCalledTimes(1);

        clock += 10_000;
        await apiClient.get('/c').catch(() => undefined);
        expect(openPremiumPaywall).toHaveBeenCalledTimes(2);
    });

    it('background requests never open the paywall', async () => {
        handler = premium403('credit_cards');

        await apiClient.get('/a', { meta: { background: true } }).catch(() => undefined);
        expect(openPremiumPaywall).not.toHaveBeenCalled();
    });
});
