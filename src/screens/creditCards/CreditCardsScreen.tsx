import React, { useMemo } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { MainDrawerScreenProps } from '../../navigation/types';
import { useCreditCardsCatalog } from '../../hooks/useCreditCardsCatalog';
import { useCreditCardsOverview } from '../../hooks/useCreditCardsOverview';
import { AnimatedScreen } from '../../components/ui/primitives/AnimatedScreen';
import { HomeBackground } from '../../components/ui/layout/HomeBackground';
import { Button } from '../../components/ui/primitives/Button';
import { ScreenBackButton } from '../../components/ui/primitives/ScreenBackButton';
import { PremiumFeatureGate } from '../../components/premium/PremiumFeatureGate';
import { useI18n } from '../../hooks/useI18n';
import { useAppAlert } from '../../components/alerts/AlertProvider';
import { useAuthStore } from '../../store/authStore';
import { formatCurrency } from '../../utils/core/format';
import { formatCreditCardLabel, formatCreditCardSummary } from '../../utils/domain/creditCards';
import { getCurrencyLocale } from '../../utils/domain/currency';
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
import { usePremiumAccess } from '../../hooks/usePremiumAccess';
import { CreditCardOverviewCard } from '../../types/index';

type SignalTone = 'warning' | 'danger' | 'muted';

type SignalItem = {
    key: string;
    label: string;
    tone: SignalTone;
};

function formatShortDate(date: string | null, locale: 'es-MX' | 'en-US') {
    if (!date) {
        return null;
    }

    const parsed = new Date(`${date}T12:00:00`);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }

    return new Intl.DateTimeFormat(locale, {
        month: 'short',
        day: 'numeric',
    }).format(parsed);
}

export function CreditCardsScreen({ navigation }: MainDrawerScreenProps<'CreditCards'>) {
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);
    const insets = useSafeAreaInsets();
    const { t, language } = useI18n();
    const { alert } = useAppAlert();
    const user = useAuthStore((s) => s.user);
    const { hasPremium } = usePremiumAccess();
    const { horizontalPadding, contentMaxWidth, scaleFont } = useResponsive();
    const locale = getCurrencyLocale(language);
    const {
        cards,
        isLoading,
        isRemoving,
        isUpdating,
        deactivateCard,
        updateCard,
    } = useCreditCardsCatalog({ includeInactive: true, enabled: hasPremium });
    const { overview } = useCreditCardsOverview({
        includeInactive: true,
        enabled: hasPremium,
    });

    const overviewById = useMemo(() => {
        return new Map((overview?.cards ?? []).map((card) => [card.id, card]));
    }, [overview?.cards]);

    if (!hasPremium) {
        return (
            <PremiumFeatureGate
                feature="credit_cards"
                onContinueToAuth={() => navigation.navigate('Auth', { screen: 'Login' })}
            />
        );
    }

    const formatMoney = (amount: number | null | undefined) => {
        if (amount == null) {
            return t('common.notAvailable');
        }

        return formatCurrency(amount, user?.currency, locale);
    };

    const formatUtilization = (value: number | null | undefined) => {
        if (value == null) {
            return t('common.notAvailable');
        }

        const normalized = Number.isInteger(value) ? String(value) : value.toFixed(1);
        return `${normalized}%`;
    };

    const formatTimeline = (days: number | null | undefined) => {
        if (days == null) {
            return t('creditCards.noSchedule');
        }

        if (days === 0) {
            return t('creditCards.today');
        }

        if (days === 1) {
            return t('creditCards.tomorrow');
        }

        return t('creditCards.inDays', { count: days });
    };

    const buildSignals = (card: CreditCardOverviewCard | undefined): SignalItem[] => {
        if (!card) {
            return [];
        }

        const items: SignalItem[] = [];

        if (card.flags.overLimit) {
            items.push({
                key: 'overLimit',
                label: t('creditCards.overLimit'),
                tone: 'danger',
            });
        } else if (card.flags.highUtilization) {
            items.push({
                key: 'highUsage',
                label: t('creditCards.highUsage'),
                tone: 'warning',
            });
        }

        if (card.flags.paymentDueSoon) {
            items.push({
                key: 'dueSoon',
                label: t('creditCards.dueSoon'),
                tone: 'warning',
            });
        }

        if (card.flags.closingSoon) {
            items.push({
                key: 'closesSoon',
                label: t('creditCards.closesSoon'),
                tone: 'muted',
            });
        }

        if (card.flags.missingLimit) {
            items.push({
                key: 'limitMissing',
                label: t('creditCards.limitMissing'),
                tone: 'muted',
            });
        }

        return items;
    };

    const handleDeactivate = (id: string, name: string) => {
        alert(
            t('creditCards.deactivateTitle'),
            t('creditCards.deactivateMessage', { name }),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('creditCards.deactivateAction'),
                    style: 'destructive',
                    onPress: () => {
                        deactivateCard(id).catch(() => undefined);
                    },
                },
            ],
        );
    };

    const handleActivate = (id: string) => {
        updateCard(id, { isActive: true }).catch(() => undefined);
    };

    const handleAddCard = () => {
        navigation.navigate('CreditCardForm');
    };

    const handleBackPress = () => {
        if (navigation.canGoBack()) {
            navigation.goBack();
            return;
        }

        navigation.navigate('Tabs', { screen: 'Dashboard' });
    };

    const handleEditCard = (card: typeof cards[number]) => {
        navigation.navigate('CreditCardForm', { card });
    };

    return (
        <View style={styles.container}>
            <HomeBackground />
            <AnimatedScreen style={styles.flex1} delay={20}>
                <View
                    style={[
                        styles.header,
                        {
                            paddingTop: insets.top + spacing.base,
                            paddingHorizontal: horizontalPadding,
                        },
                        contentMaxWidth
                            ? { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }
                            : null,
                    ]}
                >
                    <View style={styles.headerRow}>
                        <ScreenBackButton
                            onPress={handleBackPress}
                            containerStyle={styles.backButton}
                        />
                        <View style={styles.headerTextWrap}>
                            <Text
                                style={[
                                    styles.headerTitle,
                                    { fontSize: scaleFont(typography.fontSize['2xl']) },
                                ]}
                            >
                                {t('creditCards.title')}
                            </Text>
                            <Text
                                style={[
                                    styles.headerSubtitle,
                                    { fontSize: scaleFont(typography.fontSize.md) },
                                ]}
                            >
                                {t('creditCards.subtitle')}
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={styles.addIconButton}
                            activeOpacity={0.85}
                            onPress={handleAddCard}
                        >
                            <Icon name="add" size={22} color="#FFFFFF" />
                        </TouchableOpacity>
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
                    {cards.length === 0 ? (
                        <View style={styles.emptyState}>
                            <View style={styles.emptyIconWrap}>
                                <Icon name="card-outline" size={26} color={colors.primaryLight} />
                            </View>
                            <Text
                                style={[
                                    styles.emptyTitle,
                                    { fontSize: scaleFont(typography.fontSize.lg) },
                                ]}
                            >
                                {isLoading ? t('common.loading') : t('creditCards.emptyTitle')}
                            </Text>
                            <Text
                                style={[
                                    styles.emptyText,
                                    { fontSize: scaleFont(typography.fontSize.sm) },
                                ]}
                            >
                                {t('creditCards.emptyDescription')}
                            </Text>
                            <Button
                                title={t('creditCards.addFirst')}
                                onPress={handleAddCard}
                                containerStyle={styles.emptyButton}
                            />
                        </View>
                    ) : (
                        <View style={styles.list}>
                            {overview ? (
                                <View
                                    style={[
                                        styles.summaryCard,
                                        {
                                            borderColor: withAlpha(colors.primaryAction, 0.28),
                                        },
                                    ]}
                                >
                                    <View style={styles.summaryHeaderRow}>
                                        <View style={styles.summaryTextWrap}>
                                            <Text
                                                style={[
                                                    styles.summaryTitle,
                                                    { fontSize: scaleFont(typography.fontSize.lg) },
                                                ]}
                                            >
                                                {t('creditCards.walletTitle')}
                                            </Text>
                                            <Text
                                                style={[
                                                    styles.summarySubtitle,
                                                    { fontSize: scaleFont(typography.fontSize.sm) },
                                                ]}
                                            >
                                                {t('creditCards.walletHint')}
                                            </Text>
                                        </View>
                                        <View style={styles.utilizationPill}>
                                            <Text
                                                style={[
                                                    styles.utilizationPillText,
                                                    { fontSize: scaleFont(typography.fontSize.xs) },
                                                ]}
                                            >
                                                {formatUtilization(overview.portfolio.utilizationPercent)}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.summaryGrid}>
                                        <View style={styles.summaryMetric}>
                                            <Text
                                                style={[
                                                    styles.summaryLabel,
                                                    { fontSize: scaleFont(typography.fontSize.xs) },
                                                ]}
                                            >
                                                {t('creditCards.currentCycle')}
                                            </Text>
                                            <Text
                                                style={[
                                                    styles.summaryValue,
                                                    { fontSize: scaleFont(typography.fontSize.base) },
                                                ]}
                                            >
                                                {formatMoney(overview.portfolio.totalCurrentCycleSpend)}
                                            </Text>
                                        </View>
                                        <View style={styles.summaryMetric}>
                                            <Text
                                                style={[
                                                    styles.summaryLabel,
                                                    { fontSize: scaleFont(typography.fontSize.xs) },
                                                ]}
                                            >
                                                {t('creditCards.availableCredit')}
                                            </Text>
                                            <Text
                                                style={[
                                                    styles.summaryValue,
                                                    { fontSize: scaleFont(typography.fontSize.base) },
                                                ]}
                                            >
                                                {overview.portfolio.cardsWithLimit > 0
                                                    ? formatMoney(overview.portfolio.totalAvailableCredit)
                                                    : t('common.notAvailable')}
                                            </Text>
                                        </View>
                                        <View style={styles.summaryMetric}>
                                            <Text
                                                style={[
                                                    styles.summaryLabel,
                                                    { fontSize: scaleFont(typography.fontSize.xs) },
                                                ]}
                                            >
                                                {t('creditCards.dueSoon')}
                                            </Text>
                                            <Text
                                                style={[
                                                    styles.summaryValue,
                                                    { fontSize: scaleFont(typography.fontSize.base) },
                                                ]}
                                            >
                                                {overview.portfolio.paymentDueSoonCount}
                                            </Text>
                                        </View>
                                        <View style={styles.summaryMetric}>
                                            <Text
                                                style={[
                                                    styles.summaryLabel,
                                                    { fontSize: scaleFont(typography.fontSize.xs) },
                                                ]}
                                            >
                                                {t('creditCards.monthlyRecurring')}
                                            </Text>
                                            <Text
                                                style={[
                                                    styles.summaryValue,
                                                    { fontSize: scaleFont(typography.fontSize.base) },
                                                ]}
                                            >
                                                {formatMoney(overview.portfolio.monthlyRecurringSpend)}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            ) : null}

                            {cards.map((card) => {
                                const cardOverview = overviewById.get(card.id);
                                const signals = buildSignals(cardOverview);
                                const nextClosing = formatShortDate(
                                    cardOverview?.schedule.nextClosingDate ?? null,
                                    locale,
                                );
                                const nextPayment = formatShortDate(
                                    cardOverview?.schedule.nextPaymentDueDate ?? null,
                                    locale,
                                );

                                return (
                                    <View
                                        key={card.id}
                                        style={[
                                            styles.cardItem,
                                            {
                                                borderColor: withAlpha(
                                                    card.color || colors.primaryAction,
                                                    0.28,
                                                ),
                                            },
                                        ]}
                                    >
                                        <View style={styles.cardTopRow}>
                                            <View style={styles.cardIdentityRow}>
                                                <View
                                                    style={[
                                                        styles.cardColorDot,
                                                        {
                                                            backgroundColor:
                                                                card.color || colors.primaryAction,
                                                        },
                                                    ]}
                                                />
                                                <View style={styles.cardTextWrap}>
                                                    <Text
                                                        style={[
                                                            styles.cardTitle,
                                                            { fontSize: scaleFont(typography.fontSize.base) },
                                                        ]}
                                                    >
                                                        {formatCreditCardLabel(card)}
                                                    </Text>
                                                    <Text
                                                        style={[
                                                            styles.cardSubtitle,
                                                            { fontSize: scaleFont(typography.fontSize.xs) },
                                                        ]}
                                                    >
                                                        {formatCreditCardSummary(card)}
                                                    </Text>
                                                </View>
                                            </View>
                                            <View
                                                style={[
                                                    styles.statusPill,
                                                    card.isActive
                                                        ? styles.statusPillActive
                                                        : styles.statusPillInactive,
                                                ]}
                                            >
                                                <Text
                                                    style={[
                                                        styles.statusText,
                                                        { fontSize: scaleFont(typography.fontSize.xs) },
                                                    ]}
                                                >
                                                    {t(
                                                        card.isActive
                                                            ? 'creditCards.active'
                                                            : 'creditCards.inactive',
                                                    )}
                                                </Text>
                                            </View>
                                        </View>

                                        {signals.length ? (
                                            <View style={styles.signalRow}>
                                                {signals.map((signal) => {
                                                    const signalColor = signal.tone === 'danger'
                                                        ? colors.error
                                                        : signal.tone === 'warning'
                                                            ? colors.warning
                                                            : colors.textMuted;

                                                    return (
                                                        <View
                                                            key={`${card.id}-${signal.key}`}
                                                            style={[
                                                                styles.signalChip,
                                                                {
                                                                    backgroundColor: withAlpha(signalColor, 0.14),
                                                                    borderColor: withAlpha(signalColor, 0.3),
                                                                },
                                                            ]}
                                                        >
                                                            <Text
                                                                style={[
                                                                    styles.signalText,
                                                                    {
                                                                        color: signalColor,
                                                                        fontSize: scaleFont(typography.fontSize.xs),
                                                                    },
                                                                ]}
                                                            >
                                                                {signal.label}
                                                            </Text>
                                                        </View>
                                                    );
                                                })}
                                            </View>
                                        ) : null}

                                        <View style={styles.metaGrid}>
                                            <View style={styles.metaBlock}>
                                                <Text
                                                    style={[
                                                        styles.metaLabel,
                                                        { fontSize: scaleFont(typography.fontSize.xs) },
                                                    ]}
                                                >
                                                    {t('creditCards.currentCycle')}
                                                </Text>
                                                <Text
                                                    style={[
                                                        styles.metaValue,
                                                        { fontSize: scaleFont(typography.fontSize.sm) },
                                                    ]}
                                                >
                                                    {formatMoney(cardOverview?.currentCycle.spend)}
                                                </Text>
                                                <Text
                                                    style={[
                                                        styles.metaHint,
                                                        { fontSize: scaleFont(typography.fontSize.xs) },
                                                    ]}
                                                >
                                                    {t('creditCards.expensesInCycle', {
                                                        count: cardOverview?.currentCycle.expenseCount ?? 0,
                                                    })}
                                                </Text>
                                            </View>

                                            <View style={styles.metaBlock}>
                                                <Text
                                                    style={[
                                                        styles.metaLabel,
                                                        { fontSize: scaleFont(typography.fontSize.xs) },
                                                    ]}
                                                >
                                                    {t('creditCards.availableCredit')}
                                                </Text>
                                                <Text
                                                    style={[
                                                        styles.metaValue,
                                                        { fontSize: scaleFont(typography.fontSize.sm) },
                                                    ]}
                                                >
                                                    {formatMoney(cardOverview?.creditStatus.availableCredit)}
                                                </Text>
                                                <Text
                                                    style={[
                                                        styles.metaHint,
                                                        { fontSize: scaleFont(typography.fontSize.xs) },
                                                    ]}
                                                >
                                                    {t('creditCards.limit')} {formatMoney(cardOverview?.creditStatus.limit)}
                                                </Text>
                                            </View>

                                            <View style={styles.metaBlock}>
                                                <Text
                                                    style={[
                                                        styles.metaLabel,
                                                        { fontSize: scaleFont(typography.fontSize.xs) },
                                                    ]}
                                                >
                                                    {t('creditCards.utilization')}
                                                </Text>
                                                <Text
                                                    style={[
                                                        styles.metaValue,
                                                        { fontSize: scaleFont(typography.fontSize.sm) },
                                                    ]}
                                                >
                                                    {formatUtilization(cardOverview?.creditStatus.utilizationPercent)}
                                                </Text>
                                                <Text
                                                    style={[
                                                        styles.metaHint,
                                                        { fontSize: scaleFont(typography.fontSize.xs) },
                                                    ]}
                                                >
                                                    {cardOverview?.flags.missingLimit
                                                        ? t('creditCards.limitMissing')
                                                        : t('creditCards.walletHint')}
                                                </Text>
                                            </View>
                                        </View>

                                        <View style={styles.metaGrid}>
                                            <View style={styles.metaBlock}>
                                                <Text
                                                    style={[
                                                        styles.metaLabel,
                                                        { fontSize: scaleFont(typography.fontSize.xs) },
                                                    ]}
                                                >
                                                    {t('creditCards.nextClosing')}
                                                </Text>
                                                <Text
                                                    style={[
                                                        styles.metaValue,
                                                        { fontSize: scaleFont(typography.fontSize.sm) },
                                                    ]}
                                                >
                                                    {nextClosing ?? t('common.notAvailable')}
                                                </Text>
                                                <Text
                                                    style={[
                                                        styles.metaHint,
                                                        { fontSize: scaleFont(typography.fontSize.xs) },
                                                    ]}
                                                >
                                                    {formatTimeline(cardOverview?.schedule.daysUntilClosing)}
                                                </Text>
                                            </View>

                                            <View style={styles.metaBlock}>
                                                <Text
                                                    style={[
                                                        styles.metaLabel,
                                                        { fontSize: scaleFont(typography.fontSize.xs) },
                                                    ]}
                                                >
                                                    {t('creditCards.nextPayment')}
                                                </Text>
                                                <Text
                                                    style={[
                                                        styles.metaValue,
                                                        { fontSize: scaleFont(typography.fontSize.sm) },
                                                    ]}
                                                >
                                                    {nextPayment ?? t('common.notAvailable')}
                                                </Text>
                                                <Text
                                                    style={[
                                                        styles.metaHint,
                                                        { fontSize: scaleFont(typography.fontSize.xs) },
                                                    ]}
                                                >
                                                    {formatTimeline(cardOverview?.schedule.daysUntilPaymentDue)}
                                                </Text>
                                            </View>

                                            <View style={styles.metaBlock}>
                                                <Text
                                                    style={[
                                                        styles.metaLabel,
                                                        { fontSize: scaleFont(typography.fontSize.xs) },
                                                    ]}
                                                >
                                                    {t('creditCards.linkedSubscriptions')}
                                                </Text>
                                                <Text
                                                    style={[
                                                        styles.metaValue,
                                                        { fontSize: scaleFont(typography.fontSize.sm) },
                                                    ]}
                                                >
                                                    {cardOverview?.subscriptions.activeCount ?? 0}
                                                </Text>
                                                <Text
                                                    style={[
                                                        styles.metaHint,
                                                        { fontSize: scaleFont(typography.fontSize.xs) },
                                                    ]}
                                                >
                                                    {formatMoney(cardOverview?.subscriptions.monthlyRecurringSpend ?? 0)}
                                                </Text>
                                            </View>
                                        </View>

                                        <View style={styles.actionsRow}>
                                            <Button
                                                title={t('common.edit')}
                                                variant="secondary"
                                                onPress={() => handleEditCard(card)}
                                                containerStyle={styles.actionButton}
                                                textStyle={styles.actionButtonText}
                                            />
                                            {card.isActive ? (
                                                <Button
                                                    title={t('creditCards.deactivateAction')}
                                                    variant="danger"
                                                    onPress={() => handleDeactivate(card.id, card.name)}
                                                    disabled={isRemoving}
                                                    containerStyle={styles.actionButton}
                                                    textStyle={styles.actionButtonText}
                                                />
                                            ) : (
                                                <Button
                                                    title={t('creditCards.activateAction')}
                                                    onPress={() => handleActivate(card.id)}
                                                    disabled={isUpdating}
                                                    containerStyle={styles.actionButton}
                                                    textStyle={styles.actionButtonText}
                                                />
                                            )}
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    )}
                </ScrollView>
            </AnimatedScreen>
        </View>
    );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    flex1: {
        flex: 1,
    },
    header: {
        paddingBottom: spacing.base,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: spacing.base,
    },
    backButton: {
        marginTop: 2,
    },
    headerTextWrap: {
        flex: 1,
    },
    headerTitle: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.bold,
    },
    headerSubtitle: {
        color: colors.textSecondary,
        marginTop: spacing.xs,
    },
    addIconButton: {
        width: 42,
        height: 42,
        borderRadius: borderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primaryAction,
    },
    content: {
        paddingBottom: spacing['4xl'],
    },
    emptyState: {
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: borderRadius.xl,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.xl,
        gap: spacing.sm,
        marginTop: spacing.base,
    },
    emptyIconWrap: {
        width: 52,
        height: 52,
        borderRadius: borderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surfaceElevated,
    },
    emptyTitle: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.bold,
    },
    emptyText: {
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
    },
    emptyButton: {
        marginTop: spacing.sm,
        minWidth: 220,
    },
    list: {
        gap: spacing.base,
    },
    summaryCard: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.xl,
        borderWidth: 1,
        padding: spacing.base,
        gap: spacing.base,
    },
    summaryHeaderRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: spacing.sm,
    },
    summaryTextWrap: {
        flex: 1,
        gap: spacing.xs,
    },
    summaryTitle: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.bold,
    },
    summarySubtitle: {
        color: colors.textSecondary,
        lineHeight: 20,
    },
    utilizationPill: {
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.full,
        backgroundColor: withAlpha(colors.primaryAction, 0.18),
        borderWidth: 1,
        borderColor: withAlpha(colors.primaryAction, 0.32),
    },
    utilizationPillText: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.semibold,
    },
    summaryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    summaryMetric: {
        flexBasis: '48%',
        flexGrow: 1,
        backgroundColor: colors.surfaceElevated,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.sm,
        gap: 4,
    },
    summaryLabel: {
        color: colors.textMuted,
        fontWeight: typography.fontWeight.medium,
    },
    summaryValue: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.semibold,
    },
    cardItem: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.xl,
        borderWidth: 1,
        padding: spacing.base,
        gap: spacing.base,
    },
    cardTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.sm,
    },
    cardIdentityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        flex: 1,
    },
    cardColorDot: {
        width: 14,
        height: 14,
        borderRadius: borderRadius.full,
    },
    cardTextWrap: {
        flex: 1,
    },
    cardTitle: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.semibold,
    },
    cardSubtitle: {
        color: colors.textMuted,
        marginTop: 2,
    },
    statusPill: {
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.full,
        borderWidth: 1,
    },
    statusPillActive: {
        backgroundColor: `${colors.success}18`,
        borderColor: `${colors.success}44`,
    },
    statusPillInactive: {
        backgroundColor: `${colors.textMuted}18`,
        borderColor: `${colors.textMuted}44`,
    },
    statusText: {
        color: colors.textSecondary,
        fontWeight: typography.fontWeight.semibold,
    },
    signalRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.xs,
    },
    signalChip: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 6,
        borderRadius: borderRadius.full,
        borderWidth: 1,
    },
    signalText: {
        fontWeight: typography.fontWeight.semibold,
    },
    metaGrid: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    metaBlock: {
        flex: 1,
        backgroundColor: colors.surfaceElevated,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.sm,
        gap: 4,
    },
    metaLabel: {
        color: colors.textMuted,
        fontWeight: typography.fontWeight.medium,
    },
    metaValue: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.semibold,
    },
    metaHint: {
        color: colors.textSecondary,
        lineHeight: 16,
    },
    actionsRow: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    actionButton: {
        flex: 1,
        minHeight: 44,
    },
    actionButtonText: {
        fontSize: typography.fontSize.sm,
    },
});
