import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { statementImportsApi } from '../../api/resources/statementImports';
import {
    StatementError,
    classifyStatementError,
    isStaleStatementError,
} from '../../modules/statements/statementErrors';
import type {
    StatementConfirmResult,
    StatementImportDetail,
    StatementRevertResult,
    StatementRowPatch,
} from '../../types/statementImports';

export type StatementActionResult<T> =
    | { ok: true; data: T }
    | { ok: false; error: StatementError };

/** Keys whose data changes when expenses are created or removed by a statement. */
const EXPENSE_KEYS = ['expenses', 'categories', 'analytics', 'history', 'income-summary', 'planner'];

export function detailQueryKey(id: string) {
    return ['statementImports', 'detail', id] as const;
}

/**
 * Review lifecycle mutations. Each call resolves to a result object instead of throwing so
 * screens can show the backend's validation error inline. Stale-version errors refetch the
 * detail so the next attempt uses the current version.
 */
export function useStatementActions(id: string) {
    const queryClient = useQueryClient();

    const invalidateLists = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ['statementImports', 'list'] });
        queryClient.invalidateQueries({ queryKey: ['creditCards'] });
    }, [queryClient]);

    const invalidateExpenses = useCallback(() => {
        EXPENSE_KEYS.forEach(key => queryClient.invalidateQueries({ queryKey: [key] }));
    }, [queryClient]);

    const setDetail = useCallback(
        (detail: StatementImportDetail) => {
            queryClient.setQueryData(detailQueryKey(id), detail);
            invalidateLists();
        },
        [id, invalidateLists, queryClient],
    );

    const run = useCallback(
        async <T,>(action: () => Promise<T>): Promise<StatementActionResult<T>> => {
            try {
                return { ok: true, data: await action() };
            } catch (error) {
                const classified = classifyStatementError(error);
                if (isStaleStatementError(classified)) {
                    queryClient.invalidateQueries({ queryKey: detailQueryKey(id) });
                }
                return { ok: false, error: classified };
            }
        },
        [id, queryClient],
    );

    const saveMutation = useMutation({
        mutationFn: ({ version, rows }: { version: number; rows: StatementRowPatch[] }) =>
            statementImportsApi.updateRows(id, version, rows),
        onSuccess: setDetail,
    });
    const confirmMutation = useMutation({
        mutationFn: (version: number) => statementImportsApi.confirm(id, version),
        onSuccess: result => {
            setDetail(result.statement);
            invalidateExpenses();
        },
    });
    const revertMutation = useMutation({
        mutationFn: (version: number) => statementImportsApi.revert(id, version),
        onSuccess: result => {
            setDetail(result.statement);
            invalidateExpenses();
        },
    });
    const resumeMutation = useMutation({
        mutationFn: (version: number) => statementImportsApi.resume(id, version),
        onSuccess: setDetail,
    });
    const removeMutation = useMutation({
        mutationFn: () => statementImportsApi.remove(id),
        onSuccess: () => {
            queryClient.removeQueries({ queryKey: detailQueryKey(id) });
            invalidateLists();
        },
    });

    return {
        saveRows: (version: number, rows: StatementRowPatch[]) =>
            run<StatementImportDetail>(() => saveMutation.mutateAsync({ version, rows })),
        confirm: (version: number) =>
            run<StatementConfirmResult>(() => confirmMutation.mutateAsync(version)),
        revert: (version: number) =>
            run<StatementRevertResult>(() => revertMutation.mutateAsync(version)),
        resume: (version: number) =>
            run<StatementImportDetail>(() => resumeMutation.mutateAsync(version)),
        remove: () => run<void>(() => removeMutation.mutateAsync()),
        isSaving: saveMutation.isPending,
        isConfirming: confirmMutation.isPending,
        isReverting: revertMutation.isPending,
        isResuming: resumeMutation.isPending,
        isRemoving: removeMutation.isPending,
    };
}
