import React from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useI18n } from '../../hooks/shared/useI18n';
import { cardUrgencyOf, dueLabelOf } from '../../modules/creditCards/cardStatus';
import type { CycleTimeline } from '../../modules/creditCards/cycleTimeline';
import { toLocalDateString } from '../../utils/core/dateOnly';
import { getCurrencyLocale } from '../../utils/domain/currency';
import { withAlpha } from '../../utils/domain/subscriptions';
import {
    SemanticColors,
    spacing,
    typography,
    useResponsive,
    useTheme,
    useThemedStyles,
} from '../../theme/index';
import { dueLabelText } from './cardLabels';
import { formatCardShortDate } from './creditCardFormat';

type MarkerKind = 'today' | 'closing' | 'due';
const KIND_ORDER: Record<MarkerKind, number> = { today: 0, closing: 1, due: 2 };

type Marker = {
    kind: MarkerKind;
    name: string;
    date: Date;
    dateText: string;
    relative: string | null;
    icon: string;
    color: string;
};

type CardCycleTimelineProps = {
    timeline: CycleTimeline;
    daysUntilClosing: number | null | undefined;
    daysUntilDue: number | null | undefined;
    statementPaid: boolean;
};

const TRACK_HEIGHT = 6;
const RING = 16;

function pct(fraction: number): `${number}%` {
    return `${Math.min(Math.max(fraction, 0), 1) * 100}%`;
}

/**
 * The statement cycle as a progress track: elapsed time to today, the closing mark and (when known) the due mark,
 * with the markers listed below. Due turns warning / error colored as the payment gets close or late.
 */
export function CardCycleTimeline({
    timeline,
    daysUntilClosing,
    daysUntilDue,
    statementPaid,
}: CardCycleTimelineProps) {
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);
    const { t, language } = useI18n();
    const { scaleFont } = useResponsive();
    const { width, fontScale } = useWindowDimensions();
    const locale = getCurrencyLocale(language);
    const accent = colors.primary;
    const muted = colors.textSecondary;

    const urgency = timeline.due ? cardUrgencyOf(daysUntilDue, statementPaid) : 'NONE';
    const dueColor = urgency === 'OVERDUE' ? colors.error : urgency === 'DUE_SOON' ? colors.warning : muted;
    const dueIcon =
        urgency === 'OVERDUE' ? 'alert-circle-outline' : urgency === 'DUE_SOON' ? 'time-outline' : 'calendar-outline';

    const closesRelative = dueLabelText(dueLabelOf(daysUntilClosing), t);
    const dueRelative = dueLabelText(dueLabelOf(daysUntilDue), t);
    const dateText = (date: Date) => formatCardShortDate(toLocalDateString(date), locale) ?? '';

    const markers: Marker[] = [
        {
            kind: 'today',
            name: t('creditCards.today'),
            date: timeline.today,
            dateText: dateText(timeline.today),
            relative: null,
            icon: 'today-outline',
            color: accent,
        },
        {
            kind: 'closing',
            name: t('creditCards.closesLabel'),
            date: timeline.closing,
            dateText: dateText(timeline.closing),
            relative: closesRelative,
            icon: 'calendar-outline',
            color: muted,
        },
    ];
    if (timeline.due) {
        markers.push({
            kind: 'due',
            name: t('creditCards.dueLabel'),
            date: timeline.due,
            dateText: dateText(timeline.due),
            relative: dueRelative,
            icon: dueIcon,
            color: dueColor,
        });
    }
    markers.sort(
        (a, b) => a.date.getTime() - b.date.getTime() || KIND_ORDER[a.kind] - KIND_ORDER[b.kind],
    );

    const summary = [
        closesRelative ? t('creditCards.timelineCloses', { when: closesRelative.toLowerCase() }) : null,
        timeline.due && dueRelative ? t('creditCards.timelineDue', { when: dueRelative.toLowerCase() }) : null,
    ]
        .filter(Boolean)
        .join(' · ');
    const description = [
        summary,
        ...markers.map(m => [m.name, m.dateText, m.relative].filter(Boolean).join(' ')),
    ]
        .filter(Boolean)
        .join(', ');

    const stacked = width < 340 || fontScale > 1.3;

    return (
        <View style={styles.container} accessible accessibilityLabel={description}>
            {summary ? (
                <Text style={[styles.summary, { fontSize: scaleFont(typography.fontSize.md) }]}>
                    {summary}
                </Text>
            ) : null}

            <View style={styles.trackArea}>
                <View style={[styles.track, { backgroundColor: withAlpha(muted, 0.14) }]}>
                    <View
                        style={[
                            styles.closePart,
                            { width: pct(timeline.closingFraction), backgroundColor: withAlpha(muted, 0.28) },
                        ]}
                    />
                    <View
                        style={[
                            styles.todayFill,
                            { width: pct(timeline.todayFraction), backgroundColor: accent },
                        ]}
                    />
                </View>
                <View
                    style={[styles.ring, { left: pct(timeline.closingFraction), borderColor: muted }]}
                />
                {timeline.dueFraction != null ? (
                    <View
                        style={[styles.ring, { left: pct(timeline.dueFraction), borderColor: dueColor }]}
                    />
                ) : null}
                <View
                    style={[styles.todayDot, { left: pct(timeline.todayFraction), backgroundColor: accent }]}
                />
            </View>

            <View style={stacked ? styles.markersStacked : styles.markersRow}>
                {markers.map(marker => (
                    <View key={marker.kind} style={stacked ? styles.markerStacked : styles.marker}>
                        <View style={styles.markerTitle}>
                            <Icon name={marker.icon} size={14} color={marker.color} />
                            <Text
                                style={[
                                    styles.markerName,
                                    { color: marker.color, fontSize: scaleFont(typography.fontSize.xs) },
                                ]}
                            >
                                {marker.name}
                            </Text>
                        </View>
                        <Text style={[styles.markerDate, { fontSize: scaleFont(typography.fontSize.sm) }]}>
                            {marker.dateText}
                        </Text>
                        {marker.relative ? (
                            <Text style={[styles.markerRelative, { fontSize: scaleFont(typography.fontSize.xs) }]}>
                                {marker.relative}
                            </Text>
                        ) : null}
                    </View>
                ))}
            </View>
        </View>
    );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
    container: {
        gap: spacing.md,
    },
    summary: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.semibold,
    },
    trackArea: {
        height: 24,
        justifyContent: 'center',
        marginHorizontal: RING / 2,
    },
    track: {
        height: TRACK_HEIGHT,
        borderRadius: TRACK_HEIGHT / 2,
        overflow: 'hidden',
    },
    closePart: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
    },
    todayFill: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
    },
    ring: {
        position: 'absolute',
        top: 4,
        width: RING,
        height: RING,
        marginLeft: -RING / 2,
        borderRadius: RING / 2,
        borderWidth: 2,
        backgroundColor: colors.background,
    },
    todayDot: {
        position: 'absolute',
        top: 3,
        width: 18,
        height: 18,
        marginLeft: -9,
        borderRadius: 9,
        borderWidth: 2,
        borderColor: colors.background,
    },
    markersRow: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    markersStacked: {
        gap: spacing.md,
    },
    marker: {
        flex: 1,
        gap: 2,
    },
    markerStacked: {
        gap: 2,
    },
    markerTitle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    markerName: {
        fontWeight: typography.fontWeight.semibold,
    },
    markerDate: {
        color: colors.textPrimary,
    },
    markerRelative: {
        color: colors.textSecondary,
    },
});
