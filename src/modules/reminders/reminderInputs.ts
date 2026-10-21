import type { CreditCardOverviewCard, Subscription } from '../../types/index';
import { localDateOf } from './dates';
import { parseDateOnly } from '../../utils/core/dateOnly';
import { toNum } from '../../utils/core/number';
import type {
    BillingCycle,
    CardReminderInput,
    LocalDate,
    SubscriptionReminderInput,
} from './types';

function toLocalDate(value: string | null | undefined): LocalDate | null {
    const parsed = value ? parseDateOnly(value) : null;
    return parsed ? localDateOf(parsed) : null;
}

export function cardInputFromOverview(card: CreditCardOverviewCard): CardReminderInput {
    const dueDate = toLocalDate(card.nextPayment?.dueDate);
    const summary = card.statementSummary;
    const paid = summary && summary.statementImportId !== null && summary.paymentStatus === 'PAID';
    return {
        id: card.id,
        name: card.name,
        closingDay: card.closingDay ?? null,
        paymentDueDay: card.paymentDueDay ?? null,
        isActive: card.isActive,
        nextPayment:
            card.nextPayment && dueDate
                ? { date: dueDate, amount: card.nextPayment.amount, currency: card.nextPayment.currency }
                : null,
        paidThrough: paid ? toLocalDate(summary.dueDate) : null,
    };
}

function toBillingCycle(value: unknown): BillingCycle {
    const normalized = typeof value === 'string' ? value.trim().toUpperCase() : '';
    if (normalized === 'WEEKLY') {
        return 'WEEKLY';
    }
    return normalized === 'YEARLY' || normalized === 'ANNUAL' ? 'YEARLY' : 'MONTHLY';
}

/** Null when the subscription has no usable date to anchor its schedule. */
export function subscriptionInputFromSubscription(
    subscription: Subscription,
): SubscriptionReminderInput | null {
    const anchor = toLocalDate(subscription.chargeDate || subscription.nextPaymentDate);
    if (!anchor) {
        return null;
    }
    return {
        id: subscription.id,
        name: subscription.name,
        cost: toNum(subscription.cost),
        currency: subscription.currency,
        billingCycle: toBillingCycle(subscription.billingCycle),
        nextPaymentDate: anchor,
        isActive: subscription.isActive !== false,
    };
}
