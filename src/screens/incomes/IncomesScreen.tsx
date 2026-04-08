import React, { useMemo } from 'react';
import {
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DrawerActions } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { MainDrawerScreenProps } from '../../navigation/types';
import { AnimatedScreen } from '../../components/ui/AnimatedScreen';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';
import { HomeBackground } from '../../components/ui/HomeBackground';
import { useIncomesScreen } from '../../hooks/useIncomesScreen';
import { useI18n } from '../../hooks/useI18n';
import { useAuthStore } from '../../store/authStore';
import { formatCurrency, formatDate } from '../../utils/format';
import { formatCurrencyBreakdown, getCurrencyLocale } from '../../utils/currency';
import { withAlpha } from '../../utils/subscriptions';
import {
    borderRadius,
    spacing,
    typography,
    useResponsive,
    useTheme,
    useThemedStyles,
} from '../../theme';

export function IncomesScreen({ route, navigation }: MainDrawerScreenProps<'Income'>) {
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);
    const insets = useSafeAreaInsets();
    const user = useAuthStore((s) => s.user);
    const {
        horizontalPadding,
        contentMaxWidth,
        isSmallPhone,
        scaleFont,
        scaleSize,
    } = useResponsive();
    const { t, tPlural, language } = useI18n();
    const locale = getCurrencyLocale(language);
    const {
        incomes,
        totalCount,
        currencyBreakdown,
        isLoading,
        isRefreshing,
        error,
        refetch,
        onDeleteIncome,
    } = useIncomesScreen({
        navigation,
        successMessage: route.params?.successMessage,
    });

    const summaryText = t('income.overviewSubtitle', {
        count: totalCount,
        total: formatCurrencyBreakdown(currencyBreakdown, {
            locale,
            emptyCurrency: user?.currency,
        }),
    });
    const incomeCountLabel = tPlural('income.count', totalCount);
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
    const onOpenSidebar = () => {
        navigation.dispatch(DrawerActions.openDrawer());
    };

    return (
        <View style={styles.container}>
            <HomeBackground />
            <AnimatedScreen style={styles.flex1} delay={8} duration={200} travelY={6}>
                <ScrollView
                    contentContainerStyle={[
                        styles.content,
                        {
                            paddingTop: insets.top + spacing.lg,
                            paddingBottom: insets.bottom + spacing['5xl'],
                            paddingHorizontal: horizontalPadding,
                        },
                        constrainedContentStyle,
                    ]}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefreshing || isLoading}
                            onRefresh={refetch}
                            tintColor={colors.primary}
                            colors={[colors.primary]}
                        />
                    }
                >
                    <View style={styles.headerBlock}>
                        <View style={styles.headerRow}>
                            <TouchableOpacity
                                onPress={onOpenSidebar}
                                activeOpacity={0.78}
                                style={styles.menuButton}
                            >
                                <Icon name="menu-outline" size={21} color={colors.textPrimary} />
                            </TouchableOpacity>
                            <View style={styles.headerCopy}>
                                <Text style={[styles.headerTitle, { fontSize: scaleFont(typography.fontSize['3xl']) }]}>
                                    {t('income.title')}
                                </Text>
                                <Text style={[styles.headerSubtitle, { fontSize: scaleFont(typography.fontSize.md) }]}>
                                    {summaryText}
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => navigation.navigate('AddEntry', { initialTab: 'income' })}
                                activeOpacity={0.85}
                                style={styles.addButton}
                            >
                                <Icon name="add" size={16} color={colors.textPrimary} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View
                        style={[
                            styles.totalCard,
                            {
                                padding: isSmallPhone
                                    ? scaleSize(spacing.lg, 0.45)
                                    : scaleSize(spacing.xl, 0.45),
                            },
                        ]}
                    >
                        <View style={styles.totalGlow} />
                        <Text style={[styles.totalLabel, { fontSize: scaleFont(typography.fontSize.sm) }]}>
                            {t('income.totalIncome')}
                        </Text>
                        <Text style={[styles.totalValue, { fontSize: scaleFont(typography.fontSize['4xl']) }]}>
                            {formatCurrencyBreakdown(currencyBreakdown, {
                                locale,
                                emptyCurrency: user?.currency,
                            })}
                        </Text>
                        <Text style={[styles.totalMeta, { fontSize: scaleFont(typography.fontSize.xs) }]}>
                            {incomeCountLabel}
                        </Text>
                    </View>

                    {error && incomes.length === 0 ? (
                        <View style={styles.emptyBlock}>
                            <EmptyState
                                icon="alert-circle-outline"
                                title={t('common.error')}
                                description={t('income.loadErrorDescription')}
                            />
                            <Button
                                title={t('common.retry')}
                                onPress={() => {
                                    refetch();
                                }}
                                containerStyle={styles.emptyButton}
                            />
                        </View>
                    ) : !incomes.length ? (
                        <View style={styles.emptyBlock}>
                            <EmptyState
                                icon="trending-up-outline"
                                title={t('income.emptyTitle')}
                                description={t('income.emptyDescription')}
                            />
                            <Button
                                title={t('income.addFirst')}
                                onPress={() => navigation.navigate('AddEntry', { initialTab: 'income' })}
                                containerStyle={styles.emptyButton}
                            />
                        </View>
                    ) : (
                        <View style={styles.cardsList}>
                            {incomes.map((income, index) => (
                                <TouchableOpacity
                                    key={income.id}
                                    activeOpacity={0.86}
                                    style={[
                                        styles.incomeCard,
                                        index < incomes.length - 1 ? styles.cardSpacing : null,
                                    ]}
                                    onPress={() => navigation.navigate('AddIncome', { income })}
                                >
                                    <View style={styles.incomeLeading}>
                                        <View style={styles.iconWrap}>
                                            <Icon
                                                name="trending-up-outline"
                                                size={18}
                                                color={colors.success}
                                            />
                                        </View>
                                        <View style={styles.incomeCopy}>
                                            <Text
                                                style={[
                                                    styles.incomeTitle,
                                                    { fontSize: scaleFont(typography.fontSize.base) },
                                                ]}
                                                numberOfLines={1}
                                            >
                                                {income.title}
                                            </Text>
                                            <Text
                                                style={[
                                                    styles.incomeMeta,
                                                    { fontSize: scaleFont(typography.fontSize.sm) },
                                                ]}
                                                numberOfLines={2}
                                            >
                                                {[formatDate(income.date, 'MMM D, YYYY'), income.note]
                                                    .filter(Boolean)
                                                    .join(' • ')}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={styles.incomeTrailing}>
                                        <Text
                                            style={[
                                                styles.amountText,
                                                { fontSize: scaleFont(typography.fontSize.base) },
                                            ]}
                                        >
                                            {formatCurrency(income.amount, income.currency, locale)}
                                        </Text>
                                        <TouchableOpacity
                                            activeOpacity={0.84}
                                            style={styles.deleteButton}
                                            onPress={() => onDeleteIncome(income.id, income.title)}
                                        >
                                            <Icon name="trash-outline" size={16} color={colors.error} />
                                        </TouchableOpacity>
                                    </View>
                                </TouchableOpacity>
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
    content: {
        paddingBottom: spacing['5xl'],
    },
    headerBlock: {
        marginBottom: spacing.lg,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.base,
    },
    menuButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: withAlpha(colors.surfaceElevated, 0.72),
        borderWidth: 1,
        borderColor: colors.border,
    },
    headerCopy: {
        flex: 1,
        gap: 4,
    },
    headerTitle: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.bold,
    },
    headerSubtitle: {
        color: colors.textMuted,
        lineHeight: 22,
    },
    addButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: withAlpha(colors.success, 0.18),
        borderWidth: 1,
        borderColor: withAlpha(colors.success, 0.4),
    },
    totalCard: {
        borderRadius: borderRadius.xl,
        borderWidth: 1,
        borderColor: withAlpha(colors.success, 0.25),
        backgroundColor: withAlpha(colors.surfaceElevated, 0.8),
        marginBottom: spacing.lg,
        overflow: 'hidden',
    },
    totalGlow: {
        position: 'absolute',
        top: -60,
        right: -30,
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: withAlpha(colors.success, 0.14),
    },
    totalLabel: {
        color: colors.textMuted,
        fontWeight: typography.fontWeight.semibold,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: spacing.xs,
    },
    totalValue: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.bold,
        marginBottom: spacing.xs,
    },
    totalMeta: {
        color: colors.success,
        fontWeight: typography.fontWeight.medium,
    },
    emptyBlock: {
        paddingVertical: spacing['3xl'],
        gap: spacing.base,
    },
    emptyButton: {
        marginTop: spacing.sm,
    },
    cardsList: {
        gap: spacing.sm,
    },
    cardSpacing: {
        marginBottom: spacing.sm,
    },
    incomeCard: {
        borderRadius: borderRadius.xl,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: withAlpha(colors.surfaceElevated, 0.72),
        padding: spacing.base,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.base,
    },
    incomeLeading: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.base,
    },
    iconWrap: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: withAlpha(colors.success, 0.16),
        borderWidth: 1,
        borderColor: withAlpha(colors.success, 0.3),
    },
    incomeCopy: {
        flex: 1,
        gap: 4,
    },
    incomeTitle: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.semibold,
    },
    incomeMeta: {
        color: colors.textMuted,
        lineHeight: 20,
    },
    incomeTrailing: {
        alignItems: 'flex-end',
        gap: spacing.sm,
    },
    amountText: {
        color: colors.success,
        fontWeight: typography.fontWeight.bold,
    },
    deleteButton: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: withAlpha(colors.error, 0.1),
    },
});
