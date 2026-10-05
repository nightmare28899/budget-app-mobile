export {};

jest.mock('../../src/api/client', () => ({
    __esModule: true,
    default: { get: jest.fn(), post: jest.fn() },
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

const { statementImportsApi } =
    require('../../src/api/resources/statementImports') as typeof import('../../src/api/resources/statementImports');

const mockApiClient = jest.requireMock('../../src/api/client').default as {
    get: jest.Mock;
    post: jest.Mock;
};

describe('statementImportsApi', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('lists with pagination and only the filters that are set', async () => {
        mockApiClient.get.mockResolvedValueOnce({
            data: { items: [], page: 1, limit: 20, total: 0, totalPages: 0 },
        });

        await statementImportsApi.list({ creditCardId: 'card-1', status: 'NEEDS_REVIEW', page: 2 });

        expect(mockApiClient.get).toHaveBeenCalledWith('/statement-imports', {
            params: { page: 2, limit: 20, status: 'NEEDS_REVIEW', creditCardId: 'card-1' },
        });
    });

    it('omits empty filters', async () => {
        mockApiClient.get.mockResolvedValueOnce({ data: {} });

        await statementImportsApi.list();

        expect(mockApiClient.get).toHaveBeenCalledWith('/statement-imports', {
            params: { page: 1, limit: 20 },
        });
    });

    it('uploads multipart with file and creditCardId and a 60 s timeout', async () => {
        mockApiClient.post.mockResolvedValueOnce({
            data: { id: 'imp-1', status: 'NEEDS_REVIEW', version: 1, warningCount: 0, duplicate: false },
        });

        const result = await statementImportsApi.upload(
            { uri: 'file:///tmp/a.pdf', name: 'a.pdf', type: 'application/pdf' },
            'card-1',
        );

        const [url, body, config] = mockApiClient.post.mock.calls[0];
        expect(url).toBe('/statement-imports');
        expect((body as TestFormData)._parts).toEqual([
            ['file', { uri: 'file:///tmp/a.pdf', name: 'a.pdf', type: 'application/pdf' }],
            ['creditCardId', 'card-1'],
        ]);
        expect(config.timeout).toBe(60000);
        expect(result.id).toBe('imp-1');
        expect(result.status).toBe('NEEDS_REVIEW');
    });

    it('reports upload progress as a fraction', async () => {
        mockApiClient.post.mockImplementationOnce(
            async (_url: string, _body: unknown, config: { onUploadProgress: (e: object) => void }) => {
                config.onUploadProgress({ loaded: 50, total: 200 });
                return { data: { id: 'imp-2' } };
            },
        );
        const onProgress = jest.fn();

        await statementImportsApi.upload(
            { uri: 'file:///a.pdf', name: 'a.pdf', type: 'application/pdf' },
            'card-1',
            onProgress,
        );

        expect(onProgress).toHaveBeenCalledWith(0.25);
    });

    it('gets one import and retries processing', async () => {
        mockApiClient.get.mockResolvedValueOnce({ data: { id: 'imp-1', rows: [{}, {}] } });
        mockApiClient.post.mockResolvedValueOnce({ data: { id: 'imp-1', status: 'NEEDS_REVIEW' } });

        const detail = await statementImportsApi.getOne('imp-1');
        const retried = await statementImportsApi.process('imp-1');

        expect(mockApiClient.get).toHaveBeenCalledWith('/statement-imports/imp-1');
        expect(detail.rowCount).toBe(2);
        expect(mockApiClient.post).toHaveBeenCalledWith('/statement-imports/imp-1/process');
        expect(retried.status).toBe('NEEDS_REVIEW');
    });
});
