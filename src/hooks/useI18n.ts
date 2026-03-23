import { useCallback } from 'react';
import { AppLanguage, TranslationKey, TranslationValues, translate } from '../i18n';
import { usePreferencesStore } from '../store/preferencesStore';

function getPluralKey(baseKey: string, count: number): TranslationKey {
    return `${baseKey}.${count === 1 ? 'one' : 'other'}` as TranslationKey;
}

export function useI18n() {
    const language = usePreferencesStore((s) => s.language);
    const setLanguage = usePreferencesStore((s) => s.setLanguage);

    const t = useCallback(
        (key: TranslationKey, values?: TranslationValues) =>
            translate(language, key, values),
        [language],
    );

    const tPlural = useCallback(
        (baseKey: string, count: number, values?: TranslationValues) =>
            translate(language, getPluralKey(baseKey, count), {
                count,
                ...(values ?? {}),
            }),
        [language],
    );

    return {
        language,
        isSpanish: language === 'es',
        setLanguage: (nextLanguage: AppLanguage) => setLanguage(nextLanguage),
        t,
        tPlural,
    };
}
