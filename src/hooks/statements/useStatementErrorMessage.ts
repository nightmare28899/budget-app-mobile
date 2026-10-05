import { useCallback } from 'react';
import type { TranslationKey } from '../../i18n/index';
import type { StatementError, StatementErrorKind } from '../../modules/statements/statementErrors';
import { useI18n } from '../shared/useI18n';

const KEYS: Partial<Record<StatementErrorKind, TranslationKey>> = {
    cycleConflict: 'statements.error.cycleConflict',
    staleVersion: 'statements.error.stale',
    reconciliation: 'statements.error.reconciliation',
    pendingRows: 'statements.error.pendingRows',
    adjustmentNote: 'statements.error.adjustmentNote',
    noExpenses: 'statements.error.noExpenses',
    notReviewable: 'statements.error.notReviewable',
    revertFirst: 'statements.error.revertFirst',
    hasPayments: 'statements.error.hasPayments',
    idempotency: 'statements.error.idempotency',
    alreadyPaid: 'statements.error.alreadyPaid',
    network: 'statements.error.network',
    throttled: 'statements.error.throttled',
};

/** Localized text for a classified statement error; backend text for unknown ones. */
export function useStatementErrorMessage() {
    const { t } = useI18n();
    return useCallback(
        (error: StatementError, fallback: TranslationKey): string => {
            const key = KEYS[error.kind];
            if (key) {
                return t(key);
            }
            return error.message || t(fallback);
        },
        [t],
    );
}
