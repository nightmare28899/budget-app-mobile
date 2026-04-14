import React, { useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    TextInput,
    TouchableOpacity,
} from 'react-native';
import DateTimePicker, {
    DateTimePickerAndroid,
    DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';
import { RootScreenProps } from '../../navigation/types';
import { useExpenseForm } from '../../hooks/useExpenseForm';
import { CategorySelector } from '../../components/ui/domain/CategorySelector';
import { CurrencySelector } from '../../components/ui/domain/CurrencySelector';
import { CreditCardSelector } from '../../components/ui/domain/CreditCardSelector';
import { PaymentMethodSelector } from '../../components/ui/domain/PaymentMethodSelector';
import { Input } from '../../components/ui/primitives/Input';
import { Button } from '../../components/ui/primitives/Button';
import { AnimatedScreen } from '../../components/ui/primitives/AnimatedScreen';
import { Skeleton } from '../../components/ui/primitives/Skeleton';
import {
    borderRadius,
    spacing,
    typography,
    useResponsive,
    useTheme,
    useThemedStyles,
    SemanticColors,
} from '../../theme/index';
import { useI18n } from '../../hooks/useI18n';
import { getCurrencyLocale, getCurrencySymbol } from '../../utils/domain/currency';
import { sanitizeMoneyInput } from '../../utils/platform/moneyInput';
import { useScrollToFocusedInput } from '../../hooks/useScrollToFocusedInput';
import { isCreditCardPaymentMethod } from '../../utils/domain/paymentMethod';
import { formatCurrency, formatDate } from '../../utils/core/format';
import { useAppAccess } from '../../hooks/useAppAccess';
import { usePremiumAccess } from '../../hooks/usePremiumAccess';

type DateField = 'purchase' | 'firstPayment';

function parseDateOrToday(value: string): Date {
    const parsed = new Date(`${value}T12:00:00`);
    if (Number.isNaN(parsed.getTime())) {
        return new Date();
    }

    return parsed;
}

export function EditExpenseScreen({
    route,
    navigation,
}: RootScreenProps<'EditExpense'>) {
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);
    const { id } = route.params;
    const insets = useSafeAreaInsets();
    const headerHeight = useHeaderHeight();
    const {
        horizontalPadding,
        contentMaxWidth,
        isSmallPhone,
        scaleFont,
    } = useResponsive();
    const { t, language } = useI18n();
    const { hasPremium } = useAppAccess();
    const { requirePremiumAccess } = usePremiumAccess();
    const locale = getCurrencyLocale(language);
    const [activeDateField, setActiveDateField] = useState<DateField>('purchase');
    const { scrollRef, createScrollOnFocusHandler } = useScrollToFocusedInput(120);

    const {
        title, setTitle,
        cost, setCost,
        currency, setCurrency,
        isInstallment, setIsInstallment,
        installmentCount, setInstallmentCount,
        firstPaymentDate, setFirstPaymentDate,
        installmentBreakdown,
        note, setNote,
        paymentMethod, setPaymentMethod,
        selectedCreditCardId, setSelectedCreditCardId,
        selectedCategory, setSelectedCategory,
        date, setDate,
        categories, categoriesLoading,
        creditCards, creditCardsLoading,
        hasLoaded, setHasLoaded,
        expense, expenseLoading,
        saveExpense,
        isPending: isUpdatingExpense,
    } = useExpenseForm(id);
    const currencySymbol = getCurrencySymbol(currency, locale);
    const parsedInstallmentCount = Number.parseInt(installmentCount, 10);
    const dateLabel = useMemo(
        () =>
            parseDateOrToday(date).toLocaleDateString(locale, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            }),
        [date, locale],
    );
    const firstPaymentDateLabel = useMemo(
        () =>
            parseDateOrToday(firstPaymentDate).toLocaleDateString(locale, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            }),
        [firstPaymentDate, locale],
    );
    const installmentPreviewLabel = useMemo(() => {
        if (!isInstallment || installmentBreakdown.amounts.length === 0) {
            return null;
        }

        const installmentAmountLabel = formatCurrency(
            installmentBreakdown.installmentAmount,
            currency,
            locale,
        );
        const finalAmountLabel = formatCurrency(
            installmentBreakdown.finalInstallmentAmount,
            currency,
            locale,
        );

        if (installmentBreakdown.hasAdjustedFinal) {
            return t('expense.installmentPreviewAdjusted', {
                count: installmentBreakdown.amounts.length,
                amount: installmentAmountLabel,
                finalAmount: finalAmountLabel,
            });
        }

        return t('expense.installmentPreviewEqual', {
            count: installmentBreakdown.amounts.length,
            amount: installmentAmountLabel,
        });
    }, [currency, installmentBreakdown, isInstallment, locale, t]);
    const handleInstallmentMode = (nextValue: boolean) => {
        if (nextValue && !hasPremium && !requirePremiumAccess('installments')) {
            return;
        }

        setIsInstallment(nextValue);
    };
    const handlePaymentMethodChange = (nextValue: string | undefined) => {
        if (
            nextValue
            && isCreditCardPaymentMethod(nextValue)
            && !hasPremium
            && !requirePremiumAccess('credit_cards')
        ) {
            return;
        }

        setPaymentMethod(nextValue);
    };
    const handleAddCreditCard = () => {
        if (!hasPremium && !requirePremiumAccess('credit_cards')) {
            return;
        }

        navigation.navigate('CreditCardForm');
    };

    // Pre-fill form with existing expense data
    useEffect(() => {
        if (expense && !hasLoaded && categories.length > 0) {
            setTitle(expense.title);
            setNote(expense.note ?? '');
            setPaymentMethod(expense.paymentMethod || undefined);
            setSelectedCategory(expense.categoryId ?? expense.category?.id);
            setHasLoaded(true);
        }
    }, [expense, hasLoaded, categories, setTitle, setNote, setPaymentMethod, setSelectedCategory, setHasLoaded]);

    const applyDateValue = (field: DateField, value?: Date) => {
        if (!value) {
            return;
        }

        const nextDate = formatDate(value, 'YYYY-MM-DD');
        if (field === 'firstPayment') {
            setFirstPaymentDate(nextDate);
        } else {
            setDate(nextDate);
        }

        if (Platform.OS === 'ios') {
            setActiveDateField('purchase');
        }
    };

    const createDateChangeHandler = (field: DateField) => (
        _event: DateTimePickerEvent,
        value?: Date,
    ) => {
        applyDateValue(field, value);
    };

    const openDatePicker = (field: DateField) => {
        setActiveDateField(field);
        const current = parseDateOrToday(field === 'firstPayment' ? firstPaymentDate : date);
        if (Platform.OS === 'android') {
            DateTimePickerAndroid.open({
                mode: 'date',
                value: current,
                onChange: createDateChangeHandler(field),
            });
            return;
        }

        setActiveDateField(field);
    };

    const onSave = async () => {
        await saveExpense(() => {
            navigation.navigate('Main', {
                screen: 'Tabs',
                params: {
                    screen: 'History',
                    params: {
                        screen: 'HistoryHome',
                        params: { successMessage: t('editExpense.updatedSuccess') },
                    },
                },
            });
        });
    };

    if (expenseLoading || !hasLoaded) {
        return (
            <View style={styles.loadingContainer}>
                <View
                    style={[
                        styles.loadingSkeleton,
                        contentMaxWidth ? { maxWidth: contentMaxWidth, width: '100%' } : null,
                    ]}
                >
                    <Skeleton width="40%" height={18} />
                    <Skeleton width="100%" height={58} style={{ marginTop: spacing.base }} />
                    <Skeleton width="100%" height={54} style={{ marginTop: spacing.base }} />
                    <Skeleton width="100%" height={44} style={{ marginTop: spacing.base }} />
                </View>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
        >
            <AnimatedScreen style={styles.flex1} delay={65}>
                <ScrollView
                    ref={scrollRef}
                    contentContainerStyle={[
                        styles.scrollContent,
                        {
                            paddingTop: spacing.base,
                            paddingBottom: insets.bottom + spacing['4xl'],
                            paddingHorizontal: horizontalPadding,
                        },
                        contentMaxWidth
                            ? { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }
                            : null,
                    ]}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
                >
                    {/* Amount Input */}
                    <View style={styles.amountBlock}>
                        <View style={styles.amountContainer}>
                            <Text style={[styles.currencySign, { fontSize: scaleFont(typography.fontSize['3xl']) }]}>
                                {currencySymbol}
                            </Text>
                            <TextInput
                                style={[
                                    styles.amountInput,
                                    {
                                        fontSize: scaleFont(typography.fontSize['5xl']),
                                        lineHeight: scaleFont(typography.fontSize['5xl']),
                                        minWidth: isSmallPhone ? 100 : 120,
                                    },
                                ]}
                                placeholder={t('common.amountPlaceholder')}
                                placeholderTextColor={colors.textMuted}
                                keyboardType="decimal-pad"
                                value={cost}
                                onChangeText={(value) => setCost(sanitizeMoneyInput(value))}
                                onFocus={createScrollOnFocusHandler(64)}
                            />
                            <View style={styles.amountCurrencyBadge}>
                                <Text
                                    style={[
                                        styles.amountCurrencyText,
                                        { fontSize: scaleFont(typography.fontSize.sm) },
                                    ]}
                                >
                                    {currency}
                                </Text>
                            </View>
                        </View>

                        <CurrencySelector
                            label={t('common.currency')}
                            value={currency}
                            onChange={setCurrency}
                        />
                    </View>

                    {/* Title */}
                    <Input
                        label={t('addExpense.titleLabel')}
                        placeholder={t('addExpense.titlePlaceholder')}
                        value={title}
                        onChangeText={setTitle}
                        onFocus={createScrollOnFocusHandler()}
                        containerStyle={styles.fieldContainer}
                    />

                    <View style={styles.fieldContainer}>
                        <Text style={[styles.label, { fontSize: scaleFont(typography.fontSize.sm) }]}>
                            {t('expense.paymentTimingLabel')}
                        </Text>
                        <View style={styles.planModeRow}>
                            <TouchableOpacity
                                activeOpacity={0.84}
                                style={[
                                    styles.planModeButton,
                                    !isInstallment && styles.planModeButtonActive,
                                ]}
                                onPress={() => handleInstallmentMode(false)}
                            >
                                <Text
                                    style={[
                                        styles.planModeButtonText,
                                        !isInstallment && styles.planModeButtonTextActive,
                                        { fontSize: scaleFont(typography.fontSize.sm) },
                                    ]}
                                >
                                    {t('expense.singlePayment')}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                activeOpacity={0.84}
                                style={[
                                    styles.planModeButton,
                                    isInstallment && styles.planModeButtonActive,
                                ]}
                                onPress={() => handleInstallmentMode(true)}
                            >
                                <Text
                                    style={[
                                        styles.planModeButtonText,
                                        isInstallment && styles.planModeButtonTextActive,
                                        { fontSize: scaleFont(typography.fontSize.sm) },
                                    ]}
                                >
                                    {t('expense.installmentPayment')}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.fieldContainer}>
                        <Text style={[styles.label, { fontSize: scaleFont(typography.fontSize.sm) }]}>
                            {isInstallment
                                ? t('expense.purchaseDateLabel')
                                : t('addExpense.dateLabel')}
                        </Text>
                        <TouchableOpacity
                            activeOpacity={0.84}
                            style={styles.dateButton}
                            onPress={() => openDatePicker('purchase')}
                        >
                            <View style={styles.dateButtonContent}>
                                <Text
                                    style={[
                                        styles.dateButtonText,
                                        { fontSize: scaleFont(typography.fontSize.base) },
                                    ]}
                                >
                                    {dateLabel}
                                </Text>
                            </View>
                        </TouchableOpacity>
                        {Platform.OS === 'ios' && activeDateField === 'purchase' ? (
                            <View style={styles.iosDatePickerCard}>
                                <DateTimePicker
                                    mode="date"
                                    display="spinner"
                                    value={parseDateOrToday(date)}
                                    onChange={createDateChangeHandler('purchase')}
                                />
                            </View>
                        ) : null}
                    </View>

                    {isInstallment ? (
                        <View style={styles.installmentCard}>
                            <Input
                                label={t('expense.installmentCountLabel')}
                                placeholder={t('expense.installmentCountPlaceholder')}
                                value={installmentCount}
                                onChangeText={(value) =>
                                    setInstallmentCount(value.replace(/[^0-9]/g, ''))
                                }
                                keyboardType="number-pad"
                                onFocus={createScrollOnFocusHandler(128)}
                                containerStyle={styles.fieldContainer}
                            />

                            <View style={styles.fieldContainer}>
                                <Text style={[styles.label, { fontSize: scaleFont(typography.fontSize.sm) }]}>
                                    {t('expense.firstPaymentDateLabel')}
                                </Text>
                                <TouchableOpacity
                                    activeOpacity={0.84}
                                    style={styles.dateButton}
                                    onPress={() => openDatePicker('firstPayment')}
                                >
                                    <View style={styles.dateButtonContent}>
                                        <Text
                                            style={[
                                                styles.dateButtonText,
                                                { fontSize: scaleFont(typography.fontSize.base) },
                                            ]}
                                        >
                                            {firstPaymentDateLabel}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                                {Platform.OS === 'ios' && activeDateField === 'firstPayment' ? (
                                    <View style={styles.iosDatePickerCard}>
                                        <DateTimePicker
                                            mode="date"
                                            display="spinner"
                                            value={parseDateOrToday(firstPaymentDate)}
                                            onChange={createDateChangeHandler('firstPayment')}
                                        />
                                    </View>
                                ) : null}
                            </View>

                            <View style={styles.installmentPreviewCard}>
                                <Text
                                    style={[
                                        styles.installmentPreviewTitle,
                                        { fontSize: scaleFont(typography.fontSize.sm) },
                                    ]}
                                >
                                    {t('expense.installmentPreviewTitle')}
                                </Text>
                                <Text
                                    style={[
                                        styles.installmentPreviewValue,
                                        { fontSize: scaleFont(typography.fontSize.base) },
                                    ]}
                                >
                                    {installmentPreviewLabel ?? t('expense.installmentPreviewHint')}
                                </Text>
                                {Number.isFinite(parsedInstallmentCount) && parsedInstallmentCount > 1 ? (
                                    <Text
                                        style={[
                                            styles.installmentPreviewMeta,
                                            { fontSize: scaleFont(typography.fontSize.sm) },
                                        ]}
                                    >
                                        {t('expense.installmentFrequencyMonthly', {
                                            total: formatCurrency(
                                                Number.parseFloat(cost || '0') || 0,
                                                currency,
                                                locale,
                                            ),
                                        })}
                                    </Text>
                                ) : null}
                            </View>
                        </View>
                    ) : null}

                    {/* Category */}
                    <View style={[styles.fieldContainer, styles.categorySection]}>
                        <Text style={[styles.label, { fontSize: scaleFont(typography.fontSize.sm) }]}>
                            {t('editExpense.category')}
                        </Text>

                        <CategorySelector
                            categories={categories}
                            isLoading={categoriesLoading}
                            selectedCategory={selectedCategory}
                            onSelectCategory={setSelectedCategory}
                        />
                    </View>

                    <PaymentMethodSelector
                        value={paymentMethod}
                        onChange={handlePaymentMethodChange}
                    />

                    {isCreditCardPaymentMethod(paymentMethod) ? (
                        <CreditCardSelector
                            value={selectedCreditCardId}
                            cards={creditCards}
                            isLoading={creditCardsLoading}
                            onChange={setSelectedCreditCardId}
                            onAddCard={handleAddCreditCard}
                        />
                    ) : null}

                    {/* Note */}
                    <Input
                        label={t('addExpense.noteOptional')}
                        placeholder={t('addExpense.notePlaceholder')}
                        multiline
                        value={note}
                        onChangeText={setNote}
                        onFocus={createScrollOnFocusHandler(184)}
                        inputStyle={styles.noteInput}
                        containerStyle={styles.fieldContainer}
                    />

                    {/* Save button */}
                    <Button
                        title={t('editExpense.updateExpense')}
                        onPress={onSave}
                        loading={isUpdatingExpense}
                        containerStyle={styles.saveButton}
                    />
                </ScrollView>
            </AnimatedScreen>
        </KeyboardAvoidingView>
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
    scrollContent: {
        flexGrow: 1,
        paddingBottom: spacing['4xl'],
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
    },
    loadingSkeleton: {
        paddingHorizontal: spacing.xl,
        width: '100%',
    },
    // Amount
    amountBlock: {
        marginBottom: spacing['2xl'],
        gap: spacing.base,
    },
    amountContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xl,
    },
    currencySign: {
        fontSize: typography.fontSize['3xl'],
        fontWeight: typography.fontWeight.bold,
        color: colors.textMuted,
        marginRight: spacing.sm,
    },
    amountInput: {
        fontSize: typography.fontSize['5xl'],
        fontWeight: typography.fontWeight.extrabold,
        color: colors.textPrimary,
        minWidth: 120,
        textAlign: 'center',
        textAlignVertical: 'center',
        includeFontPadding: false,
        paddingVertical: 0,
    },
    amountCurrencyBadge: {
        marginLeft: spacing.sm,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.full,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surfaceElevated,
    },
    amountCurrencyText: {
        color: colors.textSecondary,
        fontWeight: typography.fontWeight.semibold,
    },
    // Fields
    fieldContainer: {
        marginBottom: spacing.lg,
    },
    categorySection: {
        marginBottom: spacing.lg,
    },
    label: {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.medium,
        color: colors.textSecondary,
        marginBottom: spacing.sm,
        marginLeft: spacing.xs,
    },
    dateButton: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.lg,
        backgroundColor: colors.surfaceElevated,
        minHeight: 52,
        justifyContent: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
    },
    dateButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    dateButtonText: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.semibold,
    },
    iosDatePickerCard: {
        marginTop: spacing.sm,
        borderRadius: borderRadius.lg,
        backgroundColor: colors.surfaceElevated,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
    },
    planModeRow: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    planModeButton: {
        flex: 1,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.full,
        backgroundColor: colors.surfaceElevated,
        paddingVertical: spacing.sm + 2,
        paddingHorizontal: spacing.md,
        alignItems: 'center',
    },
    planModeButtonActive: {
        borderColor: colors.primaryLight,
        backgroundColor: colors.primary + '15',
    },
    planModeButtonText: {
        color: colors.textSecondary,
        fontWeight: typography.fontWeight.semibold,
    },
    planModeButtonTextActive: {
        color: colors.primaryLight,
    },
    installmentCard: {
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.xl,
        backgroundColor: colors.surfaceCard,
        padding: spacing.lg,
    },
    installmentPreviewCard: {
        marginTop: spacing.sm,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surfaceElevated,
        padding: spacing.md,
        gap: spacing.xs,
    },
    installmentPreviewTitle: {
        color: colors.textSecondary,
        fontWeight: typography.fontWeight.semibold,
    },
    installmentPreviewValue: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.semibold,
    },
    installmentPreviewMeta: {
        color: colors.textMuted,
    },
    noteInput: {
        height: 80,
    },
    // Save button
    saveButton: {
        marginTop: spacing.xl,
    },
});
