import React, { useMemo } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootScreenProps } from '../../navigation/types';
import { AnimatedScreen } from '../../components/ui/primitives/AnimatedScreen';
import { EmptyState } from '../../components/ui/primitives/EmptyState';
import { SearchField } from '../../components/ui/primitives/SearchField';
import { ScreenHeader } from '../../components/ui/layout/ScreenHeader';
import { HomeBackground } from '../../components/ui/layout/HomeBackground';
import { ExpenseItem } from '../../components/ui/domain/ExpenseItem';
import { IncomeItem } from '../../components/ui/domain/IncomeItem';
import { SubscriptionItem } from '../../components/ui/domain/SubscriptionItem';
import { useGlobalSearch } from '../../hooks/search/useGlobalSearch';
import { useI18n } from '../../hooks/shared/useI18n';
import { getCurrencyLocale } from '../../utils/domain/currency';
import { SearchGroup } from '../../modules/search/globalSearch';
import {
    SemanticColors,
    spacing,
    typography,
    useResponsive,
    useTheme,
    useThemedStyles,
} from '../../theme/index';

export function SearchScreen({ navigation }: RootScreenProps<'Search'>) {
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);
    const insets = useSafeAreaInsets();
    const { horizontalPadding, contentMaxWidth, scaleFont } = useResponsive();
    const { t, language } = useI18n();
    const locale = getCurrencyLocale(language);
    const { query, setQuery, isIdle, isLoading, outcome, retry } = useGlobalSearch();

    const constrainedContentStyle = useMemo(
        () => (
            contentMaxWidth
                ? {
                    alignSelf: 'center' as const,
                    maxWidth: contentMaxWidth,
                    width: '100%' as const,
                }
                : null
        ),
        [contentMaxWidth],
    );

    const renderHeading = (label: string, group: SearchGroup<unknown>) => (
        <View style={styles.heading}>
            <Text style={[styles.headingTitle, { fontSize: scaleFont(typography.fontSize.md) }]}>
                {t('search.groupCount', { label, count: group.total })}
            </Text>
            {group.total > group.items.length ? (
                <Text style={styles.headingNote}>
                    {t('search.showing', { shown: group.items.length, total: group.total })}
                </Text>
            ) : null}
        </View>
    );

    const renderBody = () => {
        if (isIdle) {
            return (
                <EmptyState
                    icon="search-outline"
                    title={t('search.idleTitle')}
                    description={t('search.idleDescription')}
                />
            );
        }
        if (isLoading || !outcome) {
            return <ActivityIndicator style={styles.loader} color={colors.primary} />;
        }
        if (outcome.error) {
            return (
                <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{t('search.error')}</Text>
                    <TouchableOpacity
                        onPress={retry}
                        activeOpacity={0.85}
                        accessibilityRole="button"
                    >
                        <Text style={styles.retryText}>{t('common.retry')}</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        return (
            <>
                {outcome.isPartial ? (
                    <View style={styles.partialRow}>
                        <Text style={styles.partialText}>{t('search.partial')}</Text>
                        <TouchableOpacity
                            onPress={retry}
                            activeOpacity={0.85}
                            accessibilityRole="button"
                        >
                            <Text style={styles.retryText}>{t('common.retry')}</Text>
                        </TouchableOpacity>
                    </View>
                ) : null}
                {outcome.isEmpty ? (
                    <EmptyState
                        icon="search-outline"
                        title={t('search.emptyTitle')}
                        description={t('search.emptyDescription')}
                    />
                ) : null}
                {outcome.expenses.items.length > 0 ? (
                    <View>
                        {renderHeading(t('dashboard.expensesLabel'), outcome.expenses)}
                        {outcome.expenses.items.map((expense) => (
                            <ExpenseItem
                                key={`expense:${expense.id}`}
                                expense={expense}
                                disableSwipe
                                onPress={(id) => navigation.navigate('ExpenseDetail', { id })}
                            />
                        ))}
                    </View>
                ) : null}
                {outcome.incomes.items.length > 0 ? (
                    <View>
                        {renderHeading(t('income.title'), outcome.incomes)}
                        {outcome.incomes.items.map((income) => (
                            <IncomeItem
                                key={`income:${income.id}`}
                                income={income}
                                locale={locale}
                                onPress={(selected) => navigation.navigate('AddIncome', { income: selected })}
                            />
                        ))}
                    </View>
                ) : null}
                {outcome.subscriptions.items.length > 0 ? (
                    <View>
                        {renderHeading(t('search.groupSubscriptions'), outcome.subscriptions)}
                        {outcome.subscriptions.items.map((subscription) => (
                            <SubscriptionItem
                                key={`subscription:${subscription.id}`}
                                subscription={subscription}
                                locale={locale}
                                onPress={() => navigation.navigate('AddSubscription', { subscription })}
                            />
                        ))}
                    </View>
                ) : null}
            </>
        );
    };

    return (
        <View style={styles.container}>
            <HomeBackground />
            <AnimatedScreen style={styles.flex1} delay={8} duration={200} travelY={6}>
                <ScrollView
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    contentContainerStyle={[
                        {
                            paddingTop: insets.top + spacing.lg,
                            paddingBottom: insets.bottom + spacing['5xl'],
                            paddingHorizontal: horizontalPadding,
                        },
                        constrainedContentStyle,
                    ]}
                >
                    <ScreenHeader
                        title={t('search.title')}
                        onBack={() => navigation.goBack()}
                    />
                    <SearchField
                        value={query}
                        onChangeText={setQuery}
                        placeholder={t('search.hint')}
                        clearAccessibilityLabel={t('search.clear')}
                        autoFocus
                        containerStyle={styles.field}
                    />
                    {renderBody()}
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
    field: {
        marginTop: spacing.md,
        marginBottom: spacing.base,
    },
    loader: {
        marginTop: spacing['3xl'],
    },
    heading: {
        paddingVertical: spacing.sm,
    },
    headingTitle: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.bold,
    },
    headingNote: {
        color: colors.textSecondary,
        marginTop: spacing.xs,
        fontSize: typography.fontSize.sm,
    },
    errorBox: {
        alignItems: 'center',
        gap: spacing.md,
        marginTop: spacing['3xl'],
    },
    errorText: {
        color: colors.textSecondary,
        textAlign: 'center',
    },
    partialRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.md,
        marginBottom: spacing.sm,
    },
    partialText: {
        flex: 1,
        color: colors.textSecondary,
    },
    retryText: {
        color: colors.primaryLight,
        fontWeight: typography.fontWeight.bold,
    },
});
