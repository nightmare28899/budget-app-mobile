import {
    MAX_STATEMENT_FILE_BYTES,
    classifyStatementUploadError,
    validateStatementFile,
} from '../../src/modules/statements/statementFile';
import { extractPremiumRequiredError } from '../../src/utils/platform/api';

describe('validateStatementFile', () => {
    it('accepts a PDF by mime type', () => {
        expect(
            validateStatementFile({ name: 'a', type: 'application/pdf', size: 1000 }),
        ).toEqual({ ok: true });
    });

    it('accepts a PDF by extension when the mime type is missing', () => {
        expect(
            validateStatementFile({ name: 'Statement.PDF', type: null, size: 1000 }),
        ).toEqual({ ok: true });
    });

    it('rejects non PDF files', () => {
        expect(
            validateStatementFile({ name: 'photo.png', type: 'image/png', size: 1000 }),
        ).toEqual({ ok: false, reason: 'invalidType' });
    });

    it('rejects files over 10 MB and accepts exactly 10 MB', () => {
        expect(
            validateStatementFile({
                name: 'a.pdf',
                type: 'application/pdf',
                size: MAX_STATEMENT_FILE_BYTES + 1,
            }),
        ).toEqual({ ok: false, reason: 'tooLarge' });
        expect(
            validateStatementFile({
                name: 'a.pdf',
                type: 'application/pdf',
                size: MAX_STATEMENT_FILE_BYTES,
            }),
        ).toEqual({ ok: true });
    });

    it('rejects empty files and tolerates unknown size', () => {
        expect(
            validateStatementFile({ name: 'a.pdf', type: 'application/pdf', size: 0 }),
        ).toEqual({ ok: false, reason: 'empty' });
        expect(
            validateStatementFile({ name: 'a.pdf', type: 'application/pdf', size: null }),
        ).toEqual({ ok: true });
    });
});

describe('classifyStatementUploadError', () => {
    const http = (status: number, message?: string) => ({
        response: { status, data: message ? { message } : undefined },
    });

    it('maps HTTP statuses', () => {
        expect(classifyStatementUploadError(http(409)).kind).toBe('duplicate');
        expect(classifyStatementUploadError(http(413)).kind).toBe('tooLarge');
        expect(classifyStatementUploadError(http(429)).kind).toBe('throttled');
        expect(classifyStatementUploadError(http(400, 'Only PDF')).kind).toBe('invalid');
        expect(classifyStatementUploadError(http(400, 'Only PDF')).message).toBe('Only PDF');
        expect(classifyStatementUploadError(http(500)).kind).toBe('unknown');
    });

    it('detects premium-required payloads so the caller can stay silent', () => {
        const error = {
            response: { status: 403, data: { code: 'PREMIUM_REQUIRED', feature: 'statement_imports' } },
        };
        expect(classifyStatementUploadError(error).kind).toBe('premium');
    });

    it('maps timeouts and network failures', () => {
        expect(classifyStatementUploadError({ code: 'ECONNABORTED' }).kind).toBe('timeout');
        expect(
            classifyStatementUploadError({ message: 'Network Error' }).kind,
        ).toBe('network');
    });
});

describe('extractPremiumRequiredError', () => {
    it.each([
        ['credit_cards_catalog', 'credit_cards'],
        ['installment_expenses', 'installments'],
        ['statement_imports', 'statement_imports'],
    ] as const)('maps the backend feature %s to %s', (feature, expected) => {
        expect(
            extractPremiumRequiredError({ code: 'PREMIUM_REQUIRED', feature })?.feature,
        ).toBe(expected);
    });
});
