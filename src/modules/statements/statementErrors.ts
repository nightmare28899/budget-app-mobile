import {
    extractApiMessage,
    extractPremiumRequiredError,
    getApiErrorData,
    isApiRecord,
} from '../../utils/platform/api';

export type StatementErrorKind =
    | 'cycleConflict'
    | 'staleVersion'
    | 'reconciliation'
    | 'pendingRows'
    | 'adjustmentNote'
    | 'noExpenses'
    | 'notReviewable'
    | 'revertFirst'
    | 'hasPayments'
    | 'idempotency'
    | 'alreadyPaid'
    | 'network'
    | 'premium'
    | 'throttled'
    | 'other';

export type StatementError = {
    kind: StatementErrorKind;
    /** Raw backend text, shown when no localized text exists. */
    message: string | null;
};

const MESSAGE_RULES: Array<[RegExp, StatementErrorKind]> = [
    [/version is stale|payment version is stale|changed concurrently|changed during processing/i, 'staleVersion'],
    [/reconciliation must pass/i, 'reconciliation'],
    [/must be reviewed before confirmation/i, 'pendingRows'],
    [/accounting adjustment requires a decision note/i, 'adjustmentNote'],
    [/at least one statement row must be included/i, 'noExpenses'],
    [/not awaiting review/i, 'notReviewable'],
    [/revert this statement before deleting/i, 'revertFirst'],
    [/payment history cannot be deleted/i, 'hasPayments'],
    [/idempotency key is already in use/i, 'idempotency'],
    [/already fully paid/i, 'alreadyPaid'],
];

/** Maps an axios error from the statement endpoints to a stable kind the UI can localize. */
export function classifyStatementError(error: unknown): StatementError {
    const record = isApiRecord(error) ? error : {};
    const response = isApiRecord(record.response) ? record.response : null;
    if (!response) {
        return { kind: 'network', message: null };
    }

    const data = getApiErrorData(error);
    if (extractPremiumRequiredError(data)) {
        return { kind: 'premium', message: null };
    }

    const message = extractApiMessage(data);
    if (isApiRecord(data) && data.code === 'STATEMENT_CYCLE_CONFLICT') {
        return { kind: 'cycleConflict', message };
    }
    if (response.status === 429) {
        return { kind: 'throttled', message };
    }
    const rule = message ? MESSAGE_RULES.find(([pattern]) => pattern.test(message)) : undefined;
    return { kind: rule ? rule[1] : 'other', message };
}

/** True when the cached detail is out of date and must be refetched before retrying. */
export function isStaleStatementError(error: StatementError): boolean {
    return error.kind === 'staleVersion' || error.kind === 'notReviewable';
}
