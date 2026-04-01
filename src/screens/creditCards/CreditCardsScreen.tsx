import React from 'react';
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
import { AnimatedScreen } from '../../components/ui/AnimatedScreen';
import { HomeBackground } from '../../components/ui/HomeBackground';
import { Button } from '../../components/ui/Button';
import { PremiumFeatureGate } from '../../components/premium/PremiumFeatureGate';
import { useI18n } from '../../hooks/useI18n';
import { useAppAlert } from '../../components/alerts/AlertProvider';
import { useAuthStore } from '../../store/authStore';
import { formatCurrency } from '../../utils/format';
import { formatCreditCardLabel, formatCreditCardSummary } from '../../utils/creditCards';
import { getCurrencyLocale } from '../../utils/currency';
import {
    borderRadius,
    spacing,
    typography,
    useResponsive,
    useTheme,
    useThemedStyles,
} from '../../theme';
import { withAlpha } from '../../utils/subscriptions';
import { usePremiumAccess } from '../../hooks/usePremiumAccess';

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

    if (!hasPremium) {
        return (
            <PremiumFeatureGate
                feature="credit_cards"
                onContinueToAuth={() => navigation.navigate('Auth', { screen: 'Login' })}
            />
        );
    }

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
                            {cards.map((card) => (
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

                                    <View style={styles.metaGrid}>
                                        <View style={styles.metaBlock}>
                                            <Text
                                                style={[
                                                    styles.metaLabel,
                                                    { fontSize: scaleFont(typography.fontSize.xs) },
                                                ]}
                                            >
                                                {t('creditCards.limit')}
                                            </Text>
                                            <Text
                                                style={[
                                                    styles.metaValue,
                                                    { fontSize: scaleFont(typography.fontSize.sm) },
                                                ]}
                                            >
                                                {card.creditLimit != null
                                                    ? formatCurrency(card.creditLimit, user?.currency, locale)
                                                    : t('common.notAvailable')}
                                            </Text>
                                        </View>
                                        <View style={styles.metaBlock}>
                                            <Text
                                                style={[
                                                    styles.metaLabel,
                                                    { fontSize: scaleFont(typography.fontSize.xs) },
                                                ]}
                                            >
                                                {t('creditCards.closingDay')}
                                            </Text>
                                            <Text
                                                style={[
                                                    styles.metaValue,
                                                    { fontSize: scaleFont(typography.fontSize.sm) },
                                                ]}
                                            >
                                                {card.closingDay ?? t('common.notAvailable')}
                                            </Text>
                                        </View>
                                        <View style={styles.metaBlock}>
                                            <Text
                                                style={[
                                                    styles.metaLabel,
                                                    { fontSize: scaleFont(typography.fontSize.xs) },
                                                ]}
                                            >
                                                {t('creditCards.paymentDueDay')}
                                            </Text>
                                            <Text
                                                style={[
                                                    styles.metaValue,
                                                    { fontSize: scaleFont(typography.fontSize.sm) },
                                                ]}
                                            >
                                                {card.paymentDueDay ?? t('common.notAvailable')}
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
                            ))}
                        </View>
                    )}
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
    header: {
        paddingBottom: spacing.base,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.base,
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
