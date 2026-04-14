import React, { useMemo } from 'react';
import {
    StyleSheet,
    Text,
    View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Button } from '../ui/primitives/Button';
import { useAppAccess } from '../../hooks/useAppAccess';
import { useI18n } from '../../hooks/useI18n';
import {
    borderRadius,
    spacing,
    typography,
    useResponsive,
    useTheme,
    useThemedStyles,
    SemanticColors,
} from '../../theme/index';
import { withAlpha } from '../../utils/domain/subscriptions';

type PlanAccessSectionProps = {
    onOpenPremium: () => void;
    onOpenCreditCards: () => void;
    onOpenLogin: () => void;
};

export function PlanAccessSection({
    onOpenPremium,
    onOpenCreditCards,
    onOpenLogin,
}: PlanAccessSectionProps) {
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);
    const { t } = useI18n();
    const { scaleFont } = useResponsive();
    const {
        isGuest,
        hasPremium,
    } = useAppAccess();

    const planLabel = hasPremium ? t('premium.acquiredTitle') : t('premium.inactiveStatus');
    const heroDescription = hasPremium
        ? t('plan.heroPremiumDescription')
        : isGuest
            ? t('plan.heroGuestDescription')
            : t('plan.heroFreeDescription');
    const accessLabel = isGuest ? t('guest.statusGuest') : t('guest.statusAccount');
    const backupLabel = isGuest
        ? t('settings.backupGuestValue')
        : t('settings.backupAccountValue');

    const featureCards = useMemo(
        () => [
            {
                key: 'credit_cards',
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
                status: hasPremium
                    ? t('settings.planFeatureEnabled')
                    : t('settings.planFeatureLocked'),
            },
            {
                key: 'installments',
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
                status: hasPremium
                    ? t('settings.planFeatureEnabled')
                    : t('settings.planFeatureLocked'),
            },
        ],
        [hasPremium, t],
    );

    return (
        <View style={styles.container}>
            <View style={[styles.heroCard, hasPremium ? styles.heroCardActive : styles.heroCardLocked]}>
                <View style={styles.heroTopRow}>
                    <View
                        style={[
                            styles.heroIconWrap,
                            hasPremium ? styles.heroIconWrapActive : styles.heroIconWrapLocked,
                        ]}
                    >
                        <Icon
                            name={hasPremium ? 'sparkles' : 'shield-half-outline'}
                            size={24}
                            color={colors.textPrimary}
                        />
                    </View>
                    <View
                        style={[
                            styles.statusPill,
                            hasPremium ? styles.statusPillPremium : styles.statusPillFree,
                        ]}
                    >
                        <Text
                            style={[
                                styles.statusPillText,
                                { fontSize: scaleFont(typography.fontSize.xs) },
                            ]}
                        >
                            {planLabel}
                        </Text>
                    </View>
                </View>

                <Text
                    style={[
                        styles.heroTitle,
                        { fontSize: scaleFont(typography.fontSize['2xl']) },
                    ]}
                >
                    {planLabel}
                </Text>
                <Text
                    style={[
                        styles.heroDescription,
                        { fontSize: scaleFont(typography.fontSize.sm) },
                    ]}
                >
                    {heroDescription}
                </Text>

                <View style={styles.summaryGrid}>
                    <View style={styles.summaryCard}>
                        <Text
                            style={[
                                styles.summaryLabel,
                                { fontSize: scaleFont(typography.fontSize.xs) },
                            ]}
                        >
                            {t('settings.planAccessLabel')}
                        </Text>
                        <Text
                            style={[
                                styles.summaryValue,
                                { fontSize: scaleFont(typography.fontSize.sm) },
                            ]}
                        >
                            {accessLabel}
                        </Text>
                    </View>
                    <View style={styles.summaryCard}>
                        <Text
                            style={[
                                styles.summaryLabel,
                                { fontSize: scaleFont(typography.fontSize.xs) },
                            ]}
                        >
                            {t('settings.backupLabel')}
                        </Text>
                        <Text
                            style={[
                                styles.summaryValue,
                                { fontSize: scaleFont(typography.fontSize.sm) },
                            ]}
                        >
                            {backupLabel}
                        </Text>
                    </View>
                </View>
            </View>

            <View style={styles.sectionCard}>
                <Text
                    style={[
                        styles.sectionEyebrow,
                        { fontSize: scaleFont(typography.fontSize.xs) },
                    ]}
                >
                    {t('plan.featuresTitle')}
                </Text>
                <Text
                    style={[
                        styles.sectionDescription,
                        { fontSize: scaleFont(typography.fontSize.sm) },
                    ]}
                >
                    {t('plan.featuresSubtitle')}
                </Text>

                <View style={styles.featureList}>
                    {featureCards.map((item) => (
                        <View key={item.key} style={styles.featureCard}>
                            <View style={styles.featureHeader}>
                                <View style={styles.featureIdentity}>
                                    <View
                                        style={[
                                            styles.featureIconWrap,
                                            hasPremium
                                                ? styles.featureIconWrapActive
                                                : styles.featureIconWrapLocked,
                                        ]}
                                    >
                                        <Icon
                                            name={item.icon}
                                            size={18}
                                            color={hasPremium ? colors.primaryLight : colors.textMuted}
                                        />
                                    </View>
                                    <View style={styles.featureCopy}>
                                        <Text
                                            style={[
                                                styles.featureTitle,
                                                { fontSize: scaleFont(typography.fontSize.base) },
                                            ]}
                                        >
                                            {item.title}
                                        </Text>
                                        <Text
                                            style={[
                                                styles.featureDescription,
                                                { fontSize: scaleFont(typography.fontSize.xs) },
                                            ]}
                                        >
                                            {item.description}
                                        </Text>
                                    </View>
                                </View>
                                <View
                                    style={[
                                        styles.featureStatusPill,
                                        hasPremium
                                            ? styles.featureStatusPillActive
                                            : styles.featureStatusPillLocked,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.featureStatusText,
                                            { fontSize: scaleFont(typography.fontSize.xs) },
                                        ]}
                                    >
                                        {item.status}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.featureBullets}>
                                {item.bullets.map((bullet) => (
                                    <View key={bullet} style={styles.bulletRow}>
                                        <Icon
                                            name="checkmark-circle"
                                            size={16}
                                            color={hasPremium ? colors.primaryLight : colors.textMuted}
                                        />
                                        <Text
                                            style={[
                                                styles.bulletText,
                                                { fontSize: scaleFont(typography.fontSize.sm) },
                                            ]}
                                        >
                                            {bullet}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    ))}
                </View>
            </View>

            {hasPremium ? (
                <>
                    <Button
                        title={t('creditCards.manageModule')}
                        onPress={onOpenCreditCards}
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
                <Button
                    title={t('premium.viewButton')}
                    onPress={onOpenPremium}
                    containerStyle={styles.primaryButton}
                />
            )}

            {isGuest ? (
                <Button
                    title={t('auth.signIn')}
                    variant="secondary"
                    onPress={onOpenLogin}
                    containerStyle={styles.secondaryButton}
                />
            ) : null}
        </View>
    );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
    container: {
        gap: spacing.base,
    },
    heroCard: {
        borderRadius: borderRadius.xl,
        padding: spacing.xl,
        borderWidth: 1,
    },
    heroCardActive: {
        backgroundColor: colors.surfaceCard,
        borderColor: withAlpha(colors.success, 0.24),
    },
    heroCardLocked: {
        backgroundColor: colors.surfaceCard,
        borderColor: colors.border,
    },
    heroTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.base,
    },
    heroIconWrap: {
        width: 52,
        height: 52,
        borderRadius: 26,
        alignItems: 'center',
        justifyContent: 'center',
    },
    heroIconWrapActive: {
        backgroundColor: withAlpha(colors.success, 0.16),
    },
    heroIconWrapLocked: {
        backgroundColor: colors.surfaceElevated,
    },
    statusPill: {
        borderRadius: borderRadius.full,
        paddingHorizontal: spacing.sm,
        paddingVertical: 6,
        borderWidth: 1,
    },
    statusPillPremium: {
        backgroundColor: withAlpha(colors.success, 0.12),
        borderColor: withAlpha(colors.success, 0.28),
    },
    statusPillFree: {
        backgroundColor: colors.surfaceElevated,
        borderColor: colors.border,
    },
    statusPillText: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.semibold,
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    heroTitle: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.bold,
        marginBottom: spacing.sm,
    },
    heroDescription: {
        color: colors.textSecondary,
        lineHeight: 21,
        marginBottom: spacing.lg,
    },
    summaryGrid: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    summaryCard: {
        flex: 1,
        borderRadius: borderRadius.lg,
        backgroundColor: colors.surfaceElevated,
        padding: spacing.base,
        borderWidth: 1,
        borderColor: colors.border,
    },
    summaryLabel: {
        color: colors.textMuted,
        marginBottom: spacing.xs,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    summaryValue: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.semibold,
    },
    sectionCard: {
        borderRadius: borderRadius.xl,
        padding: spacing.xl,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surfaceCard,
    },
    sectionEyebrow: {
        color: colors.primaryLight,
        fontWeight: typography.fontWeight.semibold,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
        marginBottom: spacing.xs,
    },
    sectionDescription: {
        color: colors.textSecondary,
        lineHeight: 20,
        marginBottom: spacing.lg,
    },
    featureList: {
        gap: spacing.base,
    },
    featureCard: {
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surfaceElevated,
        padding: spacing.base,
    },
    featureHeader: {
        gap: spacing.sm,
        marginBottom: spacing.base,
    },
    featureIdentity: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    featureIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    featureIconWrapActive: {
        backgroundColor: withAlpha(colors.success, 0.12),
        borderColor: withAlpha(colors.success, 0.28),
    },
    featureIconWrapLocked: {
        backgroundColor: colors.surface,
        borderColor: colors.border,
    },
    featureCopy: {
        flex: 1,
        gap: spacing.xs,
    },
    featureTitle: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.semibold,
    },
    featureDescription: {
        color: colors.textSecondary,
        lineHeight: 18,
    },
    featureStatusPill: {
        alignSelf: 'flex-start',
        borderRadius: borderRadius.full,
        paddingHorizontal: spacing.sm,
        paddingVertical: 6,
        borderWidth: 1,
    },
    featureStatusPillActive: {
        backgroundColor: withAlpha(colors.success, 0.12),
        borderColor: withAlpha(colors.success, 0.24),
    },
    featureStatusPillLocked: {
        backgroundColor: colors.surface,
        borderColor: colors.border,
    },
    featureStatusText: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.semibold,
    },
    featureBullets: {
        gap: spacing.sm,
    },
    bulletRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.sm,
    },
    bulletText: {
        flex: 1,
        color: colors.textPrimary,
        lineHeight: 20,
    },
    primaryButton: {
        marginTop: spacing.xs,
    },
    secondaryButton: {
        marginTop: spacing.sm,
    },
    helperText: {
        color: colors.textMuted,
        lineHeight: 18,
        marginTop: spacing.xs,
    },
});
