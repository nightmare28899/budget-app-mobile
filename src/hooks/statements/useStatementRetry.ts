import { useMutation, useQueryClient } from '@tanstack/react-query';
import { statementImportsApi } from '../../api/resources/statementImports';
import { useAppAlert } from '../../components/alerts/AlertProvider';
import { useI18n } from '../shared/useI18n';
import { classifyStatementUploadError } from '../../modules/statements/statementFile';

export function useStatementRetry() {
    const queryClient = useQueryClient();
    const { alert } = useAppAlert();
    const { t } = useI18n();

    const mutation = useMutation({
        mutationFn: (id: string) => statementImportsApi.process(id),
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
