import {
    extractApiMessage,
    extractPremiumRequiredError,
    isApiRecord,
} from '../../utils/platform/api';

export const MAX_STATEMENT_FILE_BYTES = 10 * 1024 * 1024;
export const STATEMENT_UPLOAD_TIMEOUT_MS = 60_000;

export type StatementFileCandidate = {
    name: string | null;
    type: string | null;
    size: number | null;
};

export type StatementFileValidation =
    | { ok: true }
    | { ok: false; reason: 'invalidType' | 'tooLarge' | 'empty' };

/** Mirrors the web rules: PDF by mime or extension, at most 10 MB. */
export function validateStatementFile(file: StatementFileCandidate): StatementFileValidation {
    const hasPdfExtension = (file.name ?? '').toLowerCase().endsWith('.pdf');
    if (file.type !== 'application/pdf' && !hasPdfExtension) {
        return { ok: false, reason: 'invalidType' };
    }
    if (file.size != null && file.size <= 0) {
        return { ok: false, reason: 'empty' };
    }
    if (file.size != null && file.size > MAX_STATEMENT_FILE_BYTES) {
        return { ok: false, reason: 'tooLarge' };
    }
    return { ok: true };
}

export type StatementUploadErrorKind =
    | 'duplicate'
    | 'cycleConflict'
    | 'tooLarge'
    | 'invalid'
    | 'throttled'
    | 'premium'
    | 'timeout'
    | 'network'
    | 'unknown';

export type StatementUploadError = {
    kind: StatementUploadErrorKind;
    /** Backend message, when it sent one worth showing. */
    message: string | null;
};

export function classifyStatementUploadError(error: unknown): StatementUploadError {
    const record = isApiRecord(error) ? error : {};
    const response = isApiRecord(record.response) ? record.response : null;

    if (!response) {
        if (record.code === 'ECONNABORTED' || record.code === 'ETIMEDOUT') {
            return { kind: 'timeout', message: null };
        }
        return { kind: 'network', message: null };
    }

    if (extractPremiumRequiredError(response.data)) {
        return { kind: 'premium', message: null };
    }

    const message = extractApiMessage(response.data);
    if (isApiRecord(response.data) && response.data.code === 'STATEMENT_CYCLE_CONFLICT') {
        return { kind: 'cycleConflict', message };
    }
    switch (response.status) {
        case 409:
            return { kind: 'duplicate', message };
        case 413:
            return { kind: 'tooLarge', message };
        case 429:
            return { kind: 'throttled', message };
        case 400:
            return { kind: 'invalid', message };
        default:
            return { kind: 'unknown', message };
    }
}
