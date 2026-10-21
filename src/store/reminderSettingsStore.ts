import { create } from 'zustand';
import { createSecureStorage } from './secureStorage';
import {
    DEFAULT_LEAD_DAYS,
    normalizeLead,
    type ReminderStore,
} from '../modules/reminders';

const STORAGE_ID = 'payment-reminders-storage';
const ENABLED_KEY = 'enabled';
const LEAD_DAYS_KEY = 'leadDays';
const SCHEDULED_KEY = 'scheduled';

const storage = createSecureStorage(STORAGE_ID);

function readScheduled(): Record<string, number> {
    const raw = storage.getString(SCHEDULED_KEY);
    if (!raw) {
        return {};
    }
    try {
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        return Object.entries(parsed).reduce<Record<string, number>>((acc, [key, value]) => {
            if (typeof value === 'number' && Number.isFinite(value)) {
                acc[key] = value;
            }
            return acc;
        }, {});
    } catch {
        return {};
    }
}

/** Fire times of scheduled reminders, so one that already fired is never scheduled again. */
export const reminderScheduleStore: ReminderStore = {
    load: readScheduled,
    save: records => {
        if (Object.keys(records).length === 0) {
            storage.remove(SCHEDULED_KEY);
        } else {
            storage.set(SCHEDULED_KEY, JSON.stringify(records));
        }
    },
};

interface ReminderSettingsState {
    enabled: boolean;
    leadDays: number;
    setEnabled: (enabled: boolean) => void;
    setLeadDays: (days: number) => void;
}

/** Opt-in (off by default); turning it on is gated by the notification permission in the UI. */
export const useReminderSettingsStore = create<ReminderSettingsState>(set => ({
    enabled: storage.getBoolean(ENABLED_KEY) === true,
    leadDays: normalizeLead(storage.getNumber(LEAD_DAYS_KEY) ?? DEFAULT_LEAD_DAYS),

    setEnabled: enabled => {
        storage.set(ENABLED_KEY, enabled);
        set({ enabled });
    },

    setLeadDays: days => {
        const leadDays = normalizeLead(days);
        storage.set(LEAD_DAYS_KEY, leadDays);
        set({ leadDays });
    },
}));
