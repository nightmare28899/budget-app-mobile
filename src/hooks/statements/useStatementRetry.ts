import { useMutation, useQueryClient } from '@tanstack/react-query';
import { statementImportsApi } from '../../api/resources/statementImports';
import { useAppAlert } from '../../components/alerts/AlertProvider';
import { useI18n } from '../shared/useI18n';
import { classifyStatementUploadError } from '../../modules/statements/statementFile';
import {
    endStatementImport,
    stageForImportStatus,
    startStatementImport,
    updateStatementImport,
} from '../../utils/platform/androidLiveUpdates';

export function useStatementRetry() {
    const queryClient = useQueryClient();
    const { alert } = useAppAlert();
    const { t } = useI18n();

    const mutation = useMutation({
        mutationFn: async (id: string) => {
            await startStatementImport(id, t('statements.title')).catch(() => undefined);
            updateStatementImport(id, 'parsing', undefined, id);
            try {
                const result = await statementImportsApi.process(id);
                updateStatementImport(id, stageForImportStatus(result.status), 1, id);
                return result;
            } catch (error) {
                endStatementImport(id);
                throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['statementImports'] });
            queryClient.invalidateQueries({ queryKey: ['creditCards'] });
        },
        onError: (error: unknown) => {
            const failure = classifyStatementUploadError(error);
            if (failure.kind === 'premium') {
                return;
            }
            alert(
                t('common.error'),
                failure.kind === 'throttled'
                    ? t('statements.error.throttled')
                    : failure.message || t('statements.error.retryFailed'),
            );
        },
    });

    return {
        retry: (id: string) => mutation.mutateAsync(id),
        isRetrying: mutation.isPending,
    };
}
