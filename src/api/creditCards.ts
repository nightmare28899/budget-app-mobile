import apiClient from './client';
import {
    CreateCreditCardPayload,
    CreditCard,
    UpdateCreditCardPayload,
} from '../types';
import { normalizeCreditCard } from '../utils/creditCards';
import { isLocalMode } from '../modules/access/localMode';
import { ensureGuestDataHydrated } from '../store/guestDataStore';

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
