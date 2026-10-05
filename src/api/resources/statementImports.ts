import apiClient from '../client';
import {
    StatementConfirmResult,
    StatementCorrectPaymentPayload,
    StatementPaymentMutationResult,
    StatementPaymentWritePayload,
    StatementRevertResult,
    StatementRowPatch,
    StatementVoidPaymentPayload,
    StatementImportCreateResponse,
    StatementImportDetail,
    StatementImportListResponse,
    StatementImportsQuery,
    StatementUploadFile,
} from '../../types/statementImports';
import {
    normalizeStatementConfirm,
    normalizeStatementPaymentMutation,
    normalizeStatementRevert,
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

    /** Saves reviewed rows; `version` must be the import's current version. */
    updateRows: async (
        id: string,
        version: number,
        rows: StatementRowPatch[],
    ): Promise<StatementImportDetail> => {
        const { data } = await apiClient.patch(`/statement-imports/${id}/rows`, { version, rows });
        return normalizeStatementDetail(data);
    },

    confirm: async (id: string, version: number): Promise<StatementConfirmResult> => {
        const { data } = await apiClient.post(`/statement-imports/${id}/confirm`, { version });
        return normalizeStatementConfirm(data);
    },

    revert: async (id: string, version: number): Promise<StatementRevertResult> => {
        const { data } = await apiClient.post(`/statement-imports/${id}/revert`, { version });
        return normalizeStatementRevert(data);
    },

    resume: async (id: string, version: number): Promise<StatementImportDetail> => {
        const { data } = await apiClient.post(`/statement-imports/${id}/resume`, { version });
        return normalizeStatementDetail(data);
    },

    remove: async (id: string): Promise<void> => {
        await apiClient.delete(`/statement-imports/${id}`);
    },

    createPayment: async (
        id: string,
        payload: StatementPaymentWritePayload,
    ): Promise<StatementPaymentMutationResult> => {
        const { data } = await apiClient.post(`/statement-imports/${id}/payments`, payload);
        return normalizeStatementPaymentMutation(data);
    },

    correctPayment: async (
        paymentId: string,
        payload: StatementCorrectPaymentPayload,
    ): Promise<StatementPaymentMutationResult> => {
        const { data } = await apiClient.post(
            `/statement-payments/${paymentId}/corrections`,
            payload,
        );
        return normalizeStatementPaymentMutation(data);
    },

    voidPayment: async (
        paymentId: string,
        payload: StatementVoidPaymentPayload,
    ): Promise<StatementPaymentMutationResult> => {
        const { data } = await apiClient.post(`/statement-payments/${paymentId}/void`, payload);
        return normalizeStatementPaymentMutation(data);
    },
};
