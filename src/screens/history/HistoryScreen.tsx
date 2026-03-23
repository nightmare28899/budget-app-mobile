import React, { useCallback, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    RefreshControl,
    SectionList,
    Modal,
    Pressable,
    FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { ActivityScreenProps } from '../../navigation/types';
import { useAuthStore } from '../../store/authStore';
import { formatCurrency, formatTime } from '../../utils/format';
import {
    getPaymentMethodOption,
    PAYMENT_METHOD_FALLBACK_ICON,
} from '../../utils/paymentMethod';
import { withAlpha } from '../../utils/subscriptions';
import {
    spacing,
    typography,
    borderRadius,
    useResponsive,
    useTheme,
    useThemedStyles,
} from '../../theme';
import { CategoryIcon } from '../../components/CategoryIcon';
import { EmptyState } from '../../components/ui/EmptyState';
import { AnimatedScreen } from '../../components/ui/AnimatedScreen';
import { HistorySkeleton } from '../../components/ui/Skeleton';
import { useI18n } from '../../hooks/useI18n';
import { useAppAlert } from '../../components/alerts/AlertProvider';
import { HistoryRecord, useHistory } from '../../hooks/useHistory';
import { HomeBackground } from '../../components/ui/HomeBackground';
import { getMainTabListBottomPadding } from '../../navigation/mainTabLayout';

const HEX_COLOR_PATTERN = /^#(?:[0-9A-F]{3}){1,2}$/i;

function resolveAccentColor(value: string | null | undefined, fallback: string): string {
    if (!value) {
        return fallback;
    }

    const trimmed = value.trim();
    return HEX_COLOR_PATTERN.test(trimmed) ? trimmed : fallback;
}

export function HistoryScreen({
    route,
    navigation,
}: ActivityScreenProps<'HistoryHome'>) {
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);
    const user = useAuthStore((s) => s.user);
    const insets = useSafeAreaInsets();
    const {
        horizontalPadding,
        contentMaxWidth,
        isSmallPhone,
        scaleFont,
        scaleSize,
    } = useResponsive();
    const { t } = useI18n();
    const { alert } = useAppAlert();
    const [showFilters, setShowFilters] = useState(false);
    const [showFilterPicker, setShowFilterPicker] = useState(false);
    const listBottomPadding = getMainTabListBottomPadding({
        insetsBottom: insets.bottom,
        isSmallPhone,
        scaleSize,
    });

    const onSuccessHandled = useCallback(() => {
        alert(t('common.success'), route.params?.successMessage!);
        navigation.setParams({ successMessage: undefined });
    }, [alert, navigation, route.params?.successMessage, t]);

    const {
        selectedCategoryId,
        setSelectedCategoryId,
        categoryOptions,
        sections,
        isLoading,
        isRefetching,
        refetch,
        summaryText,
        showSkeleton,
    } = useHistory({
        successMessage: route.params?.successMessage,
        onSuccessHandled,
        currency: user?.currency,
    });

    const constrainedContentStyle = contentMaxWidth
        ? { maxWidth: contentMaxWidth, alignSelf: 'center' as const, width: '100%' as const }
        : null;
    const selectedFilterOption = selectedCategoryId === 'all'
        ? null
        : categoryOptions.find((item) => item.id === selectedCategoryId) ?? null;
    const filterOptions = [
        { id: 'all', name: t('filters.allCategories'), type: 'all' as const },
        ...categoryOptions,
    ];

    const renderTransaction = useCallback(
        (record: HistoryRecord) => {
            const isExpense = record.kind === 'expense';
            const title = isExpense ? record.expense.title : record.subscription.name;
            const sourceDate = isExpense
                ? record.expense.date
                : (record.subscription.chargeDate || record.subscription.nextPaymentDate);
            const typeLabel = isExpense
                ? (record.expense.isSubscription
                    ? t('history.subscriptionBadge')
                    : t('history.manualExpense'))
                : t('history.autoSubscription');
            const typeIcon = isExpense
                ? (record.expense.isSubscription ? 'repeat-outline' : 'create-outline')
                : 'repeat-outline';
            const rawAmount = isExpense
                ? Number(record.expense.cost) || 0
                : Number(record.subscription.cost) || 0;
            const signedAmount = -Math.abs(rawAmount);
            const isPositive = signedAmount > 0;
            const amountText = `${isPositive ? '+' : '-'}${formatCurrency(
                Math.abs(signedAmount),
                user?.currency,
            )}`;
            const accentColor = isExpense
                ? resolveAccentColor(record.expense.category?.color, colors.primary)
                : resolveAccentColor(record.subscription.color, colors.accent);
            const paymentMethod = isExpense
                ? record.expense.paymentMethod
                : record.subscription.paymentMethod;
            const paymentMethodOption = getPaymentMethodOption(paymentMethod);
            const paymentMethodIcon = paymentMethodOption?.icon ?? PAYMENT_METHOD_FALLBACK_ICON;

            return (
                <TouchableOpacity
                    key={record.id}
                    style={[styles.transactionCard, { borderColor: withAlpha(accentColor, 0.34) }]}
                    activeOpacity={0.84}
                    onPress={() => {
                        if (isExpense) {
                            navigation.navigate('EditExpense', { id: record.expense.id });
                            return;
                        }

                        navigation.navigate('AddSubscription', {
                            subscription: record.subscription,
                        });
                    }}
                >
                    <View
                        style={[
                            styles.transactionIconWrap,
                            {
                                backgroundColor: withAlpha(accentColor, 0.2),
                                borderColor: withAlpha(accentColor, 0.5),
                                width: isSmallPhone ? scaleSize(34, 0.56) : scaleSize(38, 0.56),
                                height: isSmallPhone ? scaleSize(34, 0.56) : scaleSize(38, 0.56),
                                borderRadius: isSmallPhone ? scaleSize(17, 0.56) : scaleSize(19, 0.56),
                            },
                        ]}
                    >
                        {isExpense ? (
                            <CategoryIcon
                                icon={record.expense.category?.icon}
                                categoryName={record.expense.category?.name}
                                size={17}
                                color={colors.textSecondary}
                            />
                        ) : (
                            <Icon
                                name={record.subscription.icon || 'card-outline'}
                                size={17}
                                color={colors.textSecondary}
                            />
                        )}
                    </View>

                    <View style={styles.transactionMain}>
                        <Text
                            style={[styles.transactionTitle, { fontSize: scaleFont(typography.fontSize.base) }]}
                            numberOfLines={1}
                        >
                            {title}
                        </Text>
                        <View style={styles.transactionMetaRow}>
                            <Icon name={typeIcon} size={12} color={colors.textMuted} />
                            <Text
                                style={[
                                    styles.transactionMeta,
                                    { fontSize: scaleFont(typography.fontSize.xs) },
                                ]}
                                numberOfLines={1}
                            >
                                {formatTime(sourceDate)} • {typeLabel}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.transactionEnd}>
                        <View
                            style={[
                                styles.paymentMethodChip,
                                {
                                    backgroundColor: paymentMethodOption
                                        ? withAlpha(colors.primaryLight, 0.18)
                                        : colors.surfaceElevated,
                                    borderColor: paymentMethodOption
                                        ? withAlpha(colors.primaryLight, 0.45)
                                        : colors.border,
                                },
                            ]}
                        >
                            <Icon
                                name={paymentMethodIcon}
                                size={14}
                                color={paymentMethodOption ? colors.primaryLight : colors.textMuted}
                            />
                        </View>
                        <Text
                            style={[
                                styles.transactionAmount,
                                { color: isPositive ? colors.success : colors.error },
                                { fontSize: scaleFont(typography.fontSize.base) },
                            ]}
                        >
                            {amountText}
                        </Text>
                    </View>
                </TouchableOpacity>
            );
        },
        [
            colors.accent,
            colors.border,
            colors.error,
            colors.primary,
            colors.primaryLight,
            colors.success,
            colors.surfaceElevated,
            colors.textMuted,
            colors.textSecondary,
            isSmallPhone,
            navigation,
            styles.paymentMethodChip,
            scaleFont,
            scaleSize,
            styles.transactionAmount,
            styles.transactionCard,
            styles.transactionEnd,
            styles.transactionIconWrap,
            styles.transactionMain,
            styles.transactionMeta,
            styles.transactionMetaRow,
            styles.transactionTitle,
            t,
            user?.currency,
        ],
    );

    return (
        <View style={styles.container}>
            <HomeBackground />
            <AnimatedScreen style={styles.flex1} delay={8} duration={200} travelY={6}>
                <View
                    style={[
                        styles.compactHeader,
                        {
                            paddingTop: insets.top + spacing.base,
                            paddingHorizontal: horizontalPadding,
                        },
                        constrainedContentStyle,
                    ]}
                >
                    <View style={styles.headerRow}>
                        <View style={styles.headerTextWrap}>
                            <Text
                                style={[styles.headerTitle, { fontSize: scaleFont(typography.fontSize.xl) }]}
                            >
                                {t('history.title')}
                            </Text>
                            <Text
                                style={[styles.headerSubtitle, { fontSize: scaleFont(typography.fontSize.sm) }]}
                            >
                                {summaryText}
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={[
                                styles.headerIconButton,
                                showFilters ? styles.headerIconButtonActive : null,
                            ]}
                            onPress={() => setShowFilters((prev) => !prev)}
                            activeOpacity={0.82}
                            accessibilityLabel={t('history.filterAction')}
                        >
                            <Icon name="funnel-outline" size={18} color={colors.textPrimary} />
                        </TouchableOpacity>
                    </View>
                </View>

                {showFilters ? (
                    <View
                        style={[
                            styles.filtersCard,
                            {
                                padding: isSmallPhone
                                    ? scaleSize(spacing.base, 0.45)
                                    : scaleSize(spacing.md, 0.45),
                            },
                            { marginHorizontal: horizontalPadding },
                            constrainedContentStyle,
                        ]}
                    >
                        <Text style={[styles.filterLabel, { fontSize: scaleFont(typography.fontSize.sm) }]}>
                            {t('filters.category')}
                        </Text>
                        <TouchableOpacity
                            style={styles.filterSelector}
                            onPress={() => setShowFilterPicker(true)}
                            activeOpacity={0.84}
                        >
                            <View style={styles.filterSelectorLeft}>
                                <Icon
                                    name={
                                        !selectedFilterOption
                                            ? 'funnel-outline'
                                            : selectedFilterOption.type === 'subscription'
                                                ? 'repeat-outline'
                                                : 'pricetag-outline'
                                    }
                                    size={14}
                                    color={colors.textMuted}
                                />
                                <Text
                                    style={[
                                        styles.filterSelectorText,
                                        { fontSize: scaleFont(typography.fontSize.sm) },
                                    ]}
                                    numberOfLines={1}
                                >
                                    {selectedFilterOption?.name ?? t('filters.allCategories')}
                                </Text>
                            </View>
                            <Icon name="chevron-down" size={18} color={colors.textMuted} />
                        </TouchableOpacity>
                    </View>
                ) : null}

                {showSkeleton ? (
                    <View
                        style={[
                            styles.listContent,
                            { paddingBottom: listBottomPadding },
                            constrainedContentStyle,
                        ]}
                    >
                        <HistorySkeleton horizontalPadding={horizontalPadding} />
                    </View>
                ) : (
                    <SectionList
                        sections={sections}
                        keyExtractor={(item) => item.id}
                        stickySectionHeadersEnabled
                        refreshControl={
                            <RefreshControl
                                refreshing={isLoading || isRefetching}
                                onRefresh={refetch}
                                tintColor={colors.primary}
                            />
                        }
                        renderSectionHeader={({ section }) => (
                            <View
                                style={[
                                    styles.sectionHeader,
                                    { marginHorizontal: horizontalPadding },
                                    constrainedContentStyle,
                                ]}
                            >
                                <Text
                                    style={[styles.sectionDate, { fontSize: scaleFont(typography.fontSize.sm) }]}
                                >
                                    {section.title}
                                </Text>
                                <Text
                                    style={[styles.sectionTotal, { fontSize: scaleFont(typography.fontSize.sm) }]}
                                >
                                    {formatCurrency(section.total, user?.currency)}
                                </Text>
                            </View>
                        )}
                        renderItem={({ item }) => (
                            <View
                                style={[
                                    { marginHorizontal: horizontalPadding },
                                    constrainedContentStyle,
                                ]}
                            >
                                {renderTransaction(item)}
                            </View>
                        )}
                        ListEmptyComponent={
                            <EmptyState
                                icon="document-text-outline"
                                title={t('history.noRecordsTitle')}
                                description={t('history.noRecordsDesc')}
                            />
                        }
                        contentContainerStyle={[
                            styles.listContent,
                            { paddingBottom: listBottomPadding },
                        ]}
                    />
                )}
            </AnimatedScreen>

            <Modal
                transparent
                animationType="fade"
                visible={showFilterPicker}
                onRequestClose={() => setShowFilterPicker(false)}
                statusBarTranslucent
            >
                <View style={styles.filterModalOverlay}>
                    <Pressable
                        style={styles.filterModalBackdrop}
                        onPress={() => setShowFilterPicker(false)}
                    />
                    <View style={styles.filterModalCard}>
                        <Text
                            style={[styles.filterModalTitle, { fontSize: scaleFont(typography.fontSize.base) }]}
                        >
                            {t('history.filterAction')}
                        </Text>
                        <FlatList
                            data={filterOptions}
                            keyExtractor={(item) => item.id}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.filterModalList}
                            renderItem={({ item }) => {
                                const isActive = selectedCategoryId === item.id;
                                const iconName = item.type === 'subscription'
                                    ? 'repeat-outline'
                                    : item.type === 'category'
                                        ? 'pricetag-outline'
                                        : 'apps-outline';

                                return (
                                    <TouchableOpacity
                                        style={[
                                            styles.filterOptionRow,
                                            isActive ? styles.filterOptionRowActive : null,
                                        ]}
                                        activeOpacity={0.86}
                                        onPress={() => {
                                            setSelectedCategoryId(item.id);
                                            setShowFilterPicker(false);
                                        }}
                                    >
                                        <View style={styles.filterOptionLeft}>
                                            <Icon
                                                name={iconName}
                                                size={14}
                                                color={isActive ? colors.textPrimary : colors.textMuted}
                                            />
                                            <Text
                                                style={[
                                                    styles.filterOptionText,
                                                    isActive ? styles.filterOptionTextActive : null,
                                                    { fontSize: scaleFont(typography.fontSize.sm) },
                                                ]}
                                                numberOfLines={1}
                                            >
                                                {item.name}
                                            </Text>
                                        </View>
                                        {isActive ? (
                                            <Icon name="checkmark" size={16} color={colors.primary} />
                                        ) : null}
                                    </TouchableOpacity>
                                );
                            }}
                        />
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#050F22',
    },
    flex1: {
        flex: 1,
    },
    compactHeader: {
        marginBottom: spacing.base,
        paddingBottom: spacing.base,
        backgroundColor: 'transparent',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerTextWrap: {
        flex: 1,
        marginHorizontal: spacing.sm,
    },
    headerTitle: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.bold,
    },
    headerSubtitle: {
        color: colors.textMuted,
        marginTop: 1,
    },
    headerIconButton: {
        width: 38,
        height: 38,
        borderRadius: 19,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surfaceCard,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerIconButtonActive: {
        backgroundColor: withAlpha(colors.primary, 0.24),
        borderColor: withAlpha(colors.primary, 0.58),
    },
    filtersCard: {
        borderRadius: borderRadius.xl,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surfaceCard,
        marginBottom: spacing.sm,
    },
    filterLabel: {
        color: colors.textSecondary,
        fontWeight: typography.fontWeight.semibold,
    },
    filterSelector: {
        marginTop: spacing.sm,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surfaceElevated,
        paddingHorizontal: spacing.base,
        paddingVertical: spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.sm,
    },
    filterSelectorLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        flex: 1,
    },
    filterSelectorText: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.medium,
    },
    listContent: {
        paddingBottom: spacing['5xl'],
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'transparent',
        paddingVertical: spacing.xs,
        marginBottom: spacing.xs,
    },
    sectionDate: {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.semibold,
        color: colors.textSecondary,
    },
    sectionTotal: {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.semibold,
        color: colors.textMuted,
    },
    transactionCard: {
        borderWidth: 1,
        borderRadius: borderRadius.lg,
        backgroundColor: colors.surfaceCard,
        paddingHorizontal: spacing.sm + 2,
        paddingVertical: spacing.sm - 1,
        marginBottom: spacing.xs,
        flexDirection: 'row',
        alignItems: 'center',
    },
    transactionIconWrap: {
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    transactionMain: {
        flex: 1,
        marginHorizontal: spacing.sm,
    },
    transactionTitle: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.bold,
    },
    transactionMetaRow: {
        marginTop: 2,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    transactionMeta: {
        color: colors.textMuted,
    },
    transactionAmount: {
        fontWeight: typography.fontWeight.bold,
    },
    transactionEnd: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: spacing.sm,
    },
    paymentMethodChip: {
        width: 28,
        height: 28,
        borderRadius: borderRadius.full,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.sm,
    },
    filterModalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
    },
    filterModalBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: colors.overlay,
    },
    filterModalCard: {
        width: '100%',
        maxWidth: 420,
        maxHeight: '70%',
        backgroundColor: colors.surfaceCard,
        borderRadius: borderRadius.xl,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.base,
    },
    filterModalTitle: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.semibold,
        marginBottom: spacing.sm,
    },
    filterModalList: {
        paddingBottom: spacing.xs,
    },
    filterOptionRow: {
        minHeight: 42,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.xs,
    },
    filterOptionRowActive: {
        backgroundColor: withAlpha(colors.primary, 0.2),
        borderWidth: 1,
        borderColor: withAlpha(colors.primary, 0.45),
    },
    filterOptionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        flex: 1,
    },
    filterOptionText: {
        color: colors.textSecondary,
        fontWeight: typography.fontWeight.medium,
    },
    filterOptionTextActive: {
        color: colors.textPrimary,
    },
});
