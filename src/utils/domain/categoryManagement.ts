export const CATEGORY_NAME_MAX_LENGTH = 60;
export const CATEGORY_ICON_MAX_LENGTH = 20;
const CATEGORY_COLOR_PATTERN = /^#(?:[0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

export const CATEGORY_IN_USE_CODE = 'CATEGORY_IN_USE';
export const CATEGORY_IN_USE_MESSAGE = 'categoryDeleteBlocked';

export type CategoryEditableFields = {
    name: string;
    icon?: string | null;
    color?: string | null;
};

export type CategoryUpdateFields = {
    name?: string;
    icon?: string;
    color?: string;
};

/**
 * Builds the PATCH /categories/:id body. The backend runs ValidationPipe with
 * forbidNonWhitelisted, so only name/icon/color (changed values only) are sent.
 */
export function buildCategoryUpdatePayload(
    next: Partial<CategoryEditableFields>,
    original: CategoryEditableFields,
): CategoryUpdateFields {
    const payload: CategoryUpdateFields = {};

    if (next.name !== undefined) {
        const name = next.name.trim();
        if (!name || name.length > CATEGORY_NAME_MAX_LENGTH) {
            throw new Error('Invalid category name');
        }
        if (name !== (original.name ?? '').trim()) {
            payload.name = name;
        }
    }

    if (next.icon !== undefined && next.icon !== null) {
        const icon = next.icon.trim();
        if (!icon || icon.length > CATEGORY_ICON_MAX_LENGTH) {
            throw new Error('Invalid category icon');
        }
        if (icon !== (original.icon ?? '')) {
            payload.icon = icon;
        }
    }

    if (next.color !== undefined && next.color !== null) {
        const color = next.color.trim();
        if (!CATEGORY_COLOR_PATTERN.test(color)) {
            throw new Error('Invalid category color');
        }
        if (color !== (original.color ?? '')) {
            payload.color = color;
        }
    }

    return payload;
}

/** True when DELETE /categories/:id was rejected because the category is in use. */
export function isCategoryInUseError(error: unknown): boolean {
    const response = (error as { response?: { status?: unknown; data?: unknown } } | null)
        ?.response;
    if (!response || response.status !== 409) {
        return false;
    }

    const data = response.data as { code?: unknown; message?: unknown } | undefined;
    return (
        data?.code === CATEGORY_IN_USE_CODE ||
        data?.message === CATEGORY_IN_USE_MESSAGE
    );
}
