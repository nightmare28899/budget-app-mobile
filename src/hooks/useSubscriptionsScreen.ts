import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Easing as ReanimatedEasing,
    runOnJS,
    useAnimatedReaction,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import { subscriptionsApi } from '../api/subscriptions';
import { useSubscriptionManager } from '../modules/subscriptions/useSubscriptionManager';
import { useAuthStore } from '../store/authStore';
import { Subscription } from '../types';
import { softHaptic } from '../utils/haptics';
import {
    inferSubscriptionColor,
    inferSubscriptionIcon,
} from '../utils/subscriptions';
import { useI18n } from './useI18n';
import { useAppAlert } from '../components/alerts/AlertProvider';

type NavigationLike = {
    navigate: (...args: any[]) => void;
    addListener: (event: any, callback: (...args: any[]) => void) => () => void;
    setParams: (params: any) => void;
};

type UseSubscriptionsScreenParams = {
    navigation: NavigationLike;
    successMessage?: string;
    upcomingOnly?: boolean;
    upcomingDays?: number;
};

function getChargeDateFromDaysRemaining(daysRemaining: number): string {
    const date = new Date();
    const safeDays = Number.isFinite(daysRemaining)
        ? Math.max(0, Math.trunc(daysRemaining))
        : 0;
    date.setDate(date.getDate() + safeDays);
    return date.toISOString().slice(0, 10);
}

function toDateOnly(value: string | null | undefined): string | null {
    if (!value) {
        return null;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }

    return parsed.toISOString().slice(0, 10);
}

export function useSubscriptionsScreen({
    navigation,
    successMessage,
    upcomingOnly = false,
    upcomingDays = 3,
}: UseSubscriptionsScreenParams) {
    const user = useAuthStore((s) => s.user);
    const { alert } = useAppAlert();
    const { t, tPlural, language } = useI18n();
    const {
        isLoading,
        isRefreshing,
        subscriptions: storedSubscriptions,
        monthlyTotal,
        monthlyCurrencyBreakdown,
        activeCount,
        refetch,
        removeSubscription,
    } = useSubscriptionManager();

    const {
        data: upcomingCharges = [],
        isLoading: upcomingLoading,
        isRefetching: upcomingRefetching,
        error: upcomingError,
        refetch: refetchUpcoming,
    } = useQuery({
        queryKey: ['subscriptions', 'upcoming', upcomingDays],
        queryFn: () => subscriptionsApi.getUpcoming(upcomingDays),
        enabled: upcomingOnly,
    });

    const upcomingSubscriptions = useMemo<Subscription[]>(() => {
        const usedIds = new Set<string>();

        return upcomingCharges.map((item, index) => {
            const fallbackChargeDate = getChargeDateFromDaysRemaining(item.daysRemaining);
            const explicitChargeDate =
                toDateOnly(item.chargeDate) || toDateOnly(item.nextPaymentDate);
            const chargeDate = explicitChargeDate || fallbackChargeDate;
            const normalizedName = item.name.trim().toLowerCase();

            const explicitId = item.subscriptionId || item.id;
            let matchedSubscription: Subscription | undefined;
            if (explicitId) {
                const byId = storedSubscriptions.find((subscription) => subscription.id === explicitId);
                if (byId && !usedIds.has(byId.id)) {
                    matchedSubscription = byId;
                }
            }

            if (!matchedSubscription) {
                const candidateMatches = storedSubscriptions.filter((subscription) => {
                    if (usedIds.has(subscription.id)) {
                        return false;
                    }

                    const sameName = subscription.name.trim().toLowerCase() === normalizedName;
                    const sameAmount = Math.abs(subscription.cost - item.amount) < 0.01;
                    return sameName && sameAmount;
                });

                if (candidateMatches.length) {
                    const exactDateMatch = candidateMatches.find((subscription) => {
                        const subscriptionDate =
                            subscription.chargeDate || toDateOnly(subscription.nextPaymentDate);
                        return subscriptionDate === chargeDate;
                    });
                    matchedSubscription = exactDateMatch || candidateMatches[0];
                }
            }

            if (matchedSubscription) {
                usedIds.add(matchedSubscription.id);
                return {
                    ...matchedSubscription,
                    chargeDate,
                    nextPaymentDate:
                        matchedSubscription.nextPaymentDate ||
                        `${chargeDate}T12:00:00.000Z`,
                };
            }

            return {
                id: `upcoming-${item.name}-${item.amount}-${item.daysRemaining}-${index}`,
                name: item.name,
                cost: item.amount,
                currency: item.currency || user?.currency || 'MXN',
                billingCycle: 'MONTHLY',
                nextPaymentDate: `${chargeDate}T12:00:00.000Z`,
                reminderDays: upcomingDays,
                isActive: true,
                logoUrl: null,
                hexColor: null,
                userId: user?.id,
                chargeDate,
                color: inferSubscriptionColor(item.name),
                icon: inferSubscriptionIcon(item.name),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
        });
    }, [upcomingCharges, upcomingDays, user?.currency, user?.id, storedSubscriptions]);

    const visibleSubscriptions = upcomingOnly
        ? upcomingSubscriptions
        : storedSubscriptions;
    const totalToDisplay = useMemo(
        () =>
            upcomingOnly
                ? upcomingSubscriptions.reduce((sum, item) => sum + item.cost, 0)
                : monthlyTotal,
        [monthlyTotal, upcomingOnly, upcomingSubscriptions],
    );

    const [animatedTotal, setAnimatedTotal] = useState(totalToDisplay);
    const previousTotal = useRef(totalToDisplay);
    const handlingBackRef = useRef(false);
    const activeSwipeableRef = useRef<any>(null);
    const activeSwipeableIdRef = useRef<string | null>(null);
    const animatedTotalValue = useSharedValue(totalToDisplay);
    const locale: 'es-MX' | 'en-US' = language === 'es' ? 'es-MX' : 'en-US';

    useEffect(() => {
        if (successMessage) {
            alert(t('common.success'), successMessage);
            navigation.setParams({ successMessage: undefined });
        }
    }, [alert, navigation, successMessage, t]);

    useEffect(() => {
        const isRising = totalToDisplay > previousTotal.current;
        animatedTotalValue.value = withTiming(totalToDisplay, {
            duration: isRising ? 900 : 400,
            easing: ReanimatedEasing.out(ReanimatedEasing.cubic),
        });
        previousTotal.current = totalToDisplay;
    }, [animatedTotalValue, totalToDisplay]);

    useAnimatedReaction(
        () => animatedTotalValue.value,
        (nextValue) => {
            runOnJS(setAnimatedTotal)(nextValue);
        },
    );

    const goHomeOnBack = useCallback(() => {
        if (handlingBackRef.current) {
            return;
        }

        handlingBackRef.current = true;
        navigation.navigate('Tabs', { screen: 'Dashboard' });
        setTimeout(() => {
            handlingBackRef.current = false;
        }, 0);
    }, [navigation]);

    useEffect(() => {
        const unsubscribe = navigation.addListener('beforeRemove', (event: any) => {
            if (handlingBackRef.current) {
                return;
            }

            const actionType = event.data.action?.type;
            const isBackAction =
                actionType === 'GO_BACK'
                || actionType === 'POP';

            if (!isBackAction) {
                return;
            }

            event.preventDefault();
            goHomeOnBack();
        });

        return unsubscribe;
    }, [goHomeOnBack, navigation]);

    useFocusEffect(
        useCallback(() => {
            activeSwipeableRef.current?.close?.();
            activeSwipeableRef.current = null;
            activeSwipeableIdRef.current = null;

            return () => {
                activeSwipeableRef.current?.close?.();
                activeSwipeableRef.current = null;
                activeSwipeableIdRef.current = null;
            };
        }, []),
    );

    const activeCountLabel = useMemo(() => {
        if (upcomingOnly) {
            return t('dashboard.upcomingSummary', { count: visibleSubscriptions.length });
        }
        return tPlural('subscriptions.activeCount', activeCount);
    }, [activeCount, t, tPlural, upcomingOnly, visibleSubscriptions.length]);

    const onEditSubscription = useCallback((id: string) => {
        softHaptic(8);
        const subscription = storedSubscriptions.find((item) => item.id === id);
        if (!subscription) {
            return;
        }

        navigation.navigate('AddSubscription', { subscription });
    }, [navigation, storedSubscriptions]);

    const onDeleteSubscription = useCallback((id: string) => {
        const subscription = storedSubscriptions.find((item) => item.id === id);
        if (!subscription) {
            return;
        }

        alert(
            t('subscriptions.deleteTitle'),
            t('subscriptions.deleteMessage', { name: subscription.name }),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.delete'),
                    style: 'destructive',
                    onPress: () => removeSubscription(id),
                },
            ],
        );
    }, [alert, removeSubscription, storedSubscriptions, t]);

    const refetchScreen = useCallback(() => {
        if (upcomingOnly) {
            refetchUpcoming();
            return;
        }
        refetch();
    }, [refetch, refetchUpcoming, upcomingOnly]);

    return {
        user,
        isLoading: upcomingOnly ? upcomingLoading : isLoading,
        isRefreshing: upcomingOnly ? upcomingRefetching : isRefreshing,
        subscriptions: visibleSubscriptions,
        refetch: refetchScreen,
        animatedTotal,
        monthlyCurrencyBreakdown,
        locale,
        activeCountLabel,
        isUpcomingOnly: upcomingOnly,
        upcomingDays,
        hasUpcomingError: upcomingOnly && !!upcomingError,
        activeSwipeableRef,
        activeSwipeableIdRef,
        goHomeOnBack,
        onEditSubscription,
        onDeleteSubscription,
    };
}
