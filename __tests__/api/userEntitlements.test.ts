jest.mock('../../src/api/client', () => ({ __esModule: true, default: { get: jest.fn() } }));
jest.mock('../../src/modules/access/localMode', () => ({ isLocalMode: () => false }));
jest.mock('../../src/store/authStore', () => ({ useAuthStore: { getState: jest.fn() } }));
import apiClient from '../../src/api/client';
import { usersApi } from '../../src/api/resources/users';

it('uses authenticated backend entitlement contract and normalizes disabled access', async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: { account: { isPremium: 'true', isDisabled: 'true' } } });
    expect(await usersApi.getEntitlements()).toMatchObject({ accountKnown: true, isPremium: true, isDisabled: true });
    expect(apiClient.get).toHaveBeenCalledWith('/users/me/entitlements', { meta: { background: true } });
});
