import { Platform } from 'react-native';
import { translate } from '../../i18n/index';
import {
    ANDROID_MAX_SCHEDULED,
    IOS_MAX_SCHEDULED,
    createReminderCopy,
} from '../../modules/reminders';
import { createNotifyKitPort } from '../../modules/reminders/notifyKitAdapter';
import { usePreferencesStore } from '../../store/preferencesStore';
import { DEFAULT_CURRENCY } from '../../utils/domain/currency';
import { formatCurrency } from '../../utils/core/format';

const currentLanguage = () => usePreferencesStore.getState().language;

/** The one platform port, translating channel text with the language active when it is used. */
export const reminderPort = createNotifyKitPort({
    channelName: () => translate(currentLanguage(), 'reminders.channelName'),
    channelDescription: () => translate(currentLanguage(), 'reminders.channelDescription'),
});

export const maxScheduledReminders =
    Platform.OS === 'ios' ? IOS_MAX_SCHEDULED : ANDROID_MAX_SCHEDULED;

export const reminderCopy = createReminderCopy({
    t: (key, values) => translate(currentLanguage(), key, values),
    formatAmount: (amount, currency) => {
        try {
            return formatCurrency(
                amount,
                currency ?? DEFAULT_CURRENCY,
                currentLanguage() === 'es' ? 'es-MX' : 'en-US',
            );
        } catch {
            return [amount, currency].filter(Boolean).join(' ');
        }
    },
});
