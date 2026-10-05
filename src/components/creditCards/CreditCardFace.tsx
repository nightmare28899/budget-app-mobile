import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { creditCardTheme } from '../../modules/creditCards/creditCardVisuals';
import { CreditCard } from '../../types/index';
import { borderRadius, spacing, typography, useResponsive } from '../../theme/index';
import { formatCardDisplayName } from './creditCardFormat';

type CreditCardFaceProps = {
    card: Pick<CreditCard, 'id' | 'name' | 'bank' | 'brand' | 'last4' | 'color' | 'isActive'>;
    statusLabel?: string | null;
    statusColor?: string;
    inactiveLabel?: string;
};

/** Solid-color card artwork themed per bank (no gradient library in the app). */
export function CreditCardFace({
    card,
    statusLabel,
    statusColor,
    inactiveLabel,
}: CreditCardFaceProps) {
    const { scaleFont } = useResponsive();
    const theme = creditCardTheme(card);

    return (
        <View
            style={[
                styles.face,
                {
                    backgroundColor: theme.background,
                    borderColor: theme.border,
                    opacity: card.isActive ? 1 : 0.6,
                },
            ]}
        >
            <View style={[styles.accentStrip, { backgroundColor: theme.accent }]} />
            <View style={styles.topRow}>
                <Text
                    style={[styles.bank, { fontSize: scaleFont(typography.fontSize.sm) }]}
                    numberOfLines={1}
                >
                    {card.bank || card.name}
                </Text>
                {statusLabel ? (
                    <View style={[styles.chip, { borderColor: statusColor ?? '#FFFFFF' }]}>
                        <Text
                            style={[
                                styles.chipText,
                                { color: statusColor ?? '#FFFFFF', fontSize: scaleFont(typography.fontSize.xs) },
                            ]}
                        >
                            {statusLabel}
                        </Text>
                    </View>
                ) : null}
            </View>
            <View style={styles.chipArt} />
            <View style={styles.bottomRow}>
                <View style={styles.bottomText}>
                    <Text
                        style={[styles.name, { fontSize: scaleFont(typography.fontSize.base) }]}
                        numberOfLines={1}
                    >
                        {formatCardDisplayName(card)}
                    </Text>
                    <Text style={[styles.digits, { fontSize: scaleFont(typography.fontSize.sm) }]}>
                        {`•••• ${card.last4}`}
                        {!card.isActive && inactiveLabel ? `  ·  ${inactiveLabel}` : ''}
                    </Text>
                </View>
                {card.brand ? (
                    <Text style={[styles.brand, { fontSize: scaleFont(typography.fontSize.xs) }]}>
                        {card.brand}
                    </Text>
                ) : null}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    face: {
        borderRadius: borderRadius.xl,
        borderWidth: 1,
        padding: spacing.base,
        gap: spacing.sm,
        overflow: 'hidden',
    },
    accentStrip: {
        position: 'absolute',
        right: -40,
        top: -40,
        width: 140,
        height: 140,
        borderRadius: 70,
        opacity: 0.55,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.sm,
    },
    bank: {
        flex: 1,
        color: '#FFFFFF',
        fontWeight: typography.fontWeight.bold,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },
    chip: {
        borderWidth: 1,
        borderRadius: borderRadius.full,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        backgroundColor: 'rgba(0, 0, 0, 0.25)',
    },
    chipText: {
        fontWeight: typography.fontWeight.semibold,
    },
    chipArt: {
        width: 36,
        height: 26,
        borderRadius: 6,
        backgroundColor: '#E9C46A',
        opacity: 0.9,
    },
    bottomRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: spacing.sm,
    },
    bottomText: {
        flex: 1,
    },
    name: {
        color: '#FFFFFF',
        fontWeight: typography.fontWeight.semibold,
    },
    digits: {
        color: 'rgba(255, 255, 255, 0.8)',
        marginTop: 2,
        letterSpacing: 1,
    },
    brand: {
        color: 'rgba(255, 255, 255, 0.85)',
        fontWeight: typography.fontWeight.bold,
        textTransform: 'uppercase',
    },
});
