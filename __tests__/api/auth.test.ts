jest.mock('../../src/api/client', () => ({
    __esModule: true,
    default: { post: jest.fn() },
}));

class TestFormData {
    _parts: Array<[string, unknown]> = [];

    append(name: string, value: unknown) {
        this._parts.push([name, value]);
    }
}

Object.defineProperty(globalThis, 'FormData', {
    configurable: true,
    value: TestFormData,
    writable: true,
});

const { authApi } = require('../../src/api/auth') as typeof import('../../src/api/auth');

const mockApiClient = jest.requireMock('../../src/api/client').default as {
    post: jest.Mock;
};

const userResponse = {
    id: 'user-1',
    email: 'user@example.com',
    name: 'Budget User',
    role: 'user',
};

describe('authApi', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('logs in through the JSON endpoint and normalizes the user', async () => {
        mockApiClient.post.mockResolvedValueOnce({
            data: {
                user: userResponse,
                accessToken: 'access-token',
                refreshToken: 'refresh-token',
            },
        });

        await expect(authApi.login('user@example.com', 'password')).resolves.toMatchObject({
            user: userResponse,
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
        });

        expect(mockApiClient.post).toHaveBeenCalledWith('/auth/login', {
            email: 'user@example.com',
            password: 'password',
        });
    });

    it('registers without an avatar using the JSON payload', async () => {
        mockApiClient.post.mockResolvedValueOnce({
            data: {
                user: userResponse,
                accessToken: 'access-token',
                refreshToken: 'refresh-token',
            },
        });

        await authApi.register(
            'user@example.com',
            'Budget User',
            'password',
            undefined,
            'user',
            true,
        );

        expect(mockApiClient.post).toHaveBeenCalledWith('/auth/register', {
            email: 'user@example.com',
            name: 'Budget User',
            password: 'password',
            role: 'user',
            termsAccepted: true,
        });
    });

    it('registers with an avatar using multipart data', async () => {
        mockApiClient.post.mockResolvedValueOnce({
            data: {
                user: userResponse,
                accessToken: 'access-token',
                refreshToken: 'refresh-token',
            },
        });

        await authApi.register(
            'user@example.com',
            'Budget User',
            'password',
            { uri: 'file:///tmp/avatar.png', name: 'avatar.png' },
        );

        const [, body] = mockApiClient.post.mock.calls[0];
        expect(mockApiClient.post).toHaveBeenCalledWith('/auth/register', body);
        expect(body).toBeInstanceOf(FormData);

        const parts = (body as TestFormData)._parts;
        expect(parts).toEqual(expect.arrayContaining([
            ['email', 'user@example.com'],
            ['name', 'Budget User'],
            ['password', 'password'],
            ['role', 'user'],
            ['termsAccepted', 'true'],
        ]));

        const avatarPart = parts.find(([key]) => key === 'avatar');
        expect(avatarPart?.[1]).toMatchObject({
            uri: 'file:///tmp/avatar.png',
            name: 'avatar.png',
            type: 'image/png',
        });
    });

    it('propagates API errors to the caller', async () => {
        const error = Object.assign(new Error('Invalid credentials'), {
            response: { status: 401, data: { message: 'Invalid credentials' } },
        });
        mockApiClient.post.mockRejectedValueOnce(error);

        await expect(authApi.login('user@example.com', 'wrong-password'))
            .rejects.toBe(error);
    });
});
