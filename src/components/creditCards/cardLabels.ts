import type { TranslationKey, TranslationValues } from '../../i18n/index';
import type { CardBadge, DueLabel } from '../../modules/creditCards/cardStatus';
import type { UtilizationTone } from '../../modules/creditCards/cardPercent';

export type Translate = (key: TranslationKey, values?: TranslationValues) => string;

/** "in 3 days" / "today" / "overdue by 2 days"; null without a date. */
export function dueLabelText(label: DueLabel | null, t: Translate): string | null {
    if (!label) {
        return null;
    }
    switch (label.kind) {
        case 'overdue':
            return t('creditCards.overdueDays', { count: label.days });
        case 'today':
            return t('creditCards.today');
        case 'tomorrow':
            return t('creditCards.tomorrow');
        default:
            return t('creditCards.inDays', { count: label.days });
    }
}

/** Localized status text for the pill on a card face; null for NONE. */
export function cardBadgeLabel(badge: CardBadge, t: Translate): string | null {
    switch (badge) {
        case 'PAID':
            return t('creditCards.statementPaid');
        case 'PARTIAL':
            return t('creditCards.statementPartial');
        case 'PENDING':
            return t('creditCards.statementPending');
        case 'DUE_SOON':
            return t('creditCards.badgeDueSoon');
        case 'OVERDUE':
            return t('creditCards.badgeOverdue');
        default:
            return null;
    }
}

/** Pill tint readable on the dark card art. */
export function cardBadgeColor(badge: CardBadge): string | undefined {
    switch (badge) {
        case 'PAID':
            return '#34D399';
        case 'PARTIAL':
        case 'DUE_SOON':
            return '#FBBF24';
        case 'PENDING':
            return '#FCA5A5';
        case 'OVERDUE':
            return '#F87171';
        default:
            return undefined;
    }
}

export function utilizationToneLabel(tone: UtilizationTone, t: Translate): string {
    switch (tone) {
        case 'HIGH':
            return t('creditCards.toneHigh');
        case 'CAUTION':
            return t('creditCards.toneCaution');
        default:
            return t('creditCards.toneHealthy');
    }
}
