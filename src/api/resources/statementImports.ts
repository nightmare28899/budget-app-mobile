import apiClient from '../client';
import {
    StatementImportCreateResponse,
    StatementImportDetail,
    StatementImportListResponse,
    StatementImportsQuery,
    StatementUploadFile,
} from '../../types/statementImports';
import {
    normalizeStatementCreateResponse,
    normalizeStatementDetail,
    normalizeStatementListResponse,
} from '../../modules/statements/statementNormalizer';
import { STATEMENT_UPLOAD_TIMEOUT_MS } from '../../modules/statements/statementFile';
import { toMultipartFileValue } from '../../utils/platform/api';

/** Server-only: parsing needs the backend, so there is no guest/local branch. */
export const statementImportsApi = {
    list: async (query: StatementImportsQuery = {}): Promise<StatementImportListResponse> => {
        const { data } = await apiClient.get('/statement-imports', {
            params: {
                page: query.page ?? 1,
                limit: query.limit ?? 20,
                ...(query.status ? { status: query.status } : {}),
                ...(query.creditCardId ? { creditCardId: query.creditCardId } : {}),
            },
        });
        return normalizeStatementListResponse(data);
    },

    getOne: async (id: string): Promise<StatementImportDetail> => {
        const { data } = await apiClient.get(`/statement-imports/${id}`);
        return normalizeStatementDetail(data);
    },

    upload: async (
        file: StatementUploadFile,
        creditCardId: string,
        onProgress?: (fraction: number) => void,
    ): Promise<StatementImportCreateResponse> => {
        const formData = new FormData();
        formData.append('file', toMultipartFileValue(file));
        formData.append('creditCardId', creditCardId);

        // Parsing is synchronous in the response, so the default 15 s is too short.
        const { data } = await apiClient.post('/statement-imports', formData, {
            timeout: STATEMENT_UPLOAD_TIMEOUT_MS,
            onUploadProgress: event => {
                if (onProgress && event.total) {
                    onProgress(Math.min(1, event.loaded / event.total));
                }
            },
        });
        return normalizeStatementCreateResponse(data);
    },

    /** Retries parsing of an UPLOADED/FAILED import; throttled to 5 per minute. */
    process: async (id: string): Promise<StatementImportDetail> => {
        const { data } = await apiClient.post(`/statement-imports/${id}/process`);
        return normalizeStatementDetail(data);
    },
};
