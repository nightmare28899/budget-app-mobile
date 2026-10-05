import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { MainDrawerScreenProps } from '../../navigation/types';
import { AnimatedScreen } from '../../components/ui/primitives/AnimatedScreen';
import { HomeBackground } from '../../components/ui/layout/HomeBackground';
import { Button } from '../../components/ui/primitives/Button';
import { PremiumFeatureGate } from '../../components/premium/PremiumFeatureGate';
import { FilterChipRow } from '../../components/statements/FilterChipRow';
import { StatementListItem } from '../../components/statements/StatementListItem';
import { StatementScreenHeader } from '../../components/statements/StatementScreenHeader';
import { formatCardDisplayName } from '../../components/creditCards/creditCardFormat';
import { useCreditCardsCatalog } from '../../hooks/creditCards/useCreditCardsCatalog';
import { usePremiumAccess } from '../../hooks/access/usePremiumAccess';
import { useStatementsList } from '../../hooks/statements/useStatementsList';
import { useI18n } from '../../hooks/shared/useI18n';
import {
    STATEMENT_STATUS_FILTERS,
    StatementStatusFilter,
} from '../../modules/statements/statementStatus';
import {
    borderRadius,
    spacing,
    typography,
    useResponsive,
    useTheme,
    useThemedStyles,
    SemanticColors,
} from '../../theme/index';

const ALL_KEY = 'ALL';

export function StatementsScreen({ navigation, route }: MainDrawerScreenProps<'Statements'>) {
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);
    const insets = useSafeAreaInsets();
    const { t } = useI18n();
    const { hasPremium } = usePremiumAccess();
    const { horizontalPadding, contentMaxWidth, scaleFont } = useResponsive();
    const [cardFilter, setCardFilter] = useState<string>(route.params?.creditCardId ?? ALL_KEY);
    const [statusFilter, setStatusFilter] = useState<StatementStatusFilter>(ALL_KEY);

    const paramCardId = route.params?.creditCardId;
    useEffect(() => {
        if (paramCardId) {
            setCardFilter(paramCardId);
        }
    }, [paramCardId]);

    const { cards } = useCreditCardsCatalog({ includeInactive: true, enabled: hasPremium });
    const {
        items,
        isLoading,
        isError,
        isRefreshing,
        isFetchingNextPage,
        hasNextPage,
        fetchNextPage,
        refetch,
    } = useStatementsList({
        creditCardId: cardFilter === ALL_KEY ? undefined : cardFilter,
        status: statusFilter === ALL_KEY ? undefined : statusFilter,
        enabled: hasPremium,
    });

    const cardsById = useMemo(() => new Map(cards.map(card => [card.id, card])), [cards]);
    const cardChips = useMemo(
        () => [
            { key: ALL_KEY, label: t('statements.filter.allCards') },
            ...cards.map(card => ({
                key: card.id,
                label: `${formatCardDisplayName(card)} ·${card.last4}`,
            })),
        ],
        [cards, t],
    );
    const statusChips = useMemo(
        () =>
            STATEMENT_STATUS_FILTERS.map(key => ({
                key,
                label: key === ALL_KEY ? t('statements.filter.allStatuses') : t(`statements.status.${key}`),
            })),
        [t],
    );

    if (!hasPremium) {
        return (
            <PremiumFeatureGate
                feature="statement_imports"
                onContinueToAuth={() => navigation.navigate('Auth', { screen: 'Login' })}
            />
        );
    }

    const handleBack = () => {
        if (navigation.canGoBack()) {
            navigation.goBack();
            return;
        }
        navigation.navigate('Tabs', { screen: 'Dashboard' });
    };

    const openUpload = () => {
        navigation.navigate('StatementUpload', {
            creditCardId: cardFilter === ALL_KEY ? undefined : cardFilter,
        });
    };

    const contentMaxWidthStyle = contentMaxWidth
        ? { maxWidth: contentMaxWidth, alignSelf: 'center' as const, width: '100%' as const }
        : null;

    const renderEmpty = () => {
        if (isLoading) {
            return (
                <View style={styles.stateCard}>
                    <ActivityIndicator color={colors.primary} />
                    <Text style={styles.stateText}>{t('common.loading')}</Text>
                </View>
            );
        }
        if (isError) {
            return (
                <View style={styles.stateCard}>
                    <Icon name="cloud-offline-outline" size={26} color={colors.textMuted} />
                    <Text style={styles.stateText}>{t('statements.loadFailed')}</Text>
                    <Button
                        title={t('statements.retry')}
                        variant="secondary"
                        onPress={() => refetch()}
                        containerStyle={styles.stateButton}
                    />
                </View>
            );
        }
        return (
            <View style={styles.stateCard}>
                <View style={styles.emptyIconWrap}>
                    <Icon name="receipt-outline" size={26} color={colors.primaryLight} />
                </View>
                <Text style={[styles.emptyTitle, { fontSize: scaleFont(typography.fontSize.lg) }]}>
                    {t('statements.emptyTitle')}
                </Text>
                <Text style={[styles.stateText, { fontSize: scaleFont(typography.fontSize.sm) }]}>
                    {t('statements.emptyDescription')}
                </Text>
                <Button
                    title={t('statements.upload')}
                    onPress={openUpload}
                    containerStyle={styles.stateButton}
                />
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <HomeBackground />
            <AnimatedScreen style={styles.flex1} delay={20}>
                <StatementScreenHeader
                    title={t('statements.title')}
                    subtitle={t('statements.subtitle')}
                    onBack={handleBack}
                    actionIcon="cloud-upload-outline"
                    actionLabel={t('statements.upload')}
                    onAction={openUpload}
                />
                {cards.length > 1 ? (
                    <FilterChipRow
                        chips={cardChips}
                        selectedKey={cardFilter}
                        onSelect={setCardFilter}
                        horizontalPadding={horizontalPadding}
                    />
                ) : null}
                <FilterChipRow
                    chips={statusChips}
                    selectedKey={statusFilter}
                    onSelect={key => setStatusFilter(key as StatementStatusFilter)}
                    horizontalPadding={horizontalPadding}
                />
                <FlatList
                    data={items}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => (
                        <StatementListItem
                            item={item}
                            card={item.creditCardId ? cardsById.get(item.creditCardId) : undefined}
                            onPress={() => navigation.navigate('StatementDetail', { id: item.id })}
                        />
                    )}
                    ItemSeparatorComponent={Separator}
                    ListEmptyComponent={renderEmpty}
                    ListFooterComponent={
                        hasNextPage ? (
                            <Button
                                title={t('statements.loadMore')}
                                variant="secondary"
                                loading={isFetchingNextPage}
                                onPress={() => fetchNextPage()}
                                containerStyle={styles.loadMore}
                            />
                        ) : null
                    }
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefreshing}
                            onRefresh={() => refetch()}
                            tintColor={colors.primary}
                        />
                    }
                    contentContainerStyle={[
                        styles.listContent,
                        {
                            paddingHorizontal: horizontalPadding,
                            paddingBottom: insets.bottom + spacing['4xl'],
                        },
                        contentMaxWidthStyle,
                    ]}
                    showsVerticalScrollIndicator={false}
                />
            </AnimatedScreen>
        </View>
    );
}

function Separator() {
    return <View style={separatorStyle} />;
}

const separatorStyle = { height: spacing.base };

const createStyles = (colors: SemanticColors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    flex1: {
        flex: 1,
    },
    listContent: {
        paddingTop: spacing.base,
    },
    stateCard: {
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: borderRadius.xl,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.xl,
        gap: spacing.sm,
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
    stateText: {
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
    },
    stateButton: {
        marginTop: spacing.sm,
        minWidth: 220,
    },
    loadMore: {
        marginTop: spacing.base,
    },
});
