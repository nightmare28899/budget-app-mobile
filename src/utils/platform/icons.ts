const EMOJI_ICON_MAP: Record<string, string> = {
    '🍔': 'fast-food-outline',
    '🚗': 'car-sport-outline',
    '🛍️': 'bag-handle-outline',
    '🎬': 'film-outline',
    '💊': 'medkit-outline',
    '📄': 'document-text-outline',
    '📦': 'cube-outline',
};

const CATEGORY_NAME_ICON_MAP: Record<string, string> = {
    food: 'fast-food-outline',
    transport: 'car-sport-outline',
    shopping: 'bag-handle-outline',
    entertainment: 'film-outline',
    health: 'medkit-outline',
    bills: 'document-text-outline',
    other: 'cube-outline',
};

const SAFE_ICON_NAME = /^[a-z0-9-]+$/;

export function resolveCategoryIconName(
    icon?: string | null,
    categoryName?: string | null,
) {
    const normalizedIcon = icon?.trim();
    if (normalizedIcon) {
        const emojiMatch = EMOJI_ICON_MAP[normalizedIcon];
        if (emojiMatch) {
            return emojiMatch;
        }

        const lowercaseIcon = normalizedIcon.toLowerCase();
        if (SAFE_ICON_NAME.test(lowercaseIcon)) {
            return lowercaseIcon;
        }
    }

    const normalizedCategory = categoryName?.trim().toLowerCase();
    if (normalizedCategory && CATEGORY_NAME_ICON_MAP[normalizedCategory]) {
        return CATEGORY_NAME_ICON_MAP[normalizedCategory];
    }

    return 'cube-outline';
}

export function resolveSavingsGoalIconName(icon?: string | null) {
    if (!icon?.trim()) {
        return 'wallet-outline';
    }

    return resolveCategoryIconName(icon, null);
}
