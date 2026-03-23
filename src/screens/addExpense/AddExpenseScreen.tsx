import React, { useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    TouchableOpacity,
    TextInput,
} from 'react-native';
import DateTimePicker, {
    DateTimePickerAndroid,
    DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { RootScreenProps } from '../../navigation/types';
import { useExpenseForm } from '../../hooks/useExpenseForm';
import { useCategoryCreator, CATEGORY_ICON_OPTIONS, CATEGORY_COLOR_OPTIONS } from '../../hooks/useCategoryCreator';
import { CategorySelector } from '../../components/ui/CategorySelector';
import { PaymentMethodSelector } from '../../components/ui/PaymentMethodSelector';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import {
    spacing,
    typography,
    borderRadius,
    useResponsive,
    useTheme,
    useThemedStyles,
} from '../../theme';
import { AnimatedScreen } from '../../components/ui/AnimatedScreen';
import { HomeBackground } from '../../components/ui/HomeBackground';
import { useI18n } from '../../hooks/useI18n';
import { sanitizeMoneyInput } from '../../utils/moneyInput';
import { formatDate } from '../../utils/format';

function parseDateOrToday(value: string): Date {
    const parsed = new Date(`${value}T12:00:00`);
    if (Number.isNaN(parsed.getTime())) {
        return new Date();
    }

    return parsed;
}

export function AddExpenseScreen({ navigation, route }: RootScreenProps<'AddExpense'>) {
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);
    const insets = useSafeAreaInsets();
    const isEmbedded = route.params?.embedded === true;
    const {
        horizontalPadding,
        contentMaxWidth,
        isSmallPhone,
        scaleFont,
    } = useResponsive();
    const { t, language } = useI18n();
    const locale = language === 'es' ? 'es-MX' : 'en-US';
    const [showIosDatePicker, setShowIosDatePicker] = useState(false);

    const {
        title, setTitle,
        cost, setCost,
        note, setNote,
        paymentMethod, setPaymentMethod,
        selectedCategory, setSelectedCategory,
        date, setDate,
        categories, categoriesLoading,
        saveExpense,
        isPending: isSavingExpense,
        resetForm,
    } = useExpenseForm();

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

    const onSave = async () => {
        await saveExpense(() => {
            resetForm();
            navigation.navigate('Main', {
                screen: 'Tabs',
                params: {
                    screen: 'SubscriptionsTab',
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

    const onChangeDate = (_event: DateTimePickerEvent, value?: Date) => {
        if (!value) {
            return;
        }

        setDate(formatDate(value, 'YYYY-MM-DD'));
        if (Platform.OS === 'ios') {
            setShowIosDatePicker(false);
        }
    };

    const openDatePicker = () => {
        const current = parseDateOrToday(date);
        if (Platform.OS === 'android') {
            DateTimePickerAndroid.open({
                mode: 'date',
                value: current,
                onChange: onChangeDate,
            });
            return;
        }

        setShowIosDatePicker((prev) => !prev);
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? (isEmbedded ? 0 : insets.top) : 0}
        >
            <HomeBackground />
            <AnimatedScreen style={styles.flex1} delay={8} duration={200} travelY={6}>
                {/* Fixed Header */}
                <View
                    style={[
                        styles.header,
                        {
                            paddingTop: isEmbedded ? spacing.base : insets.top + spacing.base,
                            paddingHorizontal: horizontalPadding,
                        },
                    ]}
                >
                    <Text style={[styles.headerTitle, { fontSize: scaleFont(typography.fontSize['2xl']) }]}>
                        {t('addExpense.title')}
                    </Text>
                    <Text style={[styles.headerSubtitle, { fontSize: scaleFont(typography.fontSize.md) }]}>
                        {t('addExpense.subtitle')}
                    </Text>
                </View>

                <ScrollView
                    contentContainerStyle={[
                        styles.scrollContent,
                        {
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
                    <View style={styles.amountContainer}>
                        <Text style={[styles.currencySign, { fontSize: scaleFont(typography.fontSize['3xl']) }]}>$</Text>
                        <TextInput
                            style={[
                                styles.amountInput,
                                {
                                    fontSize: scaleFont(typography.fontSize['5xl']),
                                    lineHeight: scaleFont(typography.fontSize['5xl']),
                                    minWidth: isSmallPhone ? 100 : 120,
                                },
                            ]}
                            placeholder={t('addExpense.amountPlaceholder')}
                            placeholderTextColor={colors.textMuted}
                            keyboardType="decimal-pad"
                            value={cost}
                            onChangeText={onChangeCost}
                        />
                    </View>

                    <Input
                        label={t('addExpense.titleLabel')}
                        placeholder={t('addExpense.titlePlaceholder')}
                        value={title}
                        onChangeText={setTitle}
                        containerStyle={styles.fieldContainer}
                    />

                    <View style={styles.fieldContainer}>
                        <Text style={[styles.label, { fontSize: scaleFont(typography.fontSize.sm) }]}>
                            {t('addExpense.dateLabel')}
                        </Text>
                        <TouchableOpacity
                            activeOpacity={0.84}
                            style={styles.dateButton}
                            onPress={openDatePicker}
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
                        {Platform.OS === 'ios' && showIosDatePicker ? (
                            <View style={styles.iosDatePickerCard}>
                                <DateTimePicker
                                    mode="date"
                                    display="spinner"
                                    value={parseDateOrToday(date)}
                                    onChange={onChangeDate}
                                />
                            </View>
                        ) : null}
                    </View>

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
                        onChange={setPaymentMethod}
                    />

                    <Input
                        label={t('addExpense.noteOptional')}
                        placeholder={t('addExpense.notePlaceholder')}
                        multiline
                        value={note}
                        onChangeText={setNote}
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
                </ScrollView>
            </AnimatedScreen>
        </KeyboardAvoidingView>
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
    scrollContent: {
        paddingBottom: spacing['4xl'],
    },
    header: {
        paddingBottom: spacing.base,
        backgroundColor: colors.background,
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
    amountContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing['2xl'],
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
