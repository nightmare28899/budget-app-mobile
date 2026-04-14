import apiClient from '../client';
import {
    CreateSubscriptionPayload,
    UpcomingSubscriptionCharge,
    Subscription,
    SubscriptionProjection,
    UpdateSubscriptionPayload,
} from '../../types/index';
import { toNum } from '../../utils/core/number';
import {
    inferSubscriptionColor,
    inferSubscriptionIcon,
} from '../../utils/domain/subscriptions';
import { normalizeCreditCard } from '../../utils/domain/creditCards';
import { normalizePaymentMethod } from '../../utils/domain/paymentMethod';
import { normalizeCurrency } from '../../utils/domain/currency';
import { isLocalMode } from '../../modules/access/localMode';
import { buildUpcomingSubscriptions } from '../../modules/local/localFinance';
import { ensureGuestDataHydrated } from '../../store/guestDataStore';
import { useAuthStore } from '../../store/authStore';

function normalizeBillingCycle(value: unknown): Subscription['billingCycle'] {
    if (typeof value !== 'string') {
        return 'MONTHLY';
    }

    const normalized = value.trim().toUpperCase();

    if (normalized === 'WEEKLY') {
        return 'WEEKLY';
    }

    if (normalized === 'YEARLY' || normalized === 'ANNUAL') {
        return 'YEARLY';
    }

    return 'MONTHLY';
}

function toDateOnly(isoLike: unknown): string {
    if (typeof isoLike !== 'string') {
        return new Date().toISOString().slice(0, 10);
    }

    const date = new Date(isoLike);
    if (Number.isNaN(date.getTime())) {
        return new Date().toISOString().slice(0, 10);
    }

    return date.toISOString().slice(0, 10);
}

export function normalizeSubscription(item: any): Subscription {
    const name = typeof item?.name === 'string' ? item.name : '';
    const color =
        typeof item?.hexColor === 'string' && item.hexColor.trim().length
            ? item.hexColor
            : inferSubscriptionColor(name);

    return {
        id: String(item?.id ?? ''),
        name,
        cost: toNum(item?.cost),
        paymentMethod: normalizePaymentMethod(item?.paymentMethod),
        creditCardId:
            typeof item?.creditCardId === 'string' ? item.creditCardId : null,
        creditCard:
            item?.creditCard && typeof item.creditCard === 'object'
                ? normalizeCreditCard(item.creditCard)
                : null,
        currency: normalizeCurrency(item?.currency),
        billingCycle: normalizeBillingCycle(item?.billingCycle),
        nextPaymentDate:
            typeof item?.nextPaymentDate === 'string'
                ? item.nextPaymentDate
                : new Date().toISOString(),
        reminderDays: toNum(item?.reminderDays ?? 3),
        isActive: item?.isActive !== false,
        logoUrl: typeof item?.logoUrl === 'string' ? item.logoUrl : null,
        hexColor: typeof item?.hexColor === 'string' ? item.hexColor : null,
        userId: typeof item?.userId === 'string' ? item.userId : undefined,
        chargeDate: toDateOnly(item?.nextPaymentDate),
        color,
        icon: inferSubscriptionIcon(name),
        createdAt:
            typeof item?.createdAt === 'string'
                ? item.createdAt
                : new Date().toISOString(),
        updatedAt:
            typeof item?.updatedAt === 'string'
                ? item.updatedAt
                : new Date().toISOString(),
    };
}

function normalizeProjection(data: any): SubscriptionProjection {
    return {
        message:
            typeof data?.message === 'string' ? data.message : 'Projection loaded',
        activeCount: toNum(data?.activeCount),
        totalMonthlyCost: toNum(data?.totalMonthlyCost),
        currency: typeof data?.currency === 'string' ? data.currency : null,
        currencyBreakdown: Array.isArray(data?.currencyBreakdown)
            ? data.currencyBreakdown.map((item: any) => ({
                currency: typeof item?.currency === 'string' ? item.currency : 'MXN',
                monthlyCost: toNum(item?.monthlyCost),
            }))
            : [],
    };
}

function normalizeUpcomingCharge(item: any): UpcomingSubscriptionCharge {
    return {
        id: item?.id != null ? String(item.id) : undefined,
        subscriptionId:
            item?.subscriptionId != null ? String(item.subscriptionId) : undefined,
        name: typeof item?.name === 'string' ? item.name : '',
        amount: toNum(item?.amount),
        currency: typeof item?.currency === 'string' ? item.currency : undefined,
        daysRemaining: toNum(item?.daysRemaining),
        paymentMethod: normalizePaymentMethod(item?.paymentMethod),
        creditCardId:
            typeof item?.creditCardId === 'string' ? item.creditCardId : null,
        creditCard:
            item?.creditCard && typeof item.creditCard === 'object'
                ? normalizeCreditCard(item.creditCard)
                : null,
        chargeDate:
            typeof item?.chargeDate === 'string' ? item.chargeDate : null,
        nextPaymentDate:
            typeof item?.nextPaymentDate === 'string' ? item.nextPaymentDate : null,
    };
}

export const subscriptionsApi = {
    getAll: async () => {
        if (isLocalMode()) {
            const { subscriptions } = ensureGuestDataHydrated();
            return [...subscriptions].map(normalizeSubscription);
        }

        const { data } = await apiClient.get('/subscriptions');
        return Array.isArray(data) ? data.map(normalizeSubscription) : [];
    },

    getProjection: async () => {
        if (isLocalMode()) {
            const { subscriptions } = ensureGuestDataHydrated();
            const activeSubscriptions = subscriptions.filter((item) => item.isActive !== false);
            const totalMonthlyCost = activeSubscriptions.reduce((sum, subscription) => {
                if (subscription.billingCycle === 'WEEKLY') {
                    return sum + (toNum(subscription.cost) * 52) / 12;
                }

                if (subscription.billingCycle === 'YEARLY') {
                    return sum + toNum(subscription.cost) / 12;
                }

                return sum + toNum(subscription.cost);
            }, 0);

            return normalizeProjection({
                activeCount: activeSubscriptions.length,
                totalMonthlyCost,
                currencyBreakdown: [],
            });
        }

        const { data } = await apiClient.get('/subscriptions/projection');
        return normalizeProjection(data);
    },

    getUpcoming: async (days = 3) => {
        if (isLocalMode()) {
            const { subscriptions } = ensureGuestDataHydrated();
            return buildUpcomingSubscriptions(subscriptions, days);
        }

        const { data } = await apiClient.get<UpcomingSubscriptionCharge[]>(
            '/subscriptions/upcoming',
            { params: { days } },
        );
        return Array.isArray(data) ? data.map(normalizeUpcomingCharge) : [];
    },

    processSubscriptions: async () => {
        if (isLocalMode()) {
            return { success: true };
        }

        const { data } = await apiClient.post(
            '/subscriptions/process-subscriptions',
        );
        return data;
    },

    create: async (payload: CreateSubscriptionPayload) => {
        if (isLocalMode()) {
            const state = ensureGuestDataHydrated();
            const creditCard = payload.creditCardId
                ? state.creditCards.find((item) => item.id === payload.creditCardId) ?? null
                : null;
            const subscription = normalizeSubscription({
                ...payload,
                id: `subscription_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
                userId: useAuthStore.getState().user?.id,
                creditCard,
                nextPaymentDate: payload.nextPaymentDate,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            });

            return state.addSubscription(subscription);
        }

        const { data } = await apiClient.post('/subscriptions', payload);
        return normalizeSubscription(data);
    },

    update: async (id: string, payload: UpdateSubscriptionPayload) => {
        if (isLocalMode()) {
            const state = ensureGuestDataHydrated();
            const updated = state.updateSubscription(id, (subscription) =>
                normalizeSubscription({
                    ...subscription,
                    ...payload,
                    creditCard:
                        payload.creditCardId !== undefined
                            ? (
                                state.creditCards.find((item) => item.id === payload.creditCardId)
                                ?? null
                            )
                            : subscription.creditCard,
                    updatedAt: new Date().toISOString(),
                }),
            );

            if (!updated) {
                throw new Error('Subscription not found');
            }

            return updated;
        }

        const { data } = await apiClient.patch(`/subscriptions/${id}`, payload);
        return normalizeSubscription(data);
    },

    remove: async (id: string) => {
        if (isLocalMode()) {
            const state = ensureGuestDataHydrated();
            state.removeSubscription(id);
            return { success: true };
        }

        const { data } = await apiClient.delete(`/subscriptions/${id}`);
        return data;
    },
};
