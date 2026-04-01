import React, { useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Image,
    TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { RootScreenProps } from '../../navigation/types';
import { formatCurrency, formatDate, formatTime } from '../../utils/format';
import { getCurrencyLocale } from '../../utils/currency';
import {
    spacing,
    typography,
    borderRadius,
    useResponsive,
    useTheme,
    useThemedStyles,
} from '../../theme';
import { CategoryIcon } from '../../components/CategoryIcon';
import { AnimatedScreen } from '../../components/ui/AnimatedScreen';
import { Skeleton } from '../../components/ui/Skeleton';
import { useI18n } from '../../hooks/useI18n';
import { useExpenseDetail } from '../../hooks/useExpenseDetail';
import { formatCreditCardLabel } from '../../utils/creditCards';
import {
    getPaymentMethodOption,
    PAYMENT_METHOD_FALLBACK_ICON,
} from '../../utils/paymentMethod';
import { getInstallmentProgress, isInstallmentExpense } from '../../utils/installments';

export function ExpenseDetailScreen({
    route,
    navigation,
}: RootScreenProps<'ExpenseDetail'>) {
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);
    const { id } = route.params;
    const insets = useSafeAreaInsets();
    const {
        horizontalPadding,
        contentMaxWidth,
        isSmallPhone,
        scaleFont,
    } = useResponsive();
    const { t, language } = useI18n();
    const locale = getCurrencyLocale(language);

    const onDeleted = useCallback(() => {
        navigation.goBack();
    }, [navigation]);

    const { expense, isLoading, onDelete } = useExpenseDetail(id, onDeleted);
    const paymentMethodOption = getPaymentMethodOption(expense?.paymentMethod);
    const paymentMethodLabel = paymentMethodOption
        ? (t(paymentMethodOption.labelKey as any) || paymentMethodOption.fallback)
        : t('paymentMethod.none' as any);
    const creditCardLabel = formatCreditCardLabel(expense?.creditCard);
    const paymentMethodIcon = paymentMethodOption?.icon ?? PAYMENT_METHOD_FALLBACK_ICON;
    const installmentProgress = getInstallmentProgress(expense);
    const isInstallment = isInstallmentExpense(expense);

    if (isLoading || !expense) {
        return (
            <View style={styles.loadingContainer}>
                <View
                    style={[
                        styles.loadingSkeleton,
                        { paddingHorizontal: horizontalPadding },
                        contentMaxWidth ? { maxWidth: contentMaxWidth, width: '100%' } : null,
                    ]}
                >
                    <Skeleton width="100%" height={220} radius={borderRadius.lg} />
                    <Skeleton width="55%" height={20} style={{ marginTop: spacing.xl }} />
                    <Skeleton width="35%" height={34} style={{ marginTop: spacing.md }} />
                    <Skeleton width="100%" height={54} style={{ marginTop: spacing.md }} />
                </View>
            </View>
        );
    }

    return (
        <AnimatedScreen style={styles.container} delay={45}>
            <ScrollView
                style={styles.container}
                contentContainerStyle={[
                    styles.content,
                    {
                        paddingTop: insets.top + spacing.base,
                        paddingBottom: insets.bottom + spacing['4xl'],
                        paddingHorizontal: horizontalPadding,
                    },
                    contentMaxWidth ? { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' } : null,
                ]}
            >
                {/* Receipt image */}
                {expense.imagePresignedUrl && (
                    <View style={[styles.imageContainer, { margin: 0, marginBottom: spacing.xl }]}>
                        <Image
                            source={{ uri: expense.imagePresignedUrl }}
                            style={[
                                styles.receiptImage,
                                { height: isSmallPhone ? 210 : 250 },
                            ]}
                            resizeMode="cover"
                        />
                    </View>
                )}

                {/* Details card */}
                <View style={[styles.detailCard, { marginHorizontal: 0 }]}>
                    <View style={styles.detailRow}>
                        <View style={styles.categoryBadge}>
                            <CategoryIcon
                                icon={expense.category?.icon}
                                categoryName={expense.category?.name}
                                size={16}
                                color={colors.textSecondary}
                            />
                            <Text
                                style={[
                                    styles.categoryName,
                                    { fontSize: scaleFont(typography.fontSize.sm) },
                                ]}
                            >
                                {expense.category?.name ?? t('expenseDetail.uncategorized')}
                            </Text>
                        </View>
                    </View>

                    <Text style={[styles.title, { fontSize: scaleFont(typography.fontSize.xl) }]}>
                        {expense.title}
                    </Text>
                    {isInstallment
                        && installmentProgress.currentInstallment
                        && installmentProgress.installmentCount ? (
                            <Text
                                style={[
                                    styles.installmentBadge,
                                    { fontSize: scaleFont(typography.fontSize.sm) },
                                ]}
                            >
                                {t('expense.installmentPositionLabel', {
                                    current: installmentProgress.currentInstallment,
                                    count: installmentProgress.installmentCount,
                                })}
                            </Text>
                        ) : null}
                    <Text style={[styles.amount, { fontSize: scaleFont(typography.fontSize['3xl']) }]}>
                        {formatCurrency(Number(expense.cost), expense.currency, locale)}
                    </Text>

                    <View style={styles.metaContainer}>
                        <View style={styles.metaRow}>
                            <Icon name="calendar-outline" size={16} color={colors.textMuted} />
                            <Text style={[styles.metaText, { fontSize: scaleFont(typography.fontSize.md) }]}>
                                {formatDate(expense.date, 'dddd, MMMM D, YYYY')}
                            </Text>
                        </View>
                        <View style={styles.metaRow}>
                            <Icon name="time-outline" size={16} color={colors.textMuted} />
                            <Text style={[styles.metaText, { fontSize: scaleFont(typography.fontSize.md) }]}>
                                {formatTime(expense.date)}
                            </Text>
                        </View>
                        {isInstallment && expense.installmentTotalAmount != null ? (
                            <View style={styles.metaRow}>
                                <Icon name="albums-outline" size={16} color={colors.textMuted} />
                                <Text style={[styles.metaText, { fontSize: scaleFont(typography.fontSize.md) }]}>
                                    {t('expense.installmentPlanTotalLabel')}: {' '}
                                    {formatCurrency(expense.installmentTotalAmount, expense.currency, locale)}
                                </Text>
                            </View>
                        ) : null}
                        {isInstallment && expense.installmentPurchaseDate ? (
                            <View style={styles.metaRow}>
                                <Icon name="bag-handle-outline" size={16} color={colors.textMuted} />
                                <Text style={[styles.metaText, { fontSize: scaleFont(typography.fontSize.md) }]}>
                                    {t('expense.purchaseDateLabel')}: {' '}
                                    {formatDate(expense.installmentPurchaseDate, 'dddd, MMMM D, YYYY')}
                                </Text>
                            </View>
                        ) : null}
                        {isInstallment && expense.installmentFirstPaymentDate ? (
                            <View style={styles.metaRow}>
                                <Icon name="repeat-outline" size={16} color={colors.textMuted} />
                                <Text style={[styles.metaText, { fontSize: scaleFont(typography.fontSize.md) }]}>
                                    {t('expense.firstPaymentDateLabel')}: {' '}
                                    {formatDate(expense.installmentFirstPaymentDate, 'dddd, MMMM D, YYYY')}
                                </Text>
                            </View>
                        ) : null}
                        <View style={styles.metaRow}>
                            <Icon name={paymentMethodIcon} size={16} color={colors.textMuted} />
                            <Text style={[styles.metaText, { fontSize: scaleFont(typography.fontSize.md) }]}>
                                {t('paymentMethod.label' as any)}: {paymentMethodLabel}
                            </Text>
                        </View>
                        {creditCardLabel ? (
                            <View style={styles.metaRow}>
                                <Icon name="card-outline" size={16} color={colors.textMuted} />
                                <Text style={[styles.metaText, { fontSize: scaleFont(typography.fontSize.md) }]}>
                                    {t('creditCards.label')}: {creditCardLabel}
                                </Text>
                            </View>
                        ) : null}
                    </View>

                    {expense.note && (
                        <View style={styles.noteContainer}>
                            <Text style={[styles.noteLabel, { fontSize: scaleFont(typography.fontSize.sm) }]}>
                                {t('expenseDetail.note')}
                            </Text>
                            <Text style={[styles.noteText, { fontSize: scaleFont(typography.fontSize.base) }]}>
                                {expense.note}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Action buttons */}
                <TouchableOpacity
                    style={[styles.editButton, { marginHorizontal: 0 }]}
                    onPress={() => navigation.navigate('EditExpense', { id })}
                    activeOpacity={0.7}
                >
                    <Icon name="create-outline" size={20} color={colors.primary} />
                    <Text style={[styles.editText, { fontSize: scaleFont(typography.fontSize.base) }]}>
                        {t('expenseDetail.editExpense')}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.deleteButton, { marginHorizontal: 0 }]}
                    onPress={onDelete}
                    activeOpacity={0.7}
                >
                    <Icon name="trash-outline" size={20} color={colors.error} />
                    <Text style={[styles.deleteText, { fontSize: scaleFont(typography.fontSize.base) }]}>
                        {t('expenseDetail.deleteExpense')}
                    </Text>
                </TouchableOpacity>
            </ScrollView>
        </AnimatedScreen>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        paddingBottom: spacing['4xl'],
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
    },
    loadingSkeleton: {
        width: '100%',
    },
    // Image
    imageContainer: {
        margin: spacing.xl,
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
    },
    receiptImage: {
        width: '100%',
        height: 250,
    },
    // Detail card
    detailCard: {
        marginHorizontal: spacing.xl,
        backgroundColor: colors.surfaceCard,
        borderRadius: borderRadius.xl,
        padding: spacing.xl,
        borderWidth: 1,
        borderColor: colors.border,
    },
    detailRow: {
        marginBottom: spacing.base,
    },
    categoryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: colors.surfaceElevated,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.full,
    },
    categoryName: {
        fontSize: typography.fontSize.sm,
        color: colors.textSecondary,
        fontWeight: typography.fontWeight.medium,
        marginLeft: spacing.xs,
    },
    title: {
        fontSize: typography.fontSize.xl,
        fontWeight: typography.fontWeight.bold,
        color: colors.textPrimary,
        marginBottom: spacing.sm,
    },
    installmentBadge: {
        color: colors.primaryLight,
        fontWeight: typography.fontWeight.semibold,
        marginBottom: spacing.xs,
    },
    amount: {
        fontSize: typography.fontSize['3xl'],
        fontWeight: typography.fontWeight.extrabold,
        color: colors.error,
        marginBottom: spacing.xl,
    },
    metaContainer: {
        gap: spacing.sm,
        marginBottom: spacing.base,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    metaText: {
        fontSize: typography.fontSize.md,
        color: colors.textSecondary,
    },
    noteContainer: {
        marginTop: spacing.base,
        paddingTop: spacing.base,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    noteLabel: {
        fontSize: typography.fontSize.sm,
        color: colors.textMuted,
        fontWeight: typography.fontWeight.medium,
        marginBottom: spacing.xs,
    },
    noteText: {
        fontSize: typography.fontSize.base,
        color: colors.textSecondary,
        lineHeight: 22,
    },
    // Action buttons
    editButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        marginHorizontal: spacing.xl,
        marginTop: spacing.xl,
        padding: spacing.base,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.primary + '40',
        backgroundColor: colors.primary + '10',
    },
    editText: {
        fontSize: typography.fontSize.base,
        fontWeight: typography.fontWeight.semibold,
        color: colors.primary,
    },
    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        marginHorizontal: spacing.xl,
        marginTop: spacing.sm,
        padding: spacing.base,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.error + '40',
        backgroundColor: colors.error + '10',
    },
    deleteText: {
        fontSize: typography.fontSize.base,
        fontWeight: typography.fontWeight.semibold,
        color: colors.error,
    },
});
