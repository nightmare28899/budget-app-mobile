import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { creditCardsApi } from '../../api/resources/creditCards';
import { listPendingPayments } from '../../modules/creditCards/cardPaymentSchedule';
import {
    clearPaymentDue,
    shouldShowPaymentDue,
    showPaymentDue,
} from '../../utils/platform/androidLiveUpdates';

/** Mirrors card payments due within a day into Android Live Updates; clears the rest. */
export function usePaymentDueLiveUpdates(): void {
    const { data } = useQuery({
        queryKey: ['creditCards', 'overview', 'live-updates'],
        queryFn: () => creditCardsApi.getOverview(),
        staleTime: 60_000,
        enabled: Platform.OS === 'android',
    });
    const shownIds = useRef<Set<string>>(new Set());

    useEffect(() => {
        if (!data) {
            return;
        }

        const next = new Set<string>();
        for (const item of listPendingPayments(data.cards)) {
            const { card, dueDate, daysUntilDue } = item;
            if (!dueDate || !shouldShowPaymentDue(daysUntilDue)) {
                continue;
            }
            next.add(card.id);
            const amount = card.statementSummary?.currentPaymentDue ?? 0;
            showPaymentDue(card.id, card.name, amount, dueDate, card.currency).catch(() => undefined);
        }

        shownIds.current.forEach((id) => {
            if (!next.has(id)) {
                clearPaymentDue(id);
            }
        });
        shownIds.current = next;
    }, [data]);
}
