import apiClient from '../client';
import {
    CreateCreditCardPayload,
    CreditCard,
    CreditCardOverviewCard,
    CreditCardsOverviewResponse,
    UpdateCreditCardPayload,
} from '../../types/index';
import { normalizeCreditCard } from '../../utils/domain/creditCards';
import { isLocalMode } from '../../modules/access/localMode';
import { ensureGuestDataHydrated } from '../../store/guestDataStore';
import { buildCreditCardsOverview } from '../../modules/creditCards/creditCardOverview';
import { toNum } from '../../utils/core/number';
import { toApiArray, toApiRecord } from '../../utils/platform/api';

function normalizeOverviewCard(card: unknown): CreditCardOverviewCard {
    const normalizedCard = toApiRecord(card);
    const currentCycle = toApiRecord(normalizedCard.currentCycle);
    const creditStatus = toApiRecord(normalizedCard.creditStatus);
    const schedule = toApiRecord(normalizedCard.schedule);
    const subscriptions = toApiRecord(normalizedCard.subscriptions);
    const flags = toApiRecord(normalizedCard.flags);

    return {
        ...normalizeCreditCard(normalizedCard),
        currentCycle: {
            start: String(currentCycle.start ?? ''),
            end: String(currentCycle.end ?? ''),
            spend: toNum(currentCycle.spend),
            expenseCount: toNum(currentCycle.expenseCount),
        },
        creditStatus: {
            limit: creditStatus.limit == null ? null : toNum(creditStatus.limit),
            availableCredit:
                creditStatus.availableCredit == null
                    ? null
                    : toNum(creditStatus.availableCredit),
            utilizationPercent:
                creditStatus.utilizationPercent == null
                    ? null
                    : toNum(creditStatus.utilizationPercent),
        },
        schedule: {
            nextClosingDate:
                typeof schedule.nextClosingDate === 'string'
                    ? schedule.nextClosingDate
                    : null,
            daysUntilClosing:
                schedule.daysUntilClosing == null
                    ? null
                    : toNum(schedule.daysUntilClosing),
            nextPaymentDueDate:
                typeof schedule.nextPaymentDueDate === 'string'
                    ? schedule.nextPaymentDueDate
                    : null,
            daysUntilPaymentDue:
                schedule.daysUntilPaymentDue == null
                    ? null
                    : toNum(schedule.daysUntilPaymentDue),
        },
        subscriptions: {
            activeCount: toNum(subscriptions.activeCount),
            monthlyRecurringSpend: toNum(subscriptions.monthlyRecurringSpend),
            nextChargeDate:
                typeof subscriptions.nextChargeDate === 'string'
                    ? subscriptions.nextChargeDate
                    : null,
        },
        flags: {
            missingLimit: flags.missingLimit === true,
            highUtilization: flags.highUtilization === true,
            overLimit: flags.overLimit === true,
            paymentDueSoon: flags.paymentDueSoon === true,
            closingSoon: flags.closingSoon === true,
        },
    };
}

function normalizeOverviewResponse(data: unknown): CreditCardsOverviewResponse {
    const normalizedData = toApiRecord(data);
    const portfolio = toApiRecord(normalizedData.portfolio);

    return {
        referenceDate: String(normalizedData.referenceDate ?? ''),
        portfolio: {
            trackedCards: toNum(portfolio.trackedCards),
            activeCards: toNum(portfolio.activeCards),
            cardsWithLimit: toNum(portfolio.cardsWithLimit),
            totalCreditLimit: toNum(portfolio.totalCreditLimit),
            totalCurrentCycleSpend: toNum(portfolio.totalCurrentCycleSpend),
            totalAvailableCredit: toNum(portfolio.totalAvailableCredit),
            utilizationPercent:
                portfolio.utilizationPercent == null
                    ? null
                    : toNum(portfolio.utilizationPercent),
            paymentDueSoonCount: toNum(portfolio.paymentDueSoonCount),
            highUtilizationCount: toNum(portfolio.highUtilizationCount),
            linkedSubscriptionsCount: toNum(portfolio.linkedSubscriptionsCount),
            monthlyRecurringSpend: toNum(portfolio.monthlyRecurringSpend),
        },
        cards: toApiArray(normalizedData.cards).map(normalizeOverviewCard),
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
