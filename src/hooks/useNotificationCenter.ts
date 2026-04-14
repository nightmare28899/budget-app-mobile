import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../api/resources/analytics';
import { savingsApi } from '../api/resources/savings';
import { subscriptionsApi } from '../api/resources/subscriptions';
import { useDashboard } from './useDashboard';
import { useCreditCardsOverview } from './useCreditCardsOverview';
import { useI18n } from './useI18n';
import { useAuthStore } from '../store/authStore';
import { getCurrencyLocale } from '../utils/domain/currency';
import { formatCurrency } from '../utils/core/format';
import { toNum } from '../utils/core/number';
import { usePremiumAccess } from './usePremiumAccess';

export type NotificationCenterTone = 'danger' | 'warning' | 'info' | 'success';

export type NotificationCenterAction =
    | 'add-income'
    | 'open-analytics'
    | 'open-category-budgets'
    | 'open-credit-cards'
    | 'open-subscriptions'
    | 'open-upcoming-subscriptions'
    | 'open-savings'
    | 'open-savings-goal';

export type NotificationCenterItem = {
    id: string;
    icon: string;
    tone: NotificationCenterTone;
    title: string;
    description: string;
    ctaLabel: string;
    action: NotificationCenterAction;
    kind: 'attention' | 'suggestion';
    priority: number;
    goalId?: string;
    goalTitle?: string;
};

function toShortDate(date: string | null | undefined, locale: 'es-MX' | 'en-US') {
    if (!date) {
        return null;
    }

    const parsed = new Date(`${date}T12:00:00`);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }

    return new Intl.DateTimeFormat(locale, {
        month: 'short',
        day: 'numeric',
    }).format(parsed);
}

function daysUntil(targetDate?: string | null) {
    if (!targetDate) {
        return null;
    }

    const target = new Date(`${targetDate}T12:00:00`);
    if (Number.isNaN(target.getTime())) {
        return null;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    return Math.round((target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

export function useNotificationCenter() {
    const { t, language } = useI18n();
    const locale = getCurrencyLocale(language);
    const user = useAuthStore((state) => state.user);
    const { hasPremium } = usePremiumAccess();
    const {
        todayData,
        budgetSummary,
        incomeSummary,
        dashboardInsights,
        isLoading: dashboardLoading,
        todayError,
        budgetSummaryError,
        incomeSummaryError,
        dashboardInsightsError,
        refetch: refetchDashboard,
    } = useDashboard();
    const {
        data: categoryBudgetOverview,
        isLoading: categoryBudgetsLoading,
        error: categoryBudgetsError,
        refetch: refetchCategoryBudgets,
    } = useQuery({
        queryKey: ['analytics', 'category-budgets', 'notifications'],
        queryFn: () => analyticsApi.getCategoryBudgetOverview(),
    });
    const {
        data: upcomingSubscriptions,
        isLoading: upcomingLoading,
        error: upcomingError,
        refetch: refetchUpcomingSubscriptions,
    } = useQuery({
        queryKey: ['subscriptions', 'upcoming', 'notifications', 7],
        queryFn: () => subscriptionsApi.getUpcoming(7),
    });
    const {
        data: savingsGoals,
        isLoading: savingsGoalsLoading,
        error: savingsGoalsError,
        refetch: refetchSavingsGoals,
    } = useQuery({
        queryKey: ['savings', 'goals', 'notifications'],
        queryFn: savingsApi.getSavingsGoals,
    });
    const {
        overview: creditCardsOverview,
        isLoading: creditCardsLoading,
        refetch: refetchCreditCards,
    } = useCreditCardsOverview({
        includeInactive: true,
        enabled: hasPremium,
    });

    const items = useMemo(() => {
        const nextItems: NotificationCenterItem[] = [];
        const currency = todayData?.currency ?? user?.currency ?? 'MXN';
        const totalIncome = toNum(incomeSummary?.totalIncome);
        const safeToSpend = budgetSummary?.safeToSpend != null
            ? toNum(budgetSummary.safeToSpend)
            : toNum(budgetSummary?.budgetAmount) - toNum(budgetSummary?.reservedSubscriptions);
        const netCashflow = toNum(incomeSummary?.net);

        if (totalIncome <= 0) {
            nextItems.push({
                id: 'income-needed',
                icon: 'trending-up-outline',
                tone: 'info',
                title: t('notifications.incomeTitle'),
                description: t('notifications.incomeDescription'),
                ctaLabel: t('notifications.addIncomeCta'),
                action: 'add-income',
                kind: 'suggestion',
                priority: 92,
            });
        }

        if ((categoryBudgetOverview?.overBudgetCount ?? 0) > 0) {
            nextItems.push({
                id: 'category-over-budget',
                icon: 'pie-chart-outline',
                tone: 'danger',
                title: t('notifications.categoryOverBudgetTitle'),
                description: t('notifications.categoryOverBudgetDescription', {
                    count: categoryBudgetOverview?.overBudgetCount ?? 0,
                }),
                ctaLabel: t('notifications.reviewBudgetsCta'),
                action: 'open-category-budgets',
                kind: 'attention',
                priority: 100,
            });
        } else if ((categoryBudgetOverview?.watchCount ?? 0) > 0) {
            nextItems.push({
                id: 'category-watch-budget',
                icon: 'pie-chart-outline',
                tone: 'warning',
                title: t('notifications.categoryWatchTitle'),
                description: t('notifications.categoryWatchDescription', {
                    count: categoryBudgetOverview?.watchCount ?? 0,
                }),
                ctaLabel: t('notifications.reviewBudgetsCta'),
                action: 'open-category-budgets',
                kind: 'attention',
                priority: 86,
            });
        }

        if (
            dashboardInsights?.weeklySpend
            && dashboardInsights.weeklySpend.changeAmount > 0
            && dashboardInsights.weeklySpend.totalSpent > 0
        ) {
            nextItems.push({
                id: 'spending-pace',
                icon: 'pulse-outline',
                tone: safeToSpend > 0 ? 'warning' : 'danger',
                title: t('notifications.spendingPaceTitle'),
                description: safeToSpend > 0
                    ? t('notifications.spendingPaceDescription', {
                        amount: formatCurrency(
                            Math.abs(dashboardInsights.weeklySpend.changeAmount),
                            currency,
                            locale,
                        ),
                        safeAmount: formatCurrency(
                            Math.max(safeToSpend, 0),
                            currency,
                            locale,
                        ),
                    })
                    : t('notifications.spendingPaceNoRoomDescription', {
                        amount: formatCurrency(
                            Math.abs(dashboardInsights.weeklySpend.changeAmount),
                            currency,
                            locale,
                        ),
                    }),
                ctaLabel: t('notifications.reviewSpendingCta'),
                action: 'open-analytics',
                kind: 'attention',
                priority: safeToSpend > 0 ? 82 : 96,
            });
        }

        const upcomingSoon = (upcomingSubscriptions ?? []).filter((item) => item.daysRemaining <= 3);
        if (upcomingSoon.length > 0) {
            const upcomingTotal = upcomingSoon.reduce((sum, item) => sum + toNum(item.amount), 0);
            nextItems.push({
                id: 'upcoming-subscriptions',
                icon: 'albums-outline',
                tone: 'warning',
                title: t('notifications.upcomingSubscriptionsTitle', {
                    count: upcomingSoon.length,
                }),
                description: t('notifications.upcomingSubscriptionsDescription', {
                    amount: formatCurrency(upcomingTotal, currency, locale),
                    name: upcomingSoon[0]?.name ?? t('subscriptions.title'),
                }),
                ctaLabel: t('notifications.openUpcomingCta'),
                action: 'open-upcoming-subscriptions',
                kind: 'attention',
                priority: 88,
            });
        }

        if (hasPremium && creditCardsOverview) {
            creditCardsOverview.cards
                .filter((card) => card.isActive && card.flags.paymentDueSoon)
                .sort((left, right) => {
                    return (left.schedule.daysUntilPaymentDue ?? 99) - (right.schedule.daysUntilPaymentDue ?? 99);
                })
                .slice(0, 2)
                .forEach((card) => {
                    nextItems.push({
                        id: `card-payment-${card.id}`,
                        icon: 'card-outline',
                        tone: 'warning',
                        title: t('notifications.cardPaymentTitle', {
                            name: formatCreditCardName(card.name, card.last4),
                        }),
                        description: t('notifications.cardPaymentDescription', {
                            amount: formatCurrency(card.currentCycle.spend, currency, locale),
                            date: toShortDate(card.schedule.nextPaymentDueDate, locale)
                                ?? t('common.notAvailable'),
                        }),
                        ctaLabel: t('notifications.openCardsCta'),
                        action: 'open-credit-cards',
                        kind: 'attention',
                        priority: 94,
                    });
                });

            creditCardsOverview.cards
                .filter((card) => card.isActive && (card.flags.overLimit || card.flags.highUtilization))
                .sort((left, right) => {
                    return (right.creditStatus.utilizationPercent ?? 0) - (left.creditStatus.utilizationPercent ?? 0);
                })
                .slice(0, 2)
                .forEach((card) => {
                    nextItems.push({
                        id: `card-usage-${card.id}`,
                        icon: 'warning-outline',
                        tone: card.flags.overLimit ? 'danger' : 'warning',
                        title: card.flags.overLimit
                            ? t('notifications.cardOverLimitTitle', {
                                name: formatCreditCardName(card.name, card.last4),
                            })
                            : t('notifications.cardUsageTitle', {
                                name: formatCreditCardName(card.name, card.last4),
                            }),
                        description: card.flags.overLimit
                            ? t('notifications.cardOverLimitDescription', {
                                amount: formatCurrency(
                                    Math.abs(card.creditStatus.availableCredit ?? 0),
                                    currency,
                                    locale,
                                ),
                            })
                            : t('notifications.cardUsageDescription', {
                                percent: `${card.creditStatus.utilizationPercent ?? 0}%`,
                                amount: formatCurrency(
                                    card.creditStatus.availableCredit ?? 0,
                                    currency,
                                    locale,
                                ),
                            }),
                        ctaLabel: t('notifications.openCardsCta'),
                        action: 'open-credit-cards',
                        kind: 'attention',
                        priority: card.flags.overLimit ? 98 : 85,
                    });
                });

            const missingLimitCount = creditCardsOverview.cards.filter((card) => {
                return card.isActive && card.flags.missingLimit;
            }).length;
            if (missingLimitCount > 0) {
                nextItems.push({
                    id: 'card-limit-missing',
                    icon: 'card-outline',
                    tone: 'info',
                    title: t('notifications.cardLimitMissingTitle'),
                    description: t('notifications.cardLimitMissingDescription', {
                        count: missingLimitCount,
                    }),
                    ctaLabel: t('notifications.openCardsCta'),
                    action: 'open-credit-cards',
                    kind: 'suggestion',
                    priority: 66,
                });
            }
        }

        if (
            dashboardInsights?.subscriptionSavings
            && dashboardInsights.subscriptionSavings.projectedSavings > 0
        ) {
            nextItems.push({
                id: 'subscription-savings',
                icon: 'albums-outline',
                tone: 'warning',
                title: t('notifications.subscriptionSavingsTitle'),
                description: t('notifications.subscriptionSavingsDescription', {
                    amount: formatCurrency(
                        dashboardInsights.subscriptionSavings.projectedSavings,
                        currency,
                        locale,
                    ),
                    months: dashboardInsights.subscriptionSavings.horizonMonths,
                }),
                ctaLabel: t('notifications.trimSubscriptionsCta'),
                action: 'open-subscriptions',
                kind: 'suggestion',
                priority: 72,
            });
        }

        const nextSavingsGoal = (savingsGoals ?? [])
            .filter((goal) => goal.targetDate && toNum(goal.currentAmount) < toNum(goal.targetAmount))
            .map((goal) => ({
                ...goal,
                remaining: Math.max(0, toNum(goal.targetAmount) - toNum(goal.currentAmount)),
                daysLeft: daysUntil(goal.targetDate),
            }))
            .filter((goal) => goal.daysLeft != null && (goal.daysLeft ?? 99) >= 0 && (goal.daysLeft ?? 99) <= 30)
            .sort((left, right) => (left.daysLeft ?? 99) - (right.daysLeft ?? 99))[0];

        if (nextSavingsGoal) {
            nextItems.push({
                id: `savings-goal-${nextSavingsGoal.id}`,
                icon: 'wallet-outline',
                tone: 'warning',
                title: t('notifications.savingsGoalTitle', {
                    name: nextSavingsGoal.title,
                }),
                description: t('notifications.savingsGoalDescription', {
                    amount: formatCurrency(nextSavingsGoal.remaining, currency, locale),
                    days: nextSavingsGoal.daysLeft ?? 0,
                }),
                ctaLabel: t('notifications.openSavingsGoalCta'),
                action: 'open-savings-goal',
                goalId: nextSavingsGoal.id,
                goalTitle: nextSavingsGoal.title,
                kind: 'attention',
                priority: 74,
            });
        } else if ((savingsGoals?.length ?? 0) === 0 && Math.max(netCashflow, safeToSpend) > 0) {
            nextItems.push({
                id: 'start-savings-goal',
                icon: 'wallet-outline',
                tone: 'success',
                title: t('notifications.startSavingsTitle'),
                description: t('notifications.startSavingsDescription', {
                    amount: formatCurrency(Math.max(netCashflow, safeToSpend), currency, locale),
                }),
                ctaLabel: t('notifications.openSavingsCta'),
                action: 'open-savings',
                kind: 'suggestion',
                priority: 64,
            });
        }

        return nextItems
            .sort((left, right) => right.priority - left.priority)
            .slice(0, 10);
    }, [
        budgetSummary?.budgetAmount,
        budgetSummary?.reservedSubscriptions,
        budgetSummary?.safeToSpend,
        categoryBudgetOverview?.overBudgetCount,
        categoryBudgetOverview?.watchCount,
        creditCardsOverview,
        dashboardInsights,
        hasPremium,
        incomeSummary?.net,
        incomeSummary?.totalIncome,
        locale,
        savingsGoals,
        t,
        todayData?.currency,
        upcomingSubscriptions,
        user?.currency,
    ]);

    const attentionItems = items.filter((item) => item.kind === 'attention');
    const suggestionItems = items.filter((item) => item.kind === 'suggestion');
    const isLoading = dashboardLoading || categoryBudgetsLoading || upcomingLoading || savingsGoalsLoading || (hasPremium && creditCardsLoading);
    const hasError = !!todayError
        || !!budgetSummaryError
        || !!incomeSummaryError
        || !!dashboardInsightsError
        || !!categoryBudgetsError
        || !!upcomingError
        || !!savingsGoalsError;

    return {
        items,
        attentionItems,
        suggestionItems,
        summary: {
            total: items.length,
            attentionCount: attentionItems.length,
            suggestionCount: suggestionItems.length,
            paymentCount: attentionItems.filter((item) => item.action === 'open-credit-cards' || item.action === 'open-upcoming-subscriptions').length,
        },
        isLoading,
        hasError,
        refetch: () => {
            refetchDashboard();
            refetchCategoryBudgets();
            refetchUpcomingSubscriptions();
            refetchSavingsGoals();
            if (hasPremium) {
                refetchCreditCards();
            }
        },
    };
}

function formatCreditCardName(name?: string | null, last4?: string | null) {
    const cleanName = String(name ?? '').trim();
    const cleanLast4 = String(last4 ?? '').trim();

    if (cleanName && cleanLast4) {
        return `${cleanName} ••${cleanLast4}`;
    }

    return cleanName || cleanLast4 || 'Card';
}
