import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { MainDrawerScreenProps } from '../../navigation/types';
import { useCreditCardsCatalog } from '../../hooks/creditCards/useCreditCardsCatalog';
import { useCreditCardsOverview } from '../../hooks/creditCards/useCreditCardsOverview';
import { AnimatedScreen } from '../../components/ui/primitives/AnimatedScreen';
import { HomeBackground } from '../../components/ui/layout/HomeBackground';
import { Button } from '../../components/ui/primitives/Button';
import { ScreenBackButton } from '../../components/ui/primitives/ScreenBackButton';
import { PremiumFeatureGate } from '../../components/premium/PremiumFeatureGate';
import { useI18n } from '../../hooks/shared/useI18n';
import { useAppAlert } from '../../components/alerts/AlertProvider';
import {
    borderRadius,
    spacing,
    typography,
    useResponsive,
    useTheme,
    useThemedStyles,
    SemanticColors,
} from '../../theme/index';
import { usePremiumAccess } from '../../hooks/access/usePremiumAccess';
import { CreditCardKpiSection } from '../../components/creditCards/CreditCardKpiSection';
import { CreditCardTile } from '../../components/creditCards/CreditCardTile';
import { CardStatementPaymentSheet } from '../../components/creditCards/CardStatementPaymentSheet';
import { PaymentReminderBanner } from '../../components/creditCards/PaymentReminderBanner';
import { CardPagerIndicator } from '../../components/creditCards/CardPagerIndicator';
import { CardStackCarousel } from '../../components/creditCards/CardStackCarousel';
import { CreditCardFace } from '../../components/creditCards/CreditCardFace';
import { cardBadgeColor, cardBadgeLabel, dueLabelText } from '../../components/creditCards/cardLabels';
import { formatCardDisplayName } from '../../components/creditCards/creditCardFormat';
import { CARD_STACK, afterDismiss, resolveSelection } from '../../modules/creditCards/cardStack';
import { dueLabelOf, overviewCardStatus } from '../../modules/creditCards/cardStatus';

export function CreditCardsScreen({ navigation }: MainDrawerScreenProps<'CreditCards'>) {
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);
    const insets = useSafeAreaInsets();
    const { t } = useI18n();
    const { alert } = useAppAlert();
    const { hasPremium } = usePremiumAccess();
    const { horizontalPadding, contentMaxWidth, scaleFont } = useResponsive();
    const contentMaxWidthStyle = contentMaxWidth
        ? { maxWidth: contentMaxWidth, alignSelf: 'center' as const, width: '100%' as const }
        : null;
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

    const [payTarget, setPayTarget] = useState<{ statementId: string; cardId: string } | null>(null);
    // Selection is tracked by id so refreshes and list changes keep (or sensibly move) the selected card.
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const lastIndex = useRef(0);
    const [fanExpanded, setFanExpanded] = useState(false);

    const overviewById = useMemo(() => {
        return new Map((overview?.cards ?? []).map((card) => [card.id, card]));
    }, [overview?.cards]);
    const cardIds = useMemo(() => cards.map(card => card.id), [cards]);
    const selectedIndex = resolveSelection(cardIds, selectedId, lastIndex.current);
    useEffect(() => {
        if (selectedIndex >= 0) {
            lastIndex.current = selectedIndex;
        }
    }, [selectedIndex]);
    const selectCard = useCallback(
        (index: number) => {
            const target = cards[index];
            if (target) {
                lastIndex.current = index;
                setSelectedId(target.id);
            }
        },
        [cards],
    );
    const selectedCard = selectedIndex >= 0 ? cards[selectedIndex] : null;
    const transactionCount = useMemo(() => {
        return (overview?.cards ?? [])
            .filter((card) => card.isActive)
            .reduce((sum, card) => sum + card.currentCycle.expenseCount, 0);
    }, [overview?.cards]);

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

    /** One carousel page: the card art with its merged screen-reader description. */
    const renderCardArt = (card: typeof cards[number]) => {
        const overviewCard = overviewById.get(card.id);
        const status = overviewCard ? overviewCardStatus(overviewCard) : null;
        const badge = status?.badge ?? 'NONE';
        const badgeText = cardBadgeLabel(badge, t);
        const dueText =
            card.isActive && overviewCard
                ? dueLabelText(dueLabelOf(overviewCard.schedule.daysUntilPaymentDue), t)
                : null;
        const details = [
            card.brand || null,
            card.isActive ? null : t('creditCards.inactive'),
            badgeText,
            dueText ? t('creditCards.faceDueCd', { when: dueText }) : null,
        ]
            .filter(Boolean)
            .join(', ');

        return (
            <CreditCardFace
                card={card}
                statusLabel={badgeText}
                statusColor={cardBadgeColor(badge)}
                inactiveLabel={t('creditCards.inactive')}
                aspectRatio={CARD_STACK.aspectRatio}
                accessibilityLabel={t('creditCards.faceCd', {
                    name: formatCardDisplayName(card),
                    last4: card.last4,
                    details,
                })}
            />
        );
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
                        contentMaxWidthStyle,
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
                        contentMaxWidthStyle,
                    ]}
                    showsVerticalScrollIndicator={false}
                >
                    {isLoading && cards.length === 0 ? (
                        <View style={styles.loadingState}>
                            <ActivityIndicator color={colors.primary} />
                            <Text style={styles.emptyText}>{t('common.loading')}</Text>
                        </View>
                    ) : cards.length === 0 ? (
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
                        <Pressable
                            style={styles.list}
                            // Pressable is accessible by default, which would merge the whole screen into one
                            // VoiceOver element; it is only a tap-away layer, so its children stay individually reachable.
                            accessible={false}
                            disabled={!fanExpanded}
                            onPress={() => setFanExpanded(afterDismiss(cards.length, 0).expanded)}
                        >
                            {overview ? (
                                <>
                                    <PaymentReminderBanner cards={overview.cards} />
                                    <CreditCardKpiSection
                                        portfolio={overview.portfolio}
                                        transactionCount={transactionCount}
                                    />
                                </>
                            ) : null}

                            <View style={styles.carousel}>
                                <CardStackCarousel
                                    count={cards.length}
                                    selected={Math.max(selectedIndex, 0)}
                                    keyOf={index => cards[index].id}
                                    onSelect={selectCard}
                                    expanded={fanExpanded}
                                    onExpandedChange={setFanExpanded}
                                    labelOf={index =>
                                        t('creditCards.fanItemCd', {
                                            name: formatCardDisplayName(cards[index]),
                                            last4: cards[index].last4,
                                        })
                                    }
                                    renderCard={index => renderCardArt(cards[index])}
                                />
                                <CardPagerIndicator count={cards.length} current={Math.max(selectedIndex, 0)} />
                            </View>

                            {selectedCard ? (
                                <CreditCardTile
                                    key={selectedCard.id}
                                    card={selectedCard}
                                    overview={overviewById.get(selectedCard.id)}
                                    hideFace
                                    onEdit={() => handleEditCard(selectedCard)}
                                    onDeactivate={() => handleDeactivate(selectedCard.id, selectedCard.name)}
                                    onActivate={() => handleActivate(selectedCard.id)}
                                    onOpenStatements={() =>
                                        navigation.navigate('Statements', { creditCardId: selectedCard.id })
                                    }
                                    onOpenInstallmentPlans={() =>
                                        navigation.navigate('CardInstallmentPlans', { creditCardId: selectedCard.id })
                                    }
                                    onViewStatement={id => navigation.navigate('StatementDetail', { id })}
                                    onRegisterPayment={statementId =>
                                        setPayTarget({ statementId, cardId: selectedCard.id })
                                    }
                                    isRemoving={isRemoving}
                                    isUpdating={isUpdating}
                                />
                            ) : null}
                        </Pressable>
                    )}
                </ScrollView>
            </AnimatedScreen>
            <CardStatementPaymentSheet
                target={payTarget}
                onClose={() => setPayTarget(null)}
                onReviewStatement={statement => {
                    setPayTarget(null);
                    navigation.navigate(
                        statement.status === 'NEEDS_REVIEW' || statement.status === 'PARSED'
                            ? 'StatementReview'
                            : 'StatementDetail',
                        { id: statement.id },
                    );
                }}
            />
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
    loadingState: {
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
    carousel: {
        gap: spacing.xs,
    },
});
