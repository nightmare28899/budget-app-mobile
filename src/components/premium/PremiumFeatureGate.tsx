import React, { useMemo } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedScreen } from '../ui/AnimatedScreen';
import { Button } from '../ui/Button';
import { HomeBackground } from '../ui/HomeBackground';
import { usePremiumAccess } from '../../hooks/usePremiumAccess';
import { useI18n } from '../../hooks/useI18n';
import { PremiumFeature } from '../../types/premium';
import {
    borderRadius,
    spacing,
    typography,
    useResponsive,
    useTheme,
    useThemedStyles,
} from '../../theme';
import { withAlpha } from '../../utils/subscriptions';

type PremiumFeatureGateProps = {
    feature: PremiumFeature;
    onClose?: () => void;
    onContinueToAuth?: () => void;
    onOpenFeature?: () => void;
};

export function PremiumFeatureGate({
    feature,
    onClose,
    onContinueToAuth,
    onOpenFeature,
}: PremiumFeatureGateProps) {
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);
    const insets = useSafeAreaInsets();
    const { t } = useI18n();
    const { hasPremium, isGuest } = usePremiumAccess();
    const {
        horizontalPadding,
        contentMaxWidth,
        scaleFont,
    } = useResponsive();

    const content = useMemo(() => {
        if (feature === 'credit_cards') {
            return {
                icon: 'card-outline',
                title: t('premium.creditCardsTitle'),
                description: hasPremium
                    ? t('premium.creditCardsEnabledDescription')
                    : t('premium.creditCardsDescription'),
                bullets: [
                    t('premium.creditCardsBullet1'),
                    t('premium.creditCardsBullet2'),
                    t('premium.creditCardsBullet3'),
                ],
                bulletIcons: ['wallet-outline', 'swap-horizontal-outline', 'calendar-outline'],
                actionTitle: t('creditCards.manageModule'),
            };
        }

        return {
            icon: 'albums-outline',
            title: t('premium.installmentsTitle'),
            description: hasPremium
                ? t('premium.installmentsEnabledDescription')
                : t('premium.installmentsDescription'),
            bullets: [
                t('premium.installmentsBullet1'),
                t('premium.installmentsBullet2'),
                t('premium.installmentsBullet3'),
            ],
            bulletIcons: ['calculator-outline', 'layers-outline', 'time-outline'],
            actionTitle: null,
        };
    }, [feature, hasPremium, t]);

    const heroTitle = hasPremium ? t('premium.acquiredTitle') : t('premium.title');
    const heroSubtitle = hasPremium
        ? t('premium.acquiredSubtitle')
        : t('premium.subtitle');
    const badgeText = hasPremium ? t('premium.activeBadge') : t('premium.lockedBadge');

    return (
        <View style={styles.container}>
            <HomeBackground />
            <AnimatedScreen style={styles.flex1} delay={12} duration={220} travelY={8}>
                <ScrollView
                    contentContainerStyle={[
                        styles.content,
                        {
                            paddingTop: insets.top + spacing.lg,
                            paddingBottom: insets.bottom + spacing['4xl'],
                            paddingHorizontal: horizontalPadding,
                        },
                        contentMaxWidth
                            ? { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }
                            : null,
                    ]}
                    showsVerticalScrollIndicator={false}
                >
                    {onClose ? (
                        <TouchableOpacity
                            style={styles.closeButton}
                            activeOpacity={0.8}
                            onPress={onClose}
                        >
                            <Icon name="close-outline" size={22} color={colors.textPrimary} />
                        </TouchableOpacity>
                    ) : null}

                    <View
                        style={[
                            styles.heroCard,
                            hasPremium ? styles.heroCardActive : styles.heroCardLocked,
                        ]}
                    >
                        <View
                            style={[
                                styles.heroGlow,
                                hasPremium ? styles.heroGlowActive : styles.heroGlowLocked,
                            ]}
                        />
                        <View
                            style={[
                                styles.iconWrap,
                                hasPremium ? styles.iconWrapActive : styles.iconWrapLocked,
                            ]}
                        >
                            <Icon name={content.icon} size={28} color={colors.textPrimary} />
                        </View>
                        <View
                            style={[
                                styles.badge,
                                hasPremium ? styles.badgeActive : styles.badgeLocked,
                            ]}
                        >
                            <Text
                                style={[
                                    styles.badgeText,
                                    { fontSize: scaleFont(typography.fontSize.xs) },
                                ]}
                            >
                                {badgeText}
                            </Text>
                        </View>
                        <Text
                            style={[
                                styles.heroTitle,
                                { fontSize: scaleFont(typography.fontSize['3xl']) },
                            ]}
                        >
                            {heroTitle}
                        </Text>
                        <Text
                            style={[
                                styles.heroSubtitle,
                                { fontSize: scaleFont(typography.fontSize.md) },
                            ]}
                        >
                            {heroSubtitle}
                        </Text>

                        <View style={styles.statusChipsRow}>
                            <View
                                style={[
                                    styles.statusChip,
                                    hasPremium
                                        ? styles.statusChipActive
                                        : styles.statusChipLocked,
                                ]}
                            >
                                <Icon
                                    name={hasPremium ? 'sparkles' : 'lock-closed'}
                                    size={14}
                                    color={colors.textPrimary}
                                />
                                <Text
                                    style={[
                                        styles.statusChipText,
                                        { fontSize: scaleFont(typography.fontSize.xs) },
                                    ]}
                                >
                                    {hasPremium
                                        ? t('premium.activeStatus')
                                        : t('premium.inactiveStatus')}
                                </Text>
                            </View>
                            <View style={styles.statusChip}>
                                <Icon name={content.icon} size={14} color={colors.textPrimary} />
                                <Text
                                    style={[
                                        styles.statusChipText,
                                        { fontSize: scaleFont(typography.fontSize.xs) },
                                    ]}
                                >
                                    {content.title}
                                </Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.detailCard}>
                        <Text
                            style={[
                                styles.sectionEyebrow,
                                { fontSize: scaleFont(typography.fontSize.xs) },
                            ]}
                        >
                            {t('premium.benefitsTitle')}
                        </Text>
                        <Text
                            style={[
                                styles.sectionTitle,
                                { fontSize: scaleFont(typography.fontSize.lg) },
                            ]}
                        >
                            {content.title}
                        </Text>
                        <Text
                            style={[
                                styles.sectionDescription,
                                { fontSize: scaleFont(typography.fontSize.sm) },
                            ]}
                        >
                            {content.description}
                        </Text>

                        <View style={styles.benefitGrid}>
                            {content.bullets.map((bullet, index) => (
                                <View key={bullet} style={styles.benefitCard}>
                                    <View style={styles.benefitIconWrap}>
                                        <Icon
                                            name={content.bulletIcons[index] ?? 'checkmark-circle'}
                                            size={18}
                                            color={colors.primaryAction}
                                        />
                                    </View>
                                    <Text
                                        style={[
                                            styles.benefitText,
                                            { fontSize: scaleFont(typography.fontSize.sm) },
                                        ]}
                                    >
                                        {bullet}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    </View>

                    {hasPremium ? (
                        <View style={styles.detailCard}>
                            <Text
                                style={[
                                    styles.sectionEyebrow,
                                    { fontSize: scaleFont(typography.fontSize.xs) },
                                ]}
                            >
                                {t('premium.benefitsTitle')}
                            </Text>
                            <Text
                                style={[
                                    styles.sectionTitle,
                                    { fontSize: scaleFont(typography.fontSize.base) },
                                ]}
                            >
                                {t('premium.acquiredTitle')}
                            </Text>
                            <Text
                                style={[
                                    styles.sectionDescription,
                                    { fontSize: scaleFont(typography.fontSize.sm) },
                                ]}
                            >
                                {t('premium.benefitsDescription')}
                            </Text>
                            {feature === 'credit_cards' && onOpenFeature ? (
                                <>
                                    <Button
                                        title={content.actionTitle ?? t('creditCards.openModule')}
                                        onPress={onOpenFeature}
                                        containerStyle={styles.primaryButton}
                                    />
                                    <Text
                                        style={[
                                            styles.helperText,
                                            { fontSize: scaleFont(typography.fontSize.xs) },
                                        ]}
                                    >
                                        {t('creditCards.moduleHint')}
                                    </Text>
                                </>
                            ) : (
                                <Text
                                    style={[
                                        styles.helperText,
                                        { fontSize: scaleFont(typography.fontSize.xs) },
                                    ]}
                                >
                                    {t('premium.accountManagedHint')}
                                </Text>
                            )}
                        </View>
                    ) : null}

                    {isGuest ? (
                        <View style={styles.detailCard}>
                            <Text
                                style={[
                                    styles.sectionTitle,
                                    { fontSize: scaleFont(typography.fontSize.base) },
                                ]}
                            >
                                {t('premium.signInTitle')}
                            </Text>
                            <Text
                                style={[
                                    styles.sectionDescription,
                                    { fontSize: scaleFont(typography.fontSize.sm) },
                                ]}
                            >
                                {t('premium.signInDescription')}
                            </Text>
                            <Button
                                title={t('auth.signIn')}
                                variant="secondary"
                                onPress={onContinueToAuth}
                                containerStyle={styles.secondaryButton}
                            />
                        </View>
                    ) : null}
                </ScrollView>
            </AnimatedScreen>
        </View>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    flex1: {
        flex: 1,
    },
    content: {
        gap: spacing.base,
    },
    closeButton: {
        alignSelf: 'flex-end',
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: `${colors.surfaceElevated}DD`,
        borderWidth: 1,
        borderColor: colors.border,
    },
    heroCard: {
        overflow: 'hidden',
        borderRadius: borderRadius.lg,
        padding: spacing.xl,
        alignItems: 'flex-start',
        gap: spacing.sm,
    },
    heroCardLocked: {
        backgroundColor: colors.surfaceCard,
        borderWidth: 1,
        borderColor: colors.border,
    },
    heroCardActive: {
        backgroundColor: colors.surfaceCard,
        borderWidth: 1,
        borderColor: withAlpha(colors.success, 0.24),
    },
    heroGlow: {
        position: 'absolute',
        top: -24,
        right: -18,
        width: 140,
        height: 140,
        borderRadius: 70,
    },
    heroGlowLocked: {
        backgroundColor: withAlpha(colors.primaryAction, 0.14),
    },
    heroGlowActive: {
        backgroundColor: withAlpha(colors.success, 0.18),
    },
    iconWrap: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconWrapLocked: {
        backgroundColor: withAlpha(colors.primaryAction, 0.16),
    },
    iconWrapActive: {
        backgroundColor: withAlpha(colors.success, 0.16),
    },
    badge: {
        borderRadius: borderRadius.full,
        paddingHorizontal: spacing.sm,
        paddingVertical: 6,
    },
    badgeLocked: {
        backgroundColor: withAlpha(colors.primaryAction, 0.1),
    },
    badgeActive: {
        backgroundColor: withAlpha(colors.success, 0.12),
    },
    badgeText: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.semibold,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    heroTitle: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.bold,
    },
    heroSubtitle: {
        color: colors.textSecondary,
        lineHeight: 22,
    },
    statusChipsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        marginTop: spacing.xs,
    },
    statusChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderRadius: borderRadius.full,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        backgroundColor: colors.surfaceElevated,
        borderWidth: 1,
        borderColor: colors.border,
    },
    statusChipLocked: {
        backgroundColor: withAlpha(colors.primaryAction, 0.12),
        borderColor: withAlpha(colors.primaryAction, 0.2),
    },
    statusChipActive: {
        backgroundColor: withAlpha(colors.success, 0.12),
        borderColor: withAlpha(colors.success, 0.22),
    },
    statusChipText: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.semibold,
    },
    detailCard: {
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        backgroundColor: colors.surfaceCard,
        borderWidth: 1,
        borderColor: colors.border,
        gap: spacing.sm,
    },
    sectionEyebrow: {
        color: colors.primaryAction,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
        fontWeight: typography.fontWeight.semibold,
    },
    sectionTitle: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.semibold,
    },
    sectionDescription: {
        color: colors.textSecondary,
        lineHeight: 22,
    },
    benefitGrid: {
        gap: spacing.sm,
        marginTop: spacing.sm,
    },
    benefitCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.sm,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surfaceElevated,
        padding: spacing.base,
    },
    benefitIconWrap: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: withAlpha(colors.success, 0.12),
    },
    bulletRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.sm,
    },
    benefitText: {
        flex: 1,
        color: colors.textPrimary,
        lineHeight: 20,
    },
    helperText: {
        color: colors.textMuted,
        lineHeight: 18,
    },
    primaryButton: {
        marginTop: spacing.sm,
    },
    secondaryButton: {
        marginTop: spacing.xs,
    },
});
