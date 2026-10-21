import { useCallback, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { statementImportsApi } from '../../api/resources/statementImports';
import { classifyStatementError } from '../../modules/statements/statementErrors';
import { PaymentIntentKeys, paymentFingerprint } from '../../modules/statements/paymentIntentKeys';
import type { StatementPaymentMutationResult } from '../../types/statementImports';
import { detailQueryKey, type StatementActionResult } from './useStatementActions';

export type PaymentFormValue = {
    amount: number;
    currency: string;
    paidAt: string;
    note?: string;
};

/**
 * Payments ledger writes. Every write sends the detail's current paymentVersion; after any
 * outcome the detail is refetched so a stale version can never be reused.
 */
export function useStatementPayments(statementId: string, paymentVersion: number) {
    const queryClient = useQueryClient();
    const context = useRef({
        statementId, keys: new PaymentIntentKeys(), version: paymentVersion,
        needsRefresh: false, working: false,
    });
    if (context.current.statementId !== statementId) {
        context.current = { statementId, keys: new PaymentIntentKeys(), version: paymentVersion, needsRefresh: false, working: false };
    }
    // Each async closure owns its ledger context. A previous route's delayed response must
    // never change the version, key or working state of the next statement.
    const ledger = context.current;
    ledger.version = Math.max(ledger.version, paymentVersion);
    const [refreshing, setRefreshing] = useState({ statementId, working: false });

    const refresh = useCallback(async () => {
        const detail = await queryClient.fetchQuery({
            queryKey: detailQueryKey(statementId),
            queryFn: () => statementImportsApi.getOne(statementId),
            staleTime: 0,
        });
        ledger.version = detail.paymentVersion;
        ledger.needsRefresh = false;
        // A list refresh must never turn an acknowledged payment into a failed write.
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['statementImports', 'list'] }),
            queryClient.invalidateQueries({ queryKey: ['creditCards'] }),
        ]).catch(() => undefined);
    }, [queryClient, statementId, ledger]);

    const run = useCallback(
        async (
            action: () => Promise<StatementPaymentMutationResult>,
        ): Promise<StatementActionResult<StatementPaymentMutationResult>> => {
            if (ledger.working) { return { ok: false, error: { kind: 'staleVersion', message: null } }; }
            ledger.working = true;
            if (context.current === ledger) { setRefreshing({ statementId, working: true }); }
            try {
                if (ledger.needsRefresh) {
                    try { await refresh(); }
                    catch { return { ok: false, error: { kind: 'network', message: null } }; }
                }
                let outcome: StatementActionResult<StatementPaymentMutationResult>;
                try {
                    const data = await action();
                    ledger.keys.onSuccess();
                    ledger.version = data.paymentVersion;
                    outcome = { ok: true, data };
                } catch (error) {
                    const classified = classifyStatementError(error);
                    ledger.keys.onFailure(classified.kind);
                    outcome = { ok: false, error: classified };
                }
                // Keep acknowledged writes successful even if the subsequent GET fails. On an
                // uncertain failure, no next mutation is sent until the ledger can be refreshed.
                try { await refresh(); }
                catch { ledger.needsRefresh = true; }
                return outcome;
            } finally {
                ledger.working = false;
                if (context.current === ledger) { setRefreshing({ statementId, working: false }); }
            }
        },
        [refresh, ledger, statementId],
    );

    const createMutation = useMutation({
        mutationFn: (value: PaymentFormValue) =>
            statementImportsApi.createPayment(statementId, {
                ...value,
                expectedVersion: ledger.version,
                idempotencyKey: ledger.keys.keyFor(paymentFingerprint(value)),
            }),
    });
    const correctMutation = useMutation({
        mutationFn: ({ paymentId, value, reason }: { paymentId: string; value: PaymentFormValue; reason: string }) =>
            statementImportsApi.correctPayment(paymentId, {
                ...value,
                reason,
                expectedVersion: ledger.version,
                idempotencyKey: ledger.keys.keyFor(paymentFingerprint(value, paymentId, reason)),
            }),
    });
    const voidMutation = useMutation({
        mutationFn: ({ paymentId, reason }: { paymentId: string; reason: string }) =>
            statementImportsApi.voidPayment(paymentId, { expectedVersion: ledger.version, reason }),
    });

    return {
        addPayment: (value: PaymentFormValue) => run(() => createMutation.mutateAsync(value)),
        correctPayment: (paymentId: string, value: PaymentFormValue, reason: string) =>
            run(() => correctMutation.mutateAsync({ paymentId, value, reason })),
        voidPayment: (paymentId: string, reason: string) =>
            run(() => voidMutation.mutateAsync({ paymentId, reason })),
        resetIntent: () => ledger.keys.reset(),
        isWorking: refreshing.statementId === statementId && refreshing.working,
    };
}
