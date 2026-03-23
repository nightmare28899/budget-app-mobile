export type ThemeMode =
    | 'system'
    | 'light'
    | 'dark'
    | 'custom-1'
    | 'custom-2'
    | 'custom-3';

export type ThemeId = Exclude<ThemeMode, 'system'>;

export type SemanticColors = {
    primaryAction: string;
    primaryActionHover: string;
    accent: string;
    accentSoft: string;
    success: string;
    warning: string;
    error: string;
    info: string;

    background: string;
    surface: string;
    surfaceElevated: string;
    surfaceCard: string;

    textPrimary: string;
    textSecondary: string;
    textMuted: string;

    border: string;
    overlay: string;
    shimmer: string;

    budgetSafe: string;
    budgetWarning: string;
    budgetDanger: string;

    // Category defaults
    categoryFood: string;
    categoryTransport: string;
    categoryShopping: string;
    categoryEntertainment: string;
    categoryHealth: string;
    categoryBills: string;
    categoryOther: string;

    // Legacy aliases for current codebase compatibility
    primary: string;
    primaryLight: string;
    primaryDark: string;
    secondary: string;
    secondaryLight: string;
    secondaryDark: string;
    accentLight: string;
};

export type ThemeDefinition = {
    id: ThemeId;
    label: string;
    colors: SemanticColors;
};

const darkBase: ThemeDefinition = {
    id: 'dark',
    label: 'Dark',
    colors: {
        primaryAction: '#7C3AED',
        primaryActionHover: '#6D28D9',
        accent: '#7C3AED',
        accentSoft: '#A78BFA',
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#38BDF8',

        // Dark gray base (not pure black)
        background: '#12141F',
        surface: '#171A28',
        surfaceElevated: '#1D2133',
        surfaceCard: '#222742',

        textPrimary: '#F8FAFC',
        textSecondary: '#CBD5E1',
        textMuted: '#94A3B8',

        border: '#303750',
        overlay: 'rgba(10, 12, 18, 0.72)',
        shimmer: '#242A40',

        budgetSafe: '#10B981',
        budgetWarning: '#F59E0B',
        budgetDanger: '#EF4444',

        categoryFood: '#FF6B6B',
        categoryTransport: '#4ECDC4',
        categoryShopping: '#45B7D1',
        categoryEntertainment: '#96CEB4',
        categoryHealth: '#FFEAA7',
        categoryBills: '#DDA0DD',
        categoryOther: '#95A5A6',

        primary: '#7C3AED',
        primaryLight: '#A78BFA',
        primaryDark: '#6D28D9',
        secondary: '#06B6D4',
        secondaryLight: '#67E8F9',
        secondaryDark: '#0891B2',
        accentLight: '#C4B5FD',
    },
};

const lightBase: ThemeDefinition = {
    id: 'light',
    label: 'Light',
    colors: {
        primaryAction: '#5B21B6',
        primaryActionHover: '#4C1D95',
        accent: '#7C3AED',
        accentSoft: '#A78BFA',
        success: '#16A34A',
        warning: '#D97706',
        error: '#DC2626',
        info: '#0284C7',

        background: '#F5F7FA',
        surface: '#FFFFFF',
        surfaceElevated: '#F8FAFC',
        surfaceCard: '#FFFFFF',

        textPrimary: '#1A1C2E',
        textSecondary: '#344054',
        textMuted: '#667085',

        border: '#D0D5DD',
        overlay: 'rgba(15, 23, 42, 0.18)',
        shimmer: '#E4E7EC',

        budgetSafe: '#16A34A',
        budgetWarning: '#D97706',
        budgetDanger: '#DC2626',

        categoryFood: '#E11D48',
        categoryTransport: '#0EA5E9',
        categoryShopping: '#7C3AED',
        categoryEntertainment: '#14B8A6',
        categoryHealth: '#F59E0B',
        categoryBills: '#9333EA',
        categoryOther: '#64748B',

        primary: '#5B21B6',
        primaryLight: '#8B5CF6',
        primaryDark: '#4C1D95',
        secondary: '#0891B2',
        secondaryLight: '#22D3EE',
        secondaryDark: '#0E7490',
        accentLight: '#C4B5FD',
    },
};

const midnightBlue: ThemeDefinition = {
    id: 'custom-1',
    label: 'Midnight Blue',
    colors: {
        primaryAction: '#38BDF8',
        primaryActionHover: '#0EA5E9',
        accent: '#38BDF8',
        accentSoft: '#7DD3FC',
        success: '#22C55E',
        warning: '#F59E0B',
        error: '#F43F5E',
        info: '#38BDF8',

        background: '#0F172A',
        surface: '#172554',
        surfaceElevated: '#1E293B',
        surfaceCard: '#1E3A8A',

        textPrimary: '#F8FAFC',
        textSecondary: '#CBD5E1',
        textMuted: '#94A3B8',

        border: '#334155',
        overlay: 'rgba(2, 6, 23, 0.72)',
        shimmer: '#1E293B',

        budgetSafe: '#22C55E',
        budgetWarning: '#F59E0B',
        budgetDanger: '#F43F5E',

        categoryFood: '#FB7185',
        categoryTransport: '#22D3EE',
        categoryShopping: '#38BDF8',
        categoryEntertainment: '#4ADE80',
        categoryHealth: '#FCD34D',
        categoryBills: '#A78BFA',
        categoryOther: '#94A3B8',

        primary: '#38BDF8',
        primaryLight: '#7DD3FC',
        primaryDark: '#0EA5E9',
        secondary: '#22D3EE',
        secondaryLight: '#67E8F9',
        secondaryDark: '#0891B2',
        accentLight: '#93C5FD',
    },
};

const emerald: ThemeDefinition = {
    id: 'custom-2',
    label: 'Emerald',
    colors: {
        primaryAction: '#10B981',
        primaryActionHover: '#059669',
        accent: '#34D399',
        accentSoft: '#6EE7B7',
        success: '#16A34A',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#22C55E',

        background: '#0A1914',
        surface: '#11231C',
        surfaceElevated: '#143227',
        surfaceCard: '#184235',

        textPrimary: '#ECFDF5',
        textSecondary: '#A7F3D0',
        textMuted: '#6EE7B7',

        border: '#1F5B46',
        overlay: 'rgba(6, 14, 12, 0.72)',
        shimmer: '#1A3D32',

        budgetSafe: '#22C55E',
        budgetWarning: '#F59E0B',
        budgetDanger: '#EF4444',

        categoryFood: '#FB7185',
        categoryTransport: '#2DD4BF',
        categoryShopping: '#34D399',
        categoryEntertainment: '#4ADE80',
        categoryHealth: '#FACC15',
        categoryBills: '#A78BFA',
        categoryOther: '#94A3B8',

        primary: '#10B981',
        primaryLight: '#34D399',
        primaryDark: '#059669',
        secondary: '#14B8A6',
        secondaryLight: '#5EEAD4',
        secondaryDark: '#0F766E',
        accentLight: '#86EFAC',
    },
};

const amethystPurple: ThemeDefinition = {
    id: 'custom-3',
    label: 'Amethyst Purple',
    colors: {
        primaryAction: '#A855F7',
        primaryActionHover: '#9333EA',
        accent: '#C084FC',
        accentSoft: '#E9D5FF',
        success: '#34D399',
        warning: '#FBBF24',
        error: '#FB7185',
        info: '#A78BFA',

        background: '#150E24',
        surface: '#211138',
        surfaceElevated: '#2B1650',
        surfaceCard: '#341A64',

        textPrimary: '#F5F3FF',
        textSecondary: '#DDD6FE',
        textMuted: '#C4B5FD',

        border: '#4C1D95',
        overlay: 'rgba(16, 9, 30, 0.72)',
        shimmer: '#3B1D6B',

        budgetSafe: '#34D399',
        budgetWarning: '#FBBF24',
        budgetDanger: '#FB7185',

        categoryFood: '#FB7185',
        categoryTransport: '#67E8F9',
        categoryShopping: '#C084FC',
        categoryEntertainment: '#A78BFA',
        categoryHealth: '#FDE68A',
        categoryBills: '#D8B4FE',
        categoryOther: '#A78BFA',

        primary: '#A855F7',
        primaryLight: '#C084FC',
        primaryDark: '#9333EA',
        secondary: '#8B5CF6',
        secondaryLight: '#C4B5FD',
        secondaryDark: '#7C3AED',
        accentLight: '#E9D5FF',
    },
};

export const themeDefinitions: Record<ThemeId, ThemeDefinition> = {
    light: lightBase,
    dark: darkBase,
    'custom-1': midnightBlue,
    'custom-2': emerald,
    'custom-3': amethystPurple,
};

export const themeOptions: ThemeDefinition[] = [
    lightBase,
    darkBase,
    midnightBlue,
    emerald,
    amethystPurple,
];

export function resolveThemeId(mode: ThemeMode, systemIsDark: boolean): ThemeId {
    if (mode === 'system') {
        return systemIsDark ? 'dark' : 'light';
    }
    return mode;
}
