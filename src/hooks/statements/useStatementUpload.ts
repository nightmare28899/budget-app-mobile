import { useCallback, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { errorCodes, isErrorWithCode, pick, types } from '@react-native-documents/picker';
import { statementImportsApi } from '../../api/resources/statementImports';
import { useI18n } from '../shared/useI18n';
import type { TranslationKey } from '../../i18n/index';
import {
    StatementUploadErrorKind,
    classifyStatementUploadError,
    validateStatementFile,
} from '../../modules/statements/statementFile';
import type {
    StatementImportCreateResponse,
    StatementUploadFile,
} from '../../types/statementImports';

export type PickedStatementFile = StatementUploadFile & { size: number | null };

const ERROR_KEYS: Record<Exclude<StatementUploadErrorKind, 'premium'>, TranslationKey> = {
    duplicate: 'statements.error.duplicate',
    tooLarge: 'statements.tooLarge',
    invalid: 'statements.error.invalid',
    throttled: 'statements.error.throttled',
    timeout: 'statements.error.timeout',
    network: 'statements.error.network',
    unknown: 'statements.error.uploadFailed',
};

const VALIDATION_KEYS = {
    invalidType: 'statements.invalidType',
    tooLarge: 'statements.tooLarge',
    empty: 'statements.emptyFile',
} as const satisfies Record<string, TranslationKey>;

export function useStatementUpload() {
    const queryClient = useQueryClient();
    const { t } = useI18n();
    const [file, setFile] = useState<PickedStatementFile | null>(null);
    const [progress, setProgress] = useState(0);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const mutation = useMutation({
        mutationFn: ({ picked, creditCardId }: { picked: PickedStatementFile; creditCardId: string }) =>
            statementImportsApi.upload(
                { uri: picked.uri, name: picked.name, type: 'application/pdf' },
                creditCardId,
                setProgress,
            ),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['statementImports'] });
            queryClient.invalidateQueries({ queryKey: ['creditCards'] });
        },
    });

    const choosePdf = useCallback(async () => {
        setErrorMessage(null);
        try {
            const [result] = await pick({ type: types.pdf });
            const candidate = {
                name: result.name ?? 'statement.pdf',
                type: result.type,
                size: result.size,
            };
            const validation = validateStatementFile(candidate);
            if (!validation.ok) {
                setFile(null);
                setErrorMessage(t(VALIDATION_KEYS[validation.reason]));
                return;
            }
            setFile({
                uri: result.uri,
                name: candidate.name,
                type: 'application/pdf',
                size: result.size,
            });
        } catch (error) {
            if (isErrorWithCode(error) && error.code === errorCodes.OPERATION_CANCELED) {
                return;
            }
            setErrorMessage(t('statements.error.pickFailed'));
        }
    }, [t]);

    const clearFile = useCallback(() => {
        setFile(null);
        setErrorMessage(null);
    }, []);

    /** Resolves with the import, or null when the upload failed (message is set). */
    const upload = useCallback(
        async (creditCardId: string | undefined): Promise<StatementImportCreateResponse | null> => {
            if (!file) {
                setErrorMessage(t('statements.choosePdfFirst'));
                return null;
            }
            if (!creditCardId) {
                setErrorMessage(t('statements.chooseCardFirst'));
                return null;
            }

            setErrorMessage(null);
            setProgress(0);
            try {
                return await mutation.mutateAsync({ picked: file, creditCardId });
            } catch (error) {
                const failure = classifyStatementUploadError(error);
                // The axios interceptor already opens the paywall for premium errors.
                if (failure.kind !== 'premium') {
                    const base = t(ERROR_KEYS[failure.kind]);
                    setErrorMessage(
                        failure.kind === 'invalid' && failure.message ? failure.message : base,
                    );
                }
                return null;
            }
        },
        [file, mutation, t],
    );

    return {
        file,
        progress,
        errorMessage,
        isUploading: mutation.isPending,
        choosePdf,
        clearFile,
        upload,
    };
}
