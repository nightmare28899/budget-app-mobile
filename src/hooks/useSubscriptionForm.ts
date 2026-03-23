import { useCallback, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { DateTimePickerAndroid, DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useSubscriptionManager } from '../modules/subscriptions/useSubscriptionManager';
import { useAuthStore } from '../store/authStore';
import { useAppAlert } from '../components/alerts/AlertProvider';
import {
    formatDateISO,
    getPresetByName,
    QUICK_SUBSCRIPTION_PRESETS,
} from '../utils/subscriptions';
import { softHaptic } from '../utils/haptics';
import {
    MAX_COST_LABEL,
    MAX_COST_VALUE,
    sanitizeMoneyInput,
} from '../utils/moneyInput';
import { useTheme } from '../theme';
import { useI18n } from './useI18n';
import { SubscriptionBillingCycle, Subscription } from '../types';

function parseDateOrToday(value: string): Date {
    const date = new Date(`${value}T12:00:00`);
    if (Number.isNaN(date.getTime())) {
        return new Date();
    }
    return date;
}

type NavigationLike = {
    navigate: (...args: any[]) => void;
    goBack: () => void;
};

type UseSubscriptionFormParams = {
    navigation: NavigationLike;
    editingSubscription?: Subscription;
    embedded?: boolean;
};

export function useSubscriptionForm({
    navigation,
    editingSubscription,
    embedded: _embedded,
}: UseSubscriptionFormParams) {
    const { colors } = useTheme();
    const { alert } = useAppAlert();
    const { t, language } = useI18n();
    const user = useAuthStore((s) => s.user);
    const {
        createSubscription,
        updateSubscription,
        removeSubscription,
        isCreating,
        isUpdating,
        isRemoving,
    } = useSubscriptionManager();

    const isEditMode = Boolean(editingSubscription?.id);
    const initialPresetId = editingSubscription?.name
        ? getPresetByName(editingSubscription.name)?.id ?? null
        : null;

    const [name, setName] = useState(editingSubscription?.name ?? '');
    const [cost, setCost] = useState(
        editingSubscription ? String(editingSubscription.cost) : '',
    );
    const [paymentMethod, setPaymentMethod] = useState<string | undefined>(
        editingSubscription?.paymentMethod ?? undefined,
    );
    const [chargeDate, setChargeDate] = useState(
        editingSubscription?.chargeDate ?? formatDateISO(new Date()),
    );
    const [serviceColor, setServiceColor] = useState<string>(
        editingSubscription?.hexColor ??
        editingSubscription?.color ??
        colors.primary,
    );
    const [serviceIcon, setServiceIcon] = useState<string>(
        editingSubscription?.icon ?? 'sparkles-outline',
    );
    const [selectedPresetId, setSelectedPresetId] = useState<string | null>(
        initialPresetId,
    );
    const [billingCycle, setBillingCycle] = useState<SubscriptionBillingCycle>(
        editingSubscription?.billingCycle ?? 'MONTHLY',
    );
    const [showIosPicker, setShowIosPicker] = useState(false);

    const locale = language === 'es' ? 'es-MX' : 'en-US';
    const chargeDateLabel = useMemo(
        () =>
            parseDateOrToday(chargeDate).toLocaleDateString(locale, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            }),
        [chargeDate, locale],
    );

    const onChangeDate = useCallback((event: DateTimePickerEvent, date?: Date) => {
        if (event.type === 'dismissed' || !date) {
            return;
        }

        setChargeDate(formatDateISO(date));
    }, []);

    const openDatePicker = useCallback(() => {
        const current = parseDateOrToday(chargeDate);
        if (Platform.OS === 'android') {
            DateTimePickerAndroid.open({
                mode: 'date',
                value: current,
                onChange: onChangeDate,
            });
            return;
        }

        setShowIosPicker((prev) => !prev);
    }, [chargeDate, onChangeDate]);

    const onPickPreset = useCallback((presetId: string) => {
        const preset = QUICK_SUBSCRIPTION_PRESETS.find((item) => item.id === presetId);
        if (!preset) {
            return;
        }

        softHaptic(6);
        setSelectedPresetId(preset.id);
        setName(preset.name);
        setServiceColor(preset.color);
        setServiceIcon(preset.icon);

        if (preset.defaultPrice !== undefined) {
            setCost(String(preset.defaultPrice));
        }
    }, []);

    const onChangeCost = useCallback((value: string) => {
        setCost(sanitizeMoneyInput(value));
    }, []);

    const onSave = useCallback(() => {
        const parsedCost = Number(cost);
        if (!name.trim()) {
            alert(t('common.error'), t('addSubscription.validationName'));
            return;
        }
        if (!Number.isFinite(parsedCost) || parsedCost <= 0) {
            alert(t('common.error'), t('addSubscription.validationCost'));
            return;
        }
        if (parsedCost > MAX_COST_VALUE) {
            alert(
                t('common.error'),
                t('common.maxAmountExceeded', { max: MAX_COST_LABEL }),
            );
            return;
        }
        if (!chargeDate) {
            alert(t('common.error'), t('addSubscription.validationDate'));
            return;
        }

        const parsedDate = parseDateOrToday(chargeDate);
        const now = new Date();
        if (parsedDate <= now) {
            if (billingCycle === 'WEEKLY') {
                parsedDate.setDate(parsedDate.getDate() + 7);
            } else if (billingCycle === 'YEARLY') {
                parsedDate.setFullYear(parsedDate.getFullYear() + 1);
            } else {
                parsedDate.setMonth(parsedDate.getMonth() + 1);
            }
        }
        parsedDate.setHours(12, 0, 0, 0);

        const payload = {
            name: name.trim(),
            cost: parsedCost,
            paymentMethod: paymentMethod || undefined,
            billingCycle,
            nextPaymentDate: parsedDate.toISOString(),
            currency: user?.currency || editingSubscription?.currency || 'MXN',
            reminderDays: editingSubscription?.reminderDays ?? 3,
            isActive: true,
            hexColor: serviceColor,
        };

        const action = isEditMode && editingSubscription
            ? updateSubscription(editingSubscription.id, payload)
            : createSubscription(payload);

        action
            .then(() => {
                setName('');
                setCost('');
                setPaymentMethod(undefined);
                setChargeDate(formatDateISO(new Date()));
                setSelectedPresetId(null);
                setServiceColor(colors.primary);
                setServiceIcon('sparkles-outline');
                setBillingCycle('MONTHLY');

                navigation.navigate('Main', {
                    screen: 'Tabs',
                    params: {
                        screen: 'SubscriptionsTab',
                        params: {
                            initialTab: 'subscriptions',
                            successMessage: t(
                                isEditMode
                                    ? 'addSubscription.updated'
                                    : 'addSubscription.saved',
                            ),
                        },
                    },
                });
            })
            .catch((error) => {
                console.error('Failed to save subscription', error);
            });
    }, [
        alert,
        billingCycle,
        chargeDate,
        cost,
        createSubscription,
        colors.primary,
        editingSubscription,
        isEditMode,
        name,
        navigation,
        paymentMethod,
        serviceColor,
        t,
        updateSubscription,
        user?.currency,
    ]);

    const onDelete = useCallback(() => {
        if (!editingSubscription || !isEditMode) {
            return;
        }

        alert(
            t('subscriptions.deleteTitle'),
            t('subscriptions.deleteMessage', { name: editingSubscription.name }),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.delete'),
                    style: 'destructive',
                    onPress: () => {
                        removeSubscription(editingSubscription.id)
                            .then(() => {
                                navigation.goBack();
                            })
                            .catch((error) => {
                                console.error('Failed to delete subscription', error);
                            });
                    },
                },
            ],
        );
    }, [
        alert,
        editingSubscription,
        isEditMode,
        navigation,
        removeSubscription,
        t,
    ]);

    return {
        name,
        setName,
        cost,
        onChangeCost,
        paymentMethod,
        setPaymentMethod,
        chargeDate,
        chargeDateLabel,
        serviceColor,
        serviceIcon,
        selectedPresetId,
        billingCycle,
        setBillingCycle,
        showIosPicker,
        isEditMode,
        isCreating,
        isUpdating,
        isRemoving,
        onChangeDate,
        openDatePicker,
        onPickPreset,
        onSave,
        onDelete,
        parseDateOrToday,
    };
}

export { QUICK_SUBSCRIPTION_PRESETS } from '../utils/subscriptions';

export const BILLING_CYCLE_OPTIONS: Array<{
    value: SubscriptionBillingCycle;
    labelKey:
    | 'addSubscription.frequencyWeekly'
    | 'addSubscription.frequencyMonthly'
    | 'addSubscription.frequencyYearly';
}> = [
        { value: 'WEEKLY', labelKey: 'addSubscription.frequencyWeekly' },
        { value: 'MONTHLY', labelKey: 'addSubscription.frequencyMonthly' },
        { value: 'YEARLY', labelKey: 'addSubscription.frequencyYearly' },
    ];
