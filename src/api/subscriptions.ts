import apiClient from './client';
import {
    CreateSubscriptionPayload,
    UpcomingSubscriptionCharge,
    Subscription,
    SubscriptionProjection,
    UpdateSubscriptionPayload,
} from '../types';
import { toNum } from '../utils/number';
import {
    inferSubscriptionColor,
    inferSubscriptionIcon,
} from '../utils/subscriptions';

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
        paymentMethod:
            typeof item?.paymentMethod === 'string' && item.paymentMethod.trim().length > 0
                ? item.paymentMethod
                : undefined,
        currency: typeof item?.currency === 'string' ? item.currency : 'MXN',
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
        daysRemaining: toNum(item?.daysRemaining),
        paymentMethod:
            typeof item?.paymentMethod === 'string' && item.paymentMethod.trim().length > 0
                ? item.paymentMethod
                : undefined,
        chargeDate:
            typeof item?.chargeDate === 'string' ? item.chargeDate : null,
        nextPaymentDate:
            typeof item?.nextPaymentDate === 'string' ? item.nextPaymentDate : null,
    };
}

export const subscriptionsApi = {
    getAll: async () => {
        const { data } = await apiClient.get('/subscriptions');
        return Array.isArray(data) ? data.map(normalizeSubscription) : [];
    },

    getProjection: async () => {
        const { data } = await apiClient.get('/subscriptions/projection');
        return normalizeProjection(data);
    },

    getUpcoming: async (days = 3) => {
        const { data } = await apiClient.get<UpcomingSubscriptionCharge[]>(
            '/subscriptions/upcoming',
            { params: { days } },
        );
        return Array.isArray(data) ? data.map(normalizeUpcomingCharge) : [];
    },

    processSubscriptions: async () => {
        const { data } = await apiClient.post(
            '/subscriptions/process-subscriptions',
        );
        return data;
    },

    create: async (payload: CreateSubscriptionPayload) => {
        const { data } = await apiClient.post('/subscriptions', payload);
        return normalizeSubscription(data);
    },

    update: async (id: string, payload: UpdateSubscriptionPayload) => {
        const { data } = await apiClient.patch(`/subscriptions/${id}`, payload);
        return normalizeSubscription(data);
    },

    remove: async (id: string) => {
        const { data } = await apiClient.delete(`/subscriptions/${id}`);
        return data;
    },
};
