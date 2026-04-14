import { SavingsGoal, SavingsTransaction } from '../../types/index';
import { toNum } from '../core/number';

export const SAVINGS_GOAL_ICON_OPTIONS = [
    'wallet-outline',
    'shield-checkmark-outline',
    'rocket-outline',
    'airplane-outline',
    'home-outline',
    'car-sport-outline',
    'school-outline',
    'briefcase-outline',
    'gift-outline',
    'barbell-outline',
] as const;

export const SAVINGS_GOAL_COLOR_OPTIONS = [
    '#10B981',
    '#0EA5E9',
    '#F59E0B',
    '#8B5CF6',
    '#EF4444',
    '#14B8A6',
    '#EC4899',
    '#F97316',
    '#6366F1',
    '#22C55E',
] as const;

function parseDateValue(value: string | undefined): number {
    if (!value) {
        return 0;
    }

    const parsed = parseSavingsDate(value).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
}

function parseSavingsDate(value: string): Date {
    const normalized = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
        return new Date(`${normalized}T12:00:00`);
    }

    return new Date(normalized);
}

function getTransactionKey(transaction: SavingsTransaction): string {
    if (transaction.id) {
        return transaction.id;
    }

    return `${transaction.goalId}:${transaction.createdAt}:${transaction.amount}`;
}

export function getSavingsProgress(
    goal: Pick<SavingsGoal, 'currentAmount' | 'targetAmount'>,
): number {
    const targetAmount = toNum(goal.targetAmount);
    if (targetAmount <= 0) {
        return 0;
    }

    return Math.min(100, Math.max(0, (toNum(goal.currentAmount) / targetAmount) * 100));
}

export function getRemainingSavings(
    goal: Pick<SavingsGoal, 'currentAmount' | 'targetAmount'>,
): number {
    return Math.max(0, toNum(goal.targetAmount) - toNum(goal.currentAmount));
}

export function sortSavingsGoals(goals: SavingsGoal[]): SavingsGoal[] {
    return [...goals].sort((left, right) => {
        return (
            parseDateValue(right.updatedAt || right.createdAt)
            - parseDateValue(left.updatedAt || left.createdAt)
        );
    });
}

export function sortSavingsTransactions(
    transactions: SavingsTransaction[],
): SavingsTransaction[] {
    return [...transactions].sort((left, right) => {
        return parseDateValue(right.createdAt) - parseDateValue(left.createdAt);
    });
}

export function mergeSavingsTransactions(
    existing: SavingsTransaction[],
    incoming: SavingsTransaction[],
): SavingsTransaction[] {
    const merged = new Map<string, SavingsTransaction>();

    for (const transaction of existing) {
        merged.set(getTransactionKey(transaction), transaction);
    }

    for (const transaction of incoming) {
        merged.set(getTransactionKey(transaction), transaction);
    }

    return sortSavingsTransactions(Array.from(merged.values()));
}

export function formatSavingsDateTime(
    value: string,
    locale: 'es-MX' | 'en-US' = 'es-MX',
): string {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return value;
    }

    const dateLabel = parsed.toLocaleDateString(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
    const timeLabel = parsed.toLocaleTimeString(locale, {
        hour: 'numeric',
        minute: '2-digit',
    });

    return `${dateLabel} • ${timeLabel}`;
}

export function formatSavingsDate(
    value: string,
    locale: 'es-MX' | 'en-US' = 'es-MX',
): string {
    const parsed = parseSavingsDate(value);
    if (Number.isNaN(parsed.getTime())) {
        return value;
    }

    return parsed.toLocaleDateString(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

export function resolveSavingsGoalColor(
    value: string | null | undefined,
    fallback = '#10B981',
): string {
    if (typeof value !== 'string') {
        return fallback;
    }

    const normalized = value.trim().toUpperCase();
    if (/^#([0-9A-F]{6})$/.test(normalized)) {
        return normalized;
    }

    return fallback;
}

export function withSavingsAlpha(hex: string, alpha: number): string {
    const normalized = hex.replace('#', '').trim();
    const full = normalized.length === 3
        ? normalized.split('').map((char) => `${char}${char}`).join('')
        : normalized;

    const r = Number.parseInt(full.slice(0, 2), 16);
    const g = Number.parseInt(full.slice(2, 4), 16);
    const b = Number.parseInt(full.slice(4, 6), 16);

    if (
        Number.isNaN(r)
        || Number.isNaN(g)
        || Number.isNaN(b)
    ) {
        return `rgba(255,255,255,${alpha})`;
    }

    return `rgba(${r},${g},${b},${alpha})`;
}
