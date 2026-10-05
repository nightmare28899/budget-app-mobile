import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { statementImportsApi } from '../../api/resources/statementImports';
import { classifyStatementError } from '../../modules/statements/statementErrors';
import { generateIdempotencyKey } from '../../modules/statements/statementPayments';
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

    const refresh = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: detailQueryKey(statementId) });
        queryClient.invalidateQueries({ queryKey: ['statementImports', 'list'] });
        queryClient.invalidateQueries({ queryKey: ['creditCards'] });
    }, [queryClient, statementId]);

    const run = useCallback(
        async (
            action: () => Promise<StatementPaymentMutationResult>,
        ): Promise<StatementActionResult<StatementPaymentMutationResult>> => {
            try {
                const data = await action();
                refresh();
                return { ok: true, data };
            } catch (error) {
                // A conflict means the ledger moved on; reload before the next attempt.
                refresh();
                return { ok: false, error: classifyStatementError(error) };
            }
        },
        [refresh],
    );

    const createMutation = useMutation({
        mutationFn: (value: PaymentFormValue) =>
            statementImportsApi.createPayment(statementId, {
                ...value,
                expectedVersion: paymentVersion,
                idempotencyKey: generateIdempotencyKey(),
            }),
    });
    const correctMutation = useMutation({
        mutationFn: ({ paymentId, value, reason }: { paymentId: string; value: PaymentFormValue; reason: string }) =>
            statementImportsApi.correctPayment(paymentId, {
                ...value,
                reason,
                expectedVersion: paymentVersion,
                idempotencyKey: generateIdempotencyKey(),
            }),
    });
    const voidMutation = useMutation({
        mutationFn: ({ paymentId, reason }: { paymentId: string; reason: string }) =>
            statementImportsApi.voidPayment(paymentId, { expectedVersion: paymentVersion, reason }),
    });

    return {
        addPayment: (value: PaymentFormValue) => run(() => createMutation.mutateAsync(value)),
        correctPayment: (paymentId: string, value: PaymentFormValue, reason: string) =>
            run(() => correctMutation.mutateAsync({ paymentId, value, reason })),
        voidPayment: (paymentId: string, reason: string) =>
            run(() => voidMutation.mutateAsync({ paymentId, reason })),
        isWorking: createMutation.isPending || correctMutation.isPending || voidMutation.isPending,
    };
}
