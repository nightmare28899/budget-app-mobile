import apiClient from '../client';
import { Category } from '../../types/index';
import { isLocalMode } from '../../modules/access/localMode';
import {
    ensureGuestDataHydrated,
    getGuestUserId,
} from '../../store/guestDataStore';
import { createApiError, toApiRecord } from '../../utils/platform/api';

export interface CreateCategoryPayload {
    name: string;
    icon?: string;
    color?: string;
    budgetAmount?: number;
}

export type UpdateCategoryPayload = Partial<CreateCategoryPayload>;

function toStringOrUndefined(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim().length ? value : undefined;
}

function toNullableNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
        return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function toCategory(raw: unknown): Category | null {
    const data = toApiRecord(raw);

    const id = toStringOrUndefined(data.id ?? data.categoryId);
    const name = toStringOrUndefined(data.name);
    if (!id || !name) {
        return null;
    }

    return {
        id,
        name,
        icon: toStringOrUndefined(data.icon),
        color: toStringOrUndefined(data.color),
        budgetAmount: toNullableNumber(data.budgetAmount),
        userId: toStringOrUndefined(data.userId) ?? '',
    };
}

function extractCategoryArray(raw: unknown): unknown[] {
    if (Array.isArray(raw)) {
        return raw;
    }

    const data = toApiRecord(raw);

    if (Array.isArray(data.categories)) {
        return data.categories;
    }

    if (Array.isArray(data.items)) {
        return data.items;
    }

    if (Array.isArray(data.data)) {
        return data.data;
    }

    if (data.data && typeof data.data === 'object') {
        return extractCategoryArray(data.data);
    }

    if (data.payload && typeof data.payload === 'object') {
        return extractCategoryArray(data.payload);
    }

    if (data.result && typeof data.result === 'object') {
        return extractCategoryArray(data.result);
    }

    return [];
}

function extractSingleCategory(raw: unknown): unknown {
    const data = toApiRecord(raw);

    if (data.id || data.categoryId) {
        return data;
    }

    if (data.category && typeof data.category === 'object') {
        return extractSingleCategory(data.category);
    }

    if (data.data && typeof data.data === 'object') {
        return extractSingleCategory(data.data);
    }

    if (data.payload && typeof data.payload === 'object') {
        return extractSingleCategory(data.payload);
    }

    if (data.result && typeof data.result === 'object') {
        return extractSingleCategory(data.result);
    }

    return null;
}

export const categoriesApi = {
    getAll: async () => {
        if (isLocalMode()) {
            const { categories } = ensureGuestDataHydrated();
            return [...categories].sort((a, b) => a.name.localeCompare(b.name));
        }

        const { data } = await apiClient.get('/categories');
        return extractCategoryArray(data)
            .map((item) => toCategory(item))
            .filter((item): item is Category => !!item);
    },

    create: async (payload: CreateCategoryPayload) => {
        if (isLocalMode()) {
            const state = ensureGuestDataHydrated();
            const normalizedName = payload.name.trim();
            const duplicate = state.categories.find(
                (item) => item.name.trim().toLowerCase() === normalizedName.toLowerCase(),
            );

            if (duplicate) {
                throw createApiError(409, { message: 'Category already exists' }, 'Category already exists');
            }

            const category: Category = {
                id: `category_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
                name: normalizedName,
                icon: toStringOrUndefined(payload.icon),
                color: toStringOrUndefined(payload.color),
                budgetAmount:
                    typeof payload.budgetAmount === 'number' ? payload.budgetAmount : null,
                userId: getGuestUserId(),
            };

            return state.addCategory(category);
        }

        const { data } = await apiClient.post('/categories', payload);
        const normalized = toCategory(extractSingleCategory(data));
        if (!normalized) {
            throw new Error('Invalid category payload received from API.');
        }
        return normalized;
    },

    update: async (id: string, payload: UpdateCategoryPayload) => {
        if (isLocalMode()) {
            const state = ensureGuestDataHydrated();
            const nextName = typeof payload.name === 'string' ? payload.name.trim() : undefined;

            if (nextName) {
                const duplicate = state.categories.find(
                    (item) =>
                        item.id !== id &&
                        item.name.trim().toLowerCase() === nextName.toLowerCase(),
                );

                if (duplicate) {
                    throw createApiError(409, { message: 'Category already exists' }, 'Category already exists');
                }
            }

            const updated = state.updateCategory(id, (current) => ({
                ...current,
                name: nextName ?? current.name,
                icon:
                    payload.icon !== undefined
                        ? toStringOrUndefined(payload.icon)
                        : current.icon,
                color:
                    payload.color !== undefined
                        ? toStringOrUndefined(payload.color)
                        : current.color,
                budgetAmount:
                    payload.budgetAmount !== undefined
                        ? payload.budgetAmount
                        : current.budgetAmount ?? null,
            }));

            if (!updated) {
                throw createApiError(404, { message: 'Category not found' }, 'Category not found');
            }

            return updated;
        }

        const { data } = await apiClient.patch(`/categories/${id}`, payload);
        const normalized = toCategory(extractSingleCategory(data));
        if (!normalized) {
            throw new Error('Invalid category payload received from API.');
        }
        return normalized;
    },
};
