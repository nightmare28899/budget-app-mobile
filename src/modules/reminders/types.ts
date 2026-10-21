/** A calendar day as "YYYY-MM-DD" (the Compose app's `LocalDate`). Sorts lexically. */
export type LocalDate = string;

export type ReminderKind = 'CARD_DUE' | 'CARD_CLOSING' | 'SUBSCRIPTION';

/** Ordering of kinds when two events share a date. */
export const REMINDER_KIND_ORDER: readonly ReminderKind[] = [
    'CARD_DUE',
    'CARD_CLOSING',
    'SUBSCRIPTION',
];

/** A concrete amount due on `date` for a card. */
export type ReminderAmount = {
    date: LocalDate;
    amount: number;
    currency: string;
};

/** The slice of a credit card the reminder planner needs. */
export type CardReminderInput = {
    id: string;
    name: string;
    closingDay: number | null;
    paymentDueDay: number | null;
    isActive: boolean;
    nextPayment: ReminderAmount | null;
    /** Payment due dates on or before this day are already settled and never reminded. */
    paidThrough: LocalDate | null;
};

export type BillingCycle = 'WEEKLY' | 'MONTHLY' | 'YEARLY';

/** The slice of a subscription the reminder planner needs. `nextPaymentDate` is the recurrence anchor. */
export type SubscriptionReminderInput = {
    id: string;
    name: string;
    cost: number;
    currency: string;
    billingCycle: BillingCycle;
    nextPaymentDate: LocalDate;
    isActive: boolean;
};

export type ReminderEvent = {
    kind: ReminderKind;
    targetId: string;
    title: string;
    date: LocalDate;
    amount: number | null;
    currency: string | null;
};

export type ReminderSettings = {
    enabled: boolean;
    leadDays: number;
    /** When the app lock is on, amounts are left out of notification text. */
    appLockEnabled: boolean;
};
