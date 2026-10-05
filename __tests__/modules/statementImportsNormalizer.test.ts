import {
    normalizeStatementCreateResponse,
    normalizeStatementDetail,
    normalizeStatementListItem,
    normalizeStatementListResponse,
} from '../../src/modules/statements/statementNormalizer';

const listItem = {
    id: 'imp-1',
    creditCardId: 'card-1',
    sourceFileName: 'banamex-sep.pdf',
    sourceFormat: 'PDF',
    status: 'NEEDS_REVIEW',
    periodStart: '2026-08-15T00:00:00.000Z',
    periodEnd: '2026-09-14T00:00:00.000Z',
    version: 2,
    warningCount: 3,
    isPaid: false,
    paymentStatus: 'PARTIAL',
    reconciliation: { closingBalance: '12345.60', currency: 'MXN', status: 'PASSED' },
    paymentSummary: {
        currency: 'MXN',
        closingBalance: '12345.60',
        paidTotal: '500',
        paymentStatus: 'PARTIAL',
        isPaid: false,
        remainingStatement: '11845.60',
        noInterestTarget: '9000',
        currentPaymentDue: '9000',
        dueDate: '2026-10-04',
        overpaid: 0,
        integrityFlags: {},
    },
    createdAt: '2026-09-20T10:00:00.000Z',
    updatedAt: '2026-09-20T10:05:00.000Z',
};

describe('normalizeStatementListItem', () => {
    it('coerces money strings to numbers and keeps identifiers', () => {
        const item = normalizeStatementListItem(listItem);

        expect(item.id).toBe('imp-1');
        expect(item.creditCardId).toBe('card-1');
        expect(item.status).toBe('NEEDS_REVIEW');
        expect(item.closingBalance).toBe(12345.6);
        expect(item.currency).toBe('MXN');
        expect(item.paymentSummary.paidTotal).toBe(500);
        expect(item.paymentSummary.remainingStatement).toBe(11845.6);
        expect(item.paymentSummary.dueDate).toBe('2026-10-04');
        expect(item.paymentStatus).toBe('PARTIAL');
    });

    it('falls back safely on missing or unknown values', () => {
        const item = normalizeStatementListItem({ id: 'x', status: 'WEIRD' });

        expect(item.status).toBe('UPLOADED');
        expect(item.closingBalance).toBeNull();
        expect(item.currency).toBeNull();
        expect(item.creditCardId).toBeNull();
        expect(item.paymentStatus).toBe('UNPAID');
        expect(item.paymentSummary.paidTotal).toBe(0);
        expect(item.paymentSummary.remainingStatement).toBeNull();
        expect(item.warningCount).toBe(0);
    });
});

describe('normalizeStatementListResponse', () => {
    it('normalizes pagination and items', () => {
        const response = normalizeStatementListResponse({
            items: [listItem],
            page: 2,
            limit: 20,
            total: 21,
            totalPages: 2,
        });

        expect(response.items).toHaveLength(1);
        expect(response.page).toBe(2);
        expect(response.totalPages).toBe(2);
    });

    it('returns an empty page for malformed payloads', () => {
        const response = normalizeStatementListResponse(null);

        expect(response.items).toEqual([]);
        expect(response.page).toBe(1);
        expect(response.totalPages).toBe(1);
    });
});

describe('normalizeStatementCreateResponse', () => {
    it('maps the upload response', () => {
        const response = normalizeStatementCreateResponse({
            id: 'imp-9',
            status: 'FAILED',
            version: 1,
            warningCount: 0,
            failureCode: 'PARSE_ERROR',
            failureMessage: 'Unsupported layout',
            duplicate: false,
        });

        expect(response).toEqual({
            id: 'imp-9',
            status: 'FAILED',
            version: 1,
            warningCount: 0,
            failureCode: 'PARSE_ERROR',
            failureMessage: 'Unsupported layout',
            duplicate: false,
        });
    });

    it('treats duplicate only when explicitly true', () => {
        expect(normalizeStatementCreateResponse({ id: 'a', duplicate: true }).duplicate).toBe(true);
        expect(normalizeStatementCreateResponse({ id: 'a' }).duplicate).toBe(false);
    });
});

describe('normalizeStatementDetail', () => {
    it('summarizes rows, warnings, targets and the card', () => {
        const detail = normalizeStatementDetail({
            ...listItem,
            sourceMimeType: 'application/pdf',
            sourceSizeBytes: 2048,
            failureCode: null,
            failureMessage: null,
            adjustmentCount: 1,
            creditCard: {
                id: 'card-1',
                name: 'Oro',
                bank: 'Banamex',
                brand: 'VISA',
                last4: '1234',
                currency: 'MXN',
            },
            reconciliation: {
                currency: 'MXN',
                closingBalance: '12345.60',
                status: 'FAILED',
                message: 'Off by 1.00',
            },
            paymentTargets: [
                {
                    id: 't1',
                    kind: 'NO_INTEREST',
                    label: 'Pago para no generar intereses',
                    amount: '9000.00',
                    currency: 'MXN',
                    dueDate: '2026-10-04',
                },
            ],
            rows: [
                { id: 'r1', warningCodes: ['MISSING_DATE', 'LOW_CONFIDENCE'] },
                { id: 'r2', warningCodes: ['MISSING_DATE'] },
                { id: 'r3', warningCodes: null },
            ],
        });

        expect(detail.rowCount).toBe(3);
        expect(detail.adjustmentCount).toBe(1);
        expect(detail.warningCodes.sort()).toEqual(['LOW_CONFIDENCE', 'MISSING_DATE']);
        expect(detail.reconciliation?.status).toBe('FAILED');
        expect(detail.reconciliation?.closingBalance).toBe(12345.6);
        expect(detail.paymentTargets[0].amount).toBe(9000);
        expect(detail.creditCard?.last4).toBe('1234');
        expect(detail.sourceSizeBytes).toBe(2048);
    });

    it('handles detail without rows or card', () => {
        const detail = normalizeStatementDetail({ id: 'z', status: 'FAILED', failureMessage: 'boom' });

        expect(detail.rowCount).toBe(0);
        expect(detail.creditCard).toBeNull();
        expect(detail.reconciliation).toBeNull();
        expect(detail.paymentTargets).toEqual([]);
        expect(detail.failureMessage).toBe('boom');
    });
});
