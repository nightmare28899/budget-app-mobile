import React, { useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Platform,
    TouchableOpacity,
    TextInput,
} from 'react-native';
import DateTimePicker, {
    DateTimePickerAndroid,
    DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/Ionicons';
import { RootScreenProps } from '../../navigation/types';
import { useExpenseForm } from '../../hooks/useExpenseForm';
import { useCategoryCreator, CATEGORY_ICON_OPTIONS, CATEGORY_COLOR_OPTIONS } from '../../hooks/useCategoryCreator';
import { CategorySelector } from '../../components/ui/domain/CategorySelector';
import { CurrencySelector } from '../../components/ui/domain/CurrencySelector';
import { CreditCardSelector } from '../../components/ui/domain/CreditCardSelector';
import { PaymentMethodSelector } from '../../components/ui/domain/PaymentMethodSelector';
import { Input } from '../../components/ui/primitives/Input';
import { Button } from '../../components/ui/primitives/Button';
import {
    spacing,
    typography,
    borderRadius,
    useResponsive,
    useTheme,
    useThemedStyles,
    SemanticColors,
} from '../../theme/index';
import { EntryScreenScaffold } from '../../components/ui/layout/EntryScreenScaffold';
import { useI18n } from '../../hooks/useI18n';
import { sanitizeMoneyInput } from '../../utils/platform/moneyInput';
import { getCurrencyLocale, getCurrencySymbol } from '../../utils/domain/currency';
import { formatCurrency, formatDate, parseDateOrToday } from '../../utils/core/format';
import { useScrollToFocusedInput } from '../../hooks/useScrollToFocusedInput';
import { isCreditCardPaymentMethod } from '../../utils/domain/paymentMethod';
import { useAppAccess } from '../../hooks/useAppAccess';
import { usePremiumAccess } from '../../hooks/usePremiumAccess';

type DateField = 'purchase' | 'firstPayment';

export function AddExpenseScreen({ navigation, route }: RootScreenProps<'AddExpense'>) {
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);
    const isEmbedded = route.params?.embedded === true;
    const {
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
        saveExpense,
        isPending: isSavingExpense,
        resetForm,
    } = useExpenseForm();
    const currencySymbol = getCurrencySymbol(currency, locale);
    const parsedInstallmentCount = Number.parseInt(installmentCount, 10);
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

    const {
        showCategoryCreator, setShowCategoryCreator,
        newCategoryName, setNewCategoryName,
        newCategoryIcon, setNewCategoryIcon,
        newCategoryColor, setNewCategoryColor,
        isPending: isCreatingCategory,
        onCreateCategory,
    } = useCategoryCreator((id) => setSelectedCategory(id));

    useEffect(() => {
        if (!selectedCategory && categories.length > 0) {
            setSelectedCategory(categories[0].id);
        }
    }, [categories, selectedCategory, setSelectedCategory]);

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

    const onSave = async () => {
        await saveExpense(() => {
            resetForm();
            if (isEmbedded) {
                navigation.goBack();
                return;
            }
            navigation.navigate('Main', {
                    screen: 'Tabs',
                    params: {
                        screen: 'Activity',
                        params: {
                            initialTab: 'expenses',
                            successMessage: t('addExpense.savedSuccess'),
                    },
                },
            });
        });
    };

    const onChangeCost = (value: string) => {
        setCost(sanitizeMoneyInput(value));
    };

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

    return (
        <EntryScreenScaffold
            title={t('addExpense.title')}
            subtitle={t('addExpense.subtitle')}
            embedded={isEmbedded}
            onBack={() => navigation.goBack()}
            scrollRef={scrollRef}
            scrollContentContainerStyle={styles.scrollContent}
            scrollBottomSpacing={spacing['4xl']}
        >
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
                                lineHeight: scaleFont(typography.fontSize['5xl'] * 1.08),
                                height: scaleFont(typography.fontSize['5xl'] + 18),
                            },
                        ]}
                        placeholder={t('addExpense.amountPlaceholder')}
                        placeholderTextColor={colors.textMuted}
                        keyboardType="decimal-pad"
                        value={cost}
                        onChangeText={onChangeCost}
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
                        <Icon name="calendar-outline" size={18} color={colors.textSecondary} />
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
                            themeVariant="dark"
                            textColor={colors.textPrimary}
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
                            setInstallmentCount(value.replace(/[^0-9]/g, '').slice(0, 3))
                        }
                        keyboardType="number-pad"
                        maxLength={3}
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
                                <Icon name="calendar-clear-outline" size={18} color={colors.textSecondary} />
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
                                    themeVariant="dark"
                                    textColor={colors.textPrimary}
                                    onChange={createDateChangeHandler('firstPayment')}
                                />
                            </View>
                        ) : null}
                    </View>

                    <View style={styles.installmentPreviewCard}>
                        <View style={styles.installmentPreviewHeader}>
                            <Icon
                                name="card-outline"
                                size={18}
                                color={colors.primaryLight}
                            />
                            <Text
                                style={[
                                    styles.installmentPreviewTitle,
                                    { fontSize: scaleFont(typography.fontSize.sm) },
                                ]}
                            >
                                {t('expense.installmentPreviewTitle')}
                            </Text>
                        </View>
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

            <View style={[styles.fieldContainer, styles.categorySection]}>
                <Text style={[styles.label, { fontSize: scaleFont(typography.fontSize.sm) }]}>
                    {t('addExpense.categoryRequired')}
                </Text>

                <CategorySelector
                    categories={categories}
                    isLoading={categoriesLoading}
                    selectedCategory={selectedCategory}
                    onSelectCategory={setSelectedCategory}
                />

                <TouchableOpacity
                    style={styles.newCategoryToggle}
                    onPress={() => setShowCategoryCreator((prev) => !prev)}
                    activeOpacity={0.8}
                >
                    <Icon
                        name={showCategoryCreator ? 'remove-circle-outline' : 'add-circle-outline'}
                        size={18}
                        color={colors.primaryLight}
                    />
                    <Text
                        style={[
                            styles.newCategoryToggleText,
                            { fontSize: scaleFont(typography.fontSize.sm) },
                        ]}
                    >
                        {showCategoryCreator
                            ? t('addExpense.hideCategoryCreator')
                            : t('addExpense.showCategoryCreator')}
                    </Text>
                </TouchableOpacity>

                {showCategoryCreator && (
                    <View style={styles.categoryCreator}>
                        <Input
                            placeholder={t('addExpense.categoryNamePlaceholder')}
                            value={newCategoryName}
                            onChangeText={setNewCategoryName}
                            onFocus={createScrollOnFocusHandler(164)}
                            containerStyle={{ marginBottom: 0 }}
                        />

                        <Text style={[styles.creatorLabel, { fontSize: scaleFont(typography.fontSize.sm) }]}>
                            {t('addExpense.icon')}
                        </Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.iconOptions}
                        >
                            {CATEGORY_ICON_OPTIONS.map((iconName) => {
                                const selected = newCategoryIcon === iconName;
                                return (
                                    <TouchableOpacity
                                        key={iconName}
                                        style={[
                                            styles.iconOption,
                                            {
                                                width: isSmallPhone ? 34 : 36,
                                                height: isSmallPhone ? 34 : 36,
                                            },
                                            selected && styles.iconOptionSelected,
                                        ]}
                                        onPress={() => setNewCategoryIcon(iconName)}
                                        activeOpacity={0.8}
                                    >
                                        <Icon
                                            name={iconName}
                                            size={18}
                                            color={
                                                selected
                                                    ? colors.primaryLight
                                                    : colors.textSecondary
                                            }
                                        />
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>

                        <Text style={[styles.creatorLabel, { fontSize: scaleFont(typography.fontSize.sm) }]}>
                            {t('addExpense.color')}
                        </Text>
                        <View style={styles.colorOptions}>
                            {CATEGORY_COLOR_OPTIONS.map((optionColor) => {
                                const selected = newCategoryColor === optionColor;
                                return (
                                    <TouchableOpacity
                                        key={optionColor}
                                        style={[
                                            styles.colorOption,
                                            {
                                                width: isSmallPhone ? 26 : 28,
                                                height: isSmallPhone ? 26 : 28,
                                                backgroundColor: optionColor,
                                            },
                                            selected && styles.colorOptionSelected,
                                        ]}
                                        onPress={() => setNewCategoryColor(optionColor)}
                                        activeOpacity={0.8}
                                    />
                                );
                            })}
                        </View>

                        <View style={styles.creatorActions}>
                            <Button
                                title={t('addExpense.cancel')}
                                variant="secondary"
                                onPress={() => {
                                    setShowCategoryCreator(false);
                                    setNewCategoryName('');
                                }}
                                containerStyle={styles.cancelButton}
                                textStyle={styles.cancelButtonText}
                            />
                            <Button
                                title={t('addExpense.saveCategory')}
                                onPress={onCreateCategory}
                                loading={isCreatingCategory}
                                containerStyle={styles.createCategoryButton}
                                textStyle={styles.createCategoryButtonText}
                            />
                        </View>
                    </View>
                )}
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

            <Button
                title={t('addExpense.saveExpense')}
                onPress={onSave}
                loading={isSavingExpense}
                disabled={isCreatingCategory}
                containerStyle={styles.saveButton}
            />
        </EntryScreenScaffold>
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
        paddingBottom: spacing['4xl'],
    },
    header: {
        paddingBottom: spacing.base,
        backgroundColor: colors.background,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    backButton: {
        marginRight: spacing.sm,
        marginTop: 2,
    },
    headerCopy: {
        flex: 1,
    },
    headerTitle: {
        fontSize: typography.fontSize['2xl'],
        fontWeight: typography.fontWeight.bold,
        color: colors.textPrimary,
    },
    headerSubtitle: {
        fontSize: typography.fontSize.md,
        color: colors.textSecondary,
        marginTop: spacing.xs,
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
        width: '100%',
        maxWidth: 360,
        alignSelf: 'center',
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
        flexGrow: 1,
        flexShrink: 1,
        minWidth: Platform.OS === 'android' ? 150 : 130,
        maxWidth: Platform.OS === 'android' ? 240 : 250,
        textAlign: 'center',
        textAlignVertical: 'center',
        includeFontPadding: Platform.OS === 'android',
        paddingVertical: Platform.OS === 'android' ? spacing.xs : 0,
        paddingHorizontal: spacing.xs,
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
        gap: spacing.sm,
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
    installmentPreviewHeader: {
        flexDirection: 'row',
        alignItems: 'center',
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
    // Categories
    newCategoryToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        marginTop: spacing.sm,
        marginLeft: spacing.xs,
    },
    newCategoryToggleText: {
        color: colors.primaryLight,
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.semibold,
    },
    categoryCreator: {
        marginTop: spacing.md,
        backgroundColor: colors.surfaceCard,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.md,
        gap: spacing.sm,
    },
    creatorLabel: {
        fontSize: typography.fontSize.sm,
        color: colors.textSecondary,
        fontWeight: typography.fontWeight.medium,
    },
    iconOptions: {
        gap: spacing.sm,
    },
    iconOption: {
        width: 36,
        height: 36,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surfaceElevated,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconOptionSelected: {
        borderColor: colors.primary,
        backgroundColor: colors.primary + '20',
    },
    colorOptions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    colorOption: {
        width: 28,
        height: 28,
        borderRadius: borderRadius.full,
        borderWidth: 1,
        borderColor: colors.surface,
    },
    colorOptionSelected: {
        borderColor: colors.textPrimary,
        borderWidth: 2,
    },
    creatorActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: spacing.sm,
        marginTop: spacing.sm,
    },
    cancelButton: {
        minHeight: 0,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        padding: 0,
    },
    cancelButtonText: {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.medium,
    },
    createCategoryButton: {
        minHeight: 0,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        padding: 0,
    },
    createCategoryButtonText: {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.semibold,
    },
    // Save button
    saveButton: {
        marginTop: spacing.xl,
    },
});
