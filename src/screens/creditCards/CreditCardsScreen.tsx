import React, { useMemo, useState } from 'react';
import {
    ActivityIndicator,
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

    const overviewById = useMemo(() => {
        return new Map((overview?.cards ?? []).map((card) => [card.id, card]));
    }, [overview?.cards]);
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
                        <View style={styles.list}>
                            {overview ? (
                                <>
                                    <PaymentReminderBanner cards={overview.cards} />
                                    <CreditCardKpiSection
                                        portfolio={overview.portfolio}
                                        transactionCount={transactionCount}
                                    />
                                </>
                            ) : null}

                            {cards.map((card) => (
                                <CreditCardTile
                                    key={card.id}
                                    card={card}
                                    overview={overviewById.get(card.id)}
                                    onEdit={() => handleEditCard(card)}
                                    onDeactivate={() => handleDeactivate(card.id, card.name)}
                                    onActivate={() => handleActivate(card.id)}
                                    onOpenStatements={() =>
                                        navigation.navigate('Statements', { creditCardId: card.id })
                                    }
                                    onOpenInstallmentPlans={() =>
                                        navigation.navigate('CardInstallmentPlans', { creditCardId: card.id })
                                    }
                                    onViewStatement={id => navigation.navigate('StatementDetail', { id })}
                                    onRegisterPayment={statementId =>
                                        setPayTarget({ statementId, cardId: card.id })
                                    }
                                    isRemoving={isRemoving}
                                    isUpdating={isUpdating}
                                />
                            ))}
                        </View>
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
});
