import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootScreenProps } from '../../navigation/types';
import { useCreditCardsOverview } from '../../hooks/creditCards/useCreditCardsOverview';
import { HomeBackground } from '../../components/ui/layout/HomeBackground';
import { ScreenBackButton } from '../../components/ui/primitives/ScreenBackButton';
import { useI18n } from '../../hooks/shared/useI18n';
import {
    getPlanProgress,
    sortPlansByRemaining,
    summarizeInstallmentPlans,
} from '../../modules/creditCards/installmentPlans';
import { CreditCardInstallmentPlan } from '../../types/index';
import { formatCurrency } from '../../utils/core/format';
import { parseDateOnly } from '../../utils/core/dateOnly';
import { getCurrencyLocale } from '../../utils/domain/currency';
import { buildFinancingPlanLabel } from '../../utils/domain/financingPlan';
import {
    borderRadius,
    SemanticColors,
    spacing,
    typography,
    useResponsive,
    useThemedStyles,
} from '../../theme/index';

function formatLongDate(value: string | null, locale: 'es-MX' | 'en-US'): string | null {
    const parsed = value ? parseDateOnly(value) : null;
    return parsed
        ? new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(parsed)
        : null;
}

export function CardInstallmentPlansScreen({
    navigation,
    route,
}: RootScreenProps<'CardInstallmentPlans'>) {
    const styles = useThemedStyles(createStyles);
    const insets = useSafeAreaInsets();
    const { t, language } = useI18n();
    const { horizontalPadding, contentMaxWidth, scaleFont } = useResponsive();
    const locale = getCurrencyLocale(language);
    const { overview } = useCreditCardsOverview({ includeInactive: true });
    const card = overview?.cards.find(item => item.id === route.params.creditCardId);

    const plans = useMemo(() => sortPlansByRemaining(card?.installmentPlans ?? []), [card]);
    const summary = useMemo(() => summarizeInstallmentPlans(plans), [plans]);
    const statementDate = formatLongDate(summary.statementPeriodEnd, locale);

    const badgeLabel = (plan: CreditCardInstallmentPlan) =>
        plan.type === 'REFINANCED'
            ? t('cardInstallments.refinanced')
            : buildFinancingPlanLabel(
                {
                    type: plan.type,
                    installmentNumber: null,
                    installmentCount: null,
                    installmentAmount: null,
                    originalAmount: null,
                    remainingAmount: null,
                    purchaseDate: null,
                },
                t,
            ) ?? '';

    const handleBack = () => {
        if (navigation.canGoBack()) {
            navigation.goBack();
        }
    };

    const renderPlan = (plan: CreditCardInstallmentPlan) => {
        const money = (amount: number) => formatCurrency(amount, plan.currency, locale);
        const progress = getPlanProgress(plan);
        const purchase = formatLongDate(plan.purchaseDate, locale);
        const details: Array<{ key: string; label: string; value: string }> = [];
        if (plan.installmentAmount != null) {
            details.push({
                key: 'monthly',
                label: t('financingPlan.monthlyAmountLabel'),
                value: money(plan.installmentAmount),
            });
        }
        if (plan.remainingAmount != null) {
            details.push({
                key: 'remaining',
                label: t('financingPlan.remainingAmountLabel'),
                value: money(plan.remainingAmount),
            });
        }
        if (plan.originalAmount != null) {
            details.push({
                key: 'original',
                label: t('financingPlan.originalAmountLabel'),
                value: money(plan.originalAmount),
            });
        }
        if (purchase) {
            details.push({
                key: 'purchase',
                label: t('financingPlan.purchaseDateLabel'),
                value: purchase,
            });
        }

        return (
            <View key={plan.id} style={styles.planCard}>
                <View style={styles.planHeader}>
                    <Text
                        style={[styles.merchant, { fontSize: scaleFont(typography.fontSize.md) }]}
                        numberOfLines={1}
                    >
                        {plan.merchantName ?? t('cardInstallments.unknownMerchant')}
                    </Text>
                    <View style={styles.tags}>
                        {plan.isFinalInstallment ? (
                            <View style={styles.finalTag}>
                                <Text style={styles.finalTagText}>{t('cardInstallments.final')}</Text>
                            </View>
                        ) : null}
                        <View style={styles.badge}>
                            <Text style={styles.badgeText} numberOfLines={1}>
                                {badgeLabel(plan)}
                            </Text>
                        </View>
                    </View>
                </View>

                {plan.installmentNumber != null && plan.installmentCount != null ? (
                    <Text style={[styles.progressText, { fontSize: scaleFont(typography.fontSize.sm) }]}>
                        {t('financingPlan.progressValue', {
                            current: plan.installmentNumber,
                            count: plan.installmentCount,
                        })}
                    </Text>
                ) : null}
                {progress != null ? (
                    <View style={styles.barTrack}>
                        <View style={[styles.barFill, { width: `${Math.round(progress * 100)}%` }]} />
                    </View>
                ) : null}

                {details.map(detail => (
                    <View key={detail.key} style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { fontSize: scaleFont(typography.fontSize.sm) }]}>
                            {detail.label}
                        </Text>
                        <Text style={[styles.detailValue, { fontSize: scaleFont(typography.fontSize.sm) }]}>
                            {detail.value}
                        </Text>
                    </View>
                ))}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <HomeBackground />
            <View
                style={[
                    styles.header,
                    { paddingTop: insets.top + spacing.base, paddingHorizontal: horizontalPadding },
                ]}
            >
                <ScreenBackButton onPress={handleBack} />
                <View style={styles.headerText}>
                    <Text style={[styles.title, { fontSize: scaleFont(typography.fontSize['2xl']) }]}>
                        {t('cardInstallments.title')}
                    </Text>
                    {card ? (
                        <Text style={[styles.subtitle, { fontSize: scaleFont(typography.fontSize.md) }]}>
                            {card.name}
                        </Text>
                    ) : null}
                </View>
            </View>

            <ScrollView
                contentContainerStyle={[
                    styles.content,
                    {
                        paddingHorizontal: horizontalPadding,
                        paddingBottom: insets.bottom + spacing['4xl'],
                    },
                    contentMaxWidth
                        ? { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }
                        : null,
                ]}
                showsVerticalScrollIndicator={false}
            >
                {plans.length === 0 ? (
                    <Text style={styles.emptyText}>{t('cardInstallments.empty')}</Text>
                ) : (
                    <>
                        {plans.map(renderPlan)}
                        <View style={styles.footer}>
                            {summary.totals.map(total => (
                                <View key={total.currency} style={styles.footerGroup}>
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>
                                            {t('cardInstallments.totalMonthly')}
                                        </Text>
                                        <Text style={styles.detailValue}>
                                            {formatCurrency(total.monthly, total.currency, locale)}
                                        </Text>
                                    </View>
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>
                                            {t('cardInstallments.totalRemaining')}
                                        </Text>
                                        <Text style={styles.detailValue}>
                                            {formatCurrency(total.remaining, total.currency, locale)}
                                        </Text>
                                    </View>
                                </View>
                            ))}
                            {statementDate ? (
                                <Text style={styles.asOf}>
                                    {t('cardInstallments.asOfStatement', { date: statementDate })}
                                </Text>
                            ) : null}
                        </View>
                    </>
                )}
            </ScrollView>
        </View>
    );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.base,
        paddingBottom: spacing.base,
    },
    headerText: { flex: 1 },
    title: { color: colors.textPrimary, fontWeight: typography.fontWeight.bold },
    subtitle: { color: colors.textSecondary, marginTop: spacing.xs },
    content: { gap: spacing.base },
    emptyText: { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xl },
    planCard: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.xl,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.base,
        gap: spacing.xs,
    },
    planHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.sm,
    },
    merchant: { flex: 1, color: colors.textPrimary, fontWeight: typography.fontWeight.bold },
    tags: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    badge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: borderRadius.full,
        backgroundColor: colors.surfaceElevated,
        borderWidth: 1,
        borderColor: colors.border,
    },
    badgeText: {
        fontSize: typography.fontSize.xs,
        fontWeight: typography.fontWeight.semibold,
        color: colors.primaryLight,
    },
    finalTag: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: borderRadius.full,
        backgroundColor: colors.success,
    },
    finalTagText: {
        fontSize: typography.fontSize.xs,
        fontWeight: typography.fontWeight.semibold,
        color: '#FFFFFF',
    },
    progressText: { color: colors.textSecondary },
    barTrack: {
        height: 6,
        borderRadius: borderRadius.full,
        backgroundColor: colors.surfaceElevated,
        overflow: 'hidden',
    },
    barFill: {
        height: '100%',
        borderRadius: borderRadius.full,
        backgroundColor: colors.primary,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: spacing.sm,
        paddingTop: spacing.xs,
    },
    detailLabel: { flex: 1, color: colors.textSecondary },
    detailValue: { color: colors.textPrimary, fontWeight: typography.fontWeight.semibold },
    footer: {
        backgroundColor: colors.surfaceElevated,
        borderRadius: borderRadius.xl,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.base,
        gap: spacing.sm,
    },
    footerGroup: { gap: spacing.xs },
    asOf: { color: colors.textMuted, fontSize: typography.fontSize.xs },
});
