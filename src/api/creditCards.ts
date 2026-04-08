import apiClient from './client';
import {
    CreateCreditCardPayload,
    CreditCard,
    CreditCardOverviewCard,
    CreditCardsOverviewResponse,
    UpdateCreditCardPayload,
} from '../types';
import { normalizeCreditCard } from '../utils/creditCards';
import { isLocalMode } from '../modules/access/localMode';
import { ensureGuestDataHydrated } from '../store/guestDataStore';
import { buildCreditCardsOverview } from '../modules/creditCards/creditCardOverview';
import { toNum } from '../utils/number';

function normalizeOverviewCard(card: any): CreditCardOverviewCard {
    return {
        ...normalizeCreditCard(card),
        currentCycle: {
            start: String(card?.currentCycle?.start ?? ''),
            end: String(card?.currentCycle?.end ?? ''),
            spend: toNum(card?.currentCycle?.spend),
            expenseCount: toNum(card?.currentCycle?.expenseCount),
        },
        creditStatus: {
            limit: card?.creditStatus?.limit == null ? null : toNum(card.creditStatus.limit),
            availableCredit:
                card?.creditStatus?.availableCredit == null
                    ? null
                    : toNum(card.creditStatus.availableCredit),
            utilizationPercent:
                card?.creditStatus?.utilizationPercent == null
                    ? null
                    : toNum(card.creditStatus.utilizationPercent),
        },
        schedule: {
            nextClosingDate:
                typeof card?.schedule?.nextClosingDate === 'string'
                    ? card.schedule.nextClosingDate
                    : null,
            daysUntilClosing:
                card?.schedule?.daysUntilClosing == null
                    ? null
                    : toNum(card.schedule.daysUntilClosing),
            nextPaymentDueDate:
                typeof card?.schedule?.nextPaymentDueDate === 'string'
                    ? card.schedule.nextPaymentDueDate
                    : null,
            daysUntilPaymentDue:
                card?.schedule?.daysUntilPaymentDue == null
                    ? null
                    : toNum(card.schedule.daysUntilPaymentDue),
        },
        subscriptions: {
            activeCount: toNum(card?.subscriptions?.activeCount),
            monthlyRecurringSpend: toNum(card?.subscriptions?.monthlyRecurringSpend),
            nextChargeDate:
                typeof card?.subscriptions?.nextChargeDate === 'string'
                    ? card.subscriptions.nextChargeDate
                    : null,
        },
        flags: {
            missingLimit: card?.flags?.missingLimit === true,
            highUtilization: card?.flags?.highUtilization === true,
            overLimit: card?.flags?.overLimit === true,
            paymentDueSoon: card?.flags?.paymentDueSoon === true,
            closingSoon: card?.flags?.closingSoon === true,
        },
    };
}

function normalizeOverviewResponse(data: any): CreditCardsOverviewResponse {
    return {
        referenceDate: String(data?.referenceDate ?? ''),
        portfolio: {
            trackedCards: toNum(data?.portfolio?.trackedCards),
            activeCards: toNum(data?.portfolio?.activeCards),
            cardsWithLimit: toNum(data?.portfolio?.cardsWithLimit),
            totalCreditLimit: toNum(data?.portfolio?.totalCreditLimit),
            totalCurrentCycleSpend: toNum(data?.portfolio?.totalCurrentCycleSpend),
            totalAvailableCredit: toNum(data?.portfolio?.totalAvailableCredit),
            utilizationPercent:
                data?.portfolio?.utilizationPercent == null
                    ? null
                    : toNum(data.portfolio.utilizationPercent),
            paymentDueSoonCount: toNum(data?.portfolio?.paymentDueSoonCount),
            highUtilizationCount: toNum(data?.portfolio?.highUtilizationCount),
            linkedSubscriptionsCount: toNum(data?.portfolio?.linkedSubscriptionsCount),
            monthlyRecurringSpend: toNum(data?.portfolio?.monthlyRecurringSpend),
        },
        cards: Array.isArray(data?.cards) ? data.cards.map(normalizeOverviewCard) : [],
    };
}

export const creditCardsApi = {
    getAll: async (options?: { includeInactive?: boolean }) => {
        if (isLocalMode()) {
            const { creditCards } = ensureGuestDataHydrated();
            return creditCards.filter((card) =>
                options?.includeInactive ? true : card.isActive,
            );
        }

        const { data } = await apiClient.get<CreditCard[]>('/credit-cards', {
            params: options?.includeInactive ? { includeInactive: true } : undefined,
        });
        return Array.isArray(data) ? data.map(normalizeCreditCard) : [];
    },

    getOverview: async (options?: { includeInactive?: boolean }) => {
        if (isLocalMode()) {
            const state = ensureGuestDataHydrated();
            const creditCards = state.creditCards.filter((card) =>
                options?.includeInactive ? true : card.isActive,
            );

            return buildCreditCardsOverview({
                creditCards,
                expenses: state.expenses,
                subscriptions: state.subscriptions,
            });
        }

        const { data } = await apiClient.get<CreditCardsOverviewResponse>('/credit-cards/overview', {
            params: options?.includeInactive ? { includeInactive: true } : undefined,
        });
        return normalizeOverviewResponse(data);
    },

    getOne: async (id: string) => {
        if (isLocalMode()) {
            const { creditCards } = ensureGuestDataHydrated();
            const card = creditCards.find((item) => item.id === id);
            if (!card) {
                throw new Error('Credit card not found');
            }

            return normalizeCreditCard(card);
        }

        const { data } = await apiClient.get<CreditCard>(`/credit-cards/${id}`);
        return normalizeCreditCard(data);
    },

    create: async (payload: CreateCreditCardPayload) => {
        if (isLocalMode()) {
            const state = ensureGuestDataHydrated();
            const now = new Date().toISOString();
            const card = normalizeCreditCard({
                ...payload,
                id: `card_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
                isActive: payload.isActive !== false,
                createdAt: now,
                updatedAt: now,
            });

            return state.addCreditCard(card);
        }

        const { data } = await apiClient.post<CreditCard>('/credit-cards', payload);
        return normalizeCreditCard(data);
    },

    update: async (id: string, payload: UpdateCreditCardPayload) => {
        if (isLocalMode()) {
            const state = ensureGuestDataHydrated();
            const updated = state.updateCreditCard(id, (card) =>
                normalizeCreditCard({
                    ...card,
                    ...payload,
                    id: card.id,
                    updatedAt: new Date().toISOString(),
                }),
            );

            if (!updated) {
                throw new Error('Credit card not found');
            }

            return updated;
        }

        const { data } = await apiClient.patch<CreditCard>(`/credit-cards/${id}`, payload);
        return normalizeCreditCard(data);
    },

    deactivate: async (id: string) => {
        if (isLocalMode()) {
            const state = ensureGuestDataHydrated();
            const updated = state.updateCreditCard(id, (card) => ({
                ...card,
                isActive: false,
                updatedAt: new Date().toISOString(),
            }));

            if (!updated) {
                throw new Error('Credit card not found');
            }

            return updated;
        }

        const { data } = await apiClient.delete<CreditCard>(`/credit-cards/${id}`);
        return normalizeCreditCard(data);
    },
};
