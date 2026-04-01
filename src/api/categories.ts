import apiClient from './client';
import { Category } from '../types';
import { isLocalMode } from '../modules/access/localMode';
import {
    ensureGuestDataHydrated,
    getGuestUserId,
} from '../store/guestDataStore';

export interface CreateCategoryPayload {
    name: string;
    icon?: string;
    color?: string;
}

function toStringOrUndefined(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim().length ? value : undefined;
}

function toCategory(raw: any): Category | null {
    if (!raw || typeof raw !== 'object') {
        return null;
    }

    const id = toStringOrUndefined(raw.id ?? raw.categoryId);
    const name = toStringOrUndefined(raw.name);
    if (!id || !name) {
        return null;
    }

    return {
        id,
        name,
        icon: toStringOrUndefined(raw.icon),
        color: toStringOrUndefined(raw.color),
        userId: toStringOrUndefined(raw.userId) ?? '',
    };
}

function extractCategoryArray(raw: any): any[] {
    if (Array.isArray(raw)) {
        return raw;
    }

    if (!raw || typeof raw !== 'object') {
        return [];
    }

    if (Array.isArray(raw.categories)) {
        return raw.categories;
    }

    if (Array.isArray(raw.items)) {
        return raw.items;
    }

    if (Array.isArray(raw.data)) {
        return raw.data;
    }

    if (raw.data && typeof raw.data === 'object') {
        return extractCategoryArray(raw.data);
    }

    if (raw.payload && typeof raw.payload === 'object') {
        return extractCategoryArray(raw.payload);
    }

    if (raw.result && typeof raw.result === 'object') {
        return extractCategoryArray(raw.result);
    }

    return [];
}

function extractSingleCategory(raw: any): any {
    if (!raw || typeof raw !== 'object') {
        return null;
    }

    if (raw.id || raw.categoryId) {
        return raw;
    }

    if (raw.category && typeof raw.category === 'object') {
        return extractSingleCategory(raw.category);
    }

    if (raw.data && typeof raw.data === 'object') {
        return extractSingleCategory(raw.data);
    }

    if (raw.payload && typeof raw.payload === 'object') {
        return extractSingleCategory(raw.payload);
    }

    if (raw.result && typeof raw.result === 'object') {
        return extractSingleCategory(raw.result);
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
                const error: any = new Error('Category already exists');
                error.response = { status: 409, data: { message: 'Category already exists' } };
                throw error;
            }

            const category: Category = {
                id: `category_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
                name: normalizedName,
                icon: toStringOrUndefined(payload.icon),
                color: toStringOrUndefined(payload.color),
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
};
