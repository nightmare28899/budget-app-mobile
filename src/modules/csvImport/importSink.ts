import { extractApiMessage, getApiErrorData, getErrorMessage } from '../../utils/platform/api';
import type { CreateExpensePayload } from '../../types/index';
import { ExpenseDraft, ImportSessionChanged, ImportSink } from './csvTypes';

export type ExpenseSinkDeps = {
    /** Creates one expense; resolves with the created record (or its first row). */
    create: (payload: CreateExpensePayload) => Promise<{ id?: string } | undefined>;
    /** False once the session that started the import is gone (logout, account switch). */
    isSessionValid: () => boolean;
};

export function draftToPayload(draft: ExpenseDraft): CreateExpensePayload {
    const payload: CreateExpensePayload = {
        title: draft.title,
        cost: draft.cost,
        currency: draft.currency,
        date: draft.date,
    };
    if (draft.merchantName) payload.merchantName = draft.merchantName;
    if (draft.note) payload.note = draft.note;
    if (draft.paymentMethod) payload.paymentMethod = draft.paymentMethod;
    if (draft.categoryId) payload.categoryId = draft.categoryId;
    return payload;
}

/** An axios failure without a response (timeout, network drop, abort): the POST may still have landed. */
function hasNoHttpResponse(error: unknown): boolean {
    const candidate = error as { isAxiosError?: boolean; response?: unknown } | null;
    return candidate?.isAxiosError === true && !candidate.response;
}

/**
 * Writes each row through the expenses API, which stores locally for guests and on the server for accounts. A row
 * is confirmed as soon as the create call resolves; a call that fails with an http response rejects only that row and leaves it retryable, while one that
 * fails without any response is reported as `unknown` because the row may exist already.
 */
export function createExpenseSink({ create, isSessionValid }: ExpenseSinkDeps): ImportSink {
    return {
        async accept(draft) {
            if (!isSessionValid()) {
                throw new ImportSessionChanged();
            }
            try {
                const created = await create(draftToPayload(draft));
                return { kind: 'accepted', handle: created?.id ?? '' };
            } catch (error) {
                const reason =
                    extractApiMessage(getApiErrorData(error)) ?? getErrorMessage(error) ?? 'unknown';
                return { kind: hasNoHttpResponse(error) ? 'unknown' : 'rejected', reason };
            }
        },
        async settle(handles) {
            return Object.fromEntries(handles.map((h) => [h, { kind: 'confirmed' as const }]));
        },
    };
}
