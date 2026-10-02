import React, { useMemo, useState } from 'react';
import {
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import DateTimePicker, {
    DateTimePickerAndroid,
    DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/Ionicons';
import { RootScreenProps } from '../../navigation/types';
import { useIncomeForm } from '../../hooks/incomes/useIncomeForm';
import { CurrencySelector } from '../../components/ui/domain/CurrencySelector';
import { AmountEntryCard } from '../../components/ui/domain/AmountEntryCard';
import { Button } from '../../components/ui/primitives/Button';
import { Input } from '../../components/ui/primitives/Input';
import { FieldError } from '../../components/ui/primitives/FieldError';
import { EntryScreenScaffold } from '../../components/ui/layout/EntryScreenScaffold';
import {
    borderRadius,
    spacing,
    typography,
    useResponsive,
    useTheme,
    useThemedStyles,
    SemanticColors,
} from '../../theme/index';
import { useI18n } from '../../hooks/shared/useI18n';
import { sanitizeMoneyInput } from '../../utils/platform/moneyInput';
import { getCurrencyLocale, getCurrencySymbol } from '../../utils/domain/currency';
import { formatCurrency, formatDate, parseDateOrToday } from '../../utils/core/format';
import { withAlpha } from '../../utils/domain/subscriptions';
import { useScrollToFocusedInput } from '../../hooks/shared/useScrollToFocusedInput';

export function AddIncomeScreen({ navigation, route }: RootScreenProps<'AddIncome'>) {
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);
    const isEmbedded = route.params?.embedded === true;
    const editingIncome = route.params?.income ?? null;
    const {
        scaleFont,
    } = useResponsive();
    const { t, language } = useI18n();
    const locale = getCurrencyLocale(language);
    const [showIosPicker, setShowIosPicker] = useState(false);
    const { scrollRef, createScrollOnFocusHandler } = useScrollToFocusedInput(120);
    const {
        title,
        setTitle,
        amount,
        setAmount,
        currency,
        setCurrency,
        note,
        setNote,
        date,
        setDate,
        saveIncome,
        validationErrors,
        clearValidationError,
        resetForm,
        isPending,
        isEditMode,
    } = useIncomeForm(editingIncome);

    const currencySymbol = getCurrencySymbol(currency, locale);
    const dateLabel = useMemo(
        () =>
            parseDateOrToday(date).toLocaleDateString(locale, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            }),
        [date, locale],
    );
    const previewAmount = Number.parseFloat(amount);
    const amountPreview = Number.isFinite(previewAmount) && previewAmount > 0
        ? formatCurrency(previewAmount, currency, locale)
        : formatCurrency(0, currency, locale);

    const onChangeDate = (_event: DateTimePickerEvent, value?: Date) => {
        if (!value) {
            return;
        }

        const capped = value.getTime() > Date.now() ? new Date() : value;
        setDate(formatDate(capped, 'YYYY-MM-DD'));
        clearValidationError('date');
    };

    const openDatePicker = () => {
        if (Platform.OS === 'android') {
            DateTimePickerAndroid.open({
                mode: 'date',
                value: parseDateOrToday(date),
                maximumDate: new Date(),
                onChange: onChangeDate,
            });
            return;
        }

        setShowIosPicker((prev) => !prev);
    };

    const onSave = async () => {
        const result = await saveIncome(() => {
            if (!isEditMode) {
                resetForm();
            }
            if (isEmbedded) {
                navigation.goBack();
                return;
            }

            navigation.navigate('Main', {
                screen: 'Tabs',
                params: {
                    screen: 'Activity',
                    params: {
                        initialTab: 'incomes',
                        successMessage: isEditMode
                            ? t('income.updatedSuccess')
                            : t('income.savedSuccess'),
                    },
                },
            });
        });

        if (result?.valid === false) {
            const fieldOffsets: Record<string, number> = {
                amount: 0,
                currency: 220,
                title: 380,
                date: 520,
            };
            requestAnimationFrame(() => {
                scrollRef.current?.scrollTo({
                    y: fieldOffsets[result.firstInvalidField] ?? 0,
                    animated: true,
                });
            });
        }
    };

    return (
        <EntryScreenScaffold
            title={isEditMode ? t('income.editTitle') : t('income.addTitle')}
            subtitle={t('income.subtitle')}
            embedded={isEmbedded}
            onBack={() => navigation.goBack()}
            scrollRef={scrollRef}
            scrollContentContainerStyle={styles.scrollContent}
            scrollBottomSpacing={spacing['4xl']}
        >
            <AmountEntryCard
                value={amount}
                onChangeText={(value) => {
                    setAmount(sanitizeMoneyInput(value));
                    clearValidationError('amount');
                }}
                currencySymbol={currencySymbol}
                currency={currency}
                previewLabel={t('income.amountPreview', { amount: amountPreview })}
                accessibilityLabel={t('income.amountPlaceholder')}
                placeholder={t('income.amountPlaceholder')}
                accentColor={colors.primaryAction}
                error={validationErrors.amount}
                onFocus={createScrollOnFocusHandler(64)}
            />

            <CurrencySelector
                label={t('income.currency')}
                value={currency}
                onChange={(nextCurrency) => {
                    setCurrency(nextCurrency);
                    clearValidationError('currency');
                }}
            />
            <FieldError message={validationErrors.currency} />

            <View style={styles.formCard}>
                <Input
                    label={t('income.source')}
                    placeholder={t('income.sourcePlaceholder')}
                    value={title}
                    onChangeText={(value) => {
                        setTitle(value);
                        clearValidationError('title');
                    }}
                    onFocus={createScrollOnFocusHandler()}
                    error={validationErrors.title}
                />

                <TouchableOpacity
                    activeOpacity={0.84}
                    style={[styles.dateButton, validationErrors.date ? styles.dateButtonError : null]}
                    onPress={openDatePicker}
                >
                    <View style={styles.dateCopy}>
                        <Text style={[styles.dateLabel, { fontSize: scaleFont(typography.fontSize.sm) }]}>
                            {t('income.receivedOn')}
                        </Text>
                        <Text style={[styles.dateValue, { fontSize: scaleFont(typography.fontSize.base) }]}>
                            {dateLabel}
                        </Text>
                    </View>
                    <Icon name="calendar-outline" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
                <FieldError message={validationErrors.date} />

                {Platform.OS === 'ios' && showIosPicker ? (
                    <DateTimePicker
                        mode="date"
                        display="inline"
                        value={parseDateOrToday(date)}
                        maximumDate={new Date()}
                        themeVariant="dark"
                        onChange={onChangeDate}
                    />
                ) : null}

                <Input
                    label={t('income.note')}
                    placeholder={t('income.notePlaceholder')}
                    value={note}
                    onChangeText={setNote}
                    onFocus={createScrollOnFocusHandler(184)}
                    multiline
                    numberOfLines={4}
                />
            </View>

            <View style={styles.tipCard}>
                <View style={styles.tipIconWrap}>
                    <Icon name="sparkles-outline" size={18} color={colors.success} />
                </View>
                <Text style={[styles.tipText, { fontSize: scaleFont(typography.fontSize.sm) }]}>
                    {t('income.tip')}
                </Text>
            </View>

            <Button
                title={isEditMode ? t('income.saveChanges') : t('income.save')}
                onPress={onSave}
                loading={isPending}
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
    header: {
        gap: spacing.xs,
        marginBottom: spacing.base,
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
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.bold,
    },
    headerSubtitle: {
        color: colors.textMuted,
        lineHeight: 22,
    },
    scrollContent: {
        gap: spacing.base,
    },
    formCard: {
        borderRadius: borderRadius.xl,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: withAlpha(colors.surfaceElevated, 0.72),
        padding: spacing.base,
        gap: spacing.base,
    },
    dateButton: {
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surfaceElevated,
        paddingHorizontal: spacing.base,
        paddingVertical: spacing.base,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    dateButtonError: {
        borderColor: colors.error,
    },
    dateCopy: {
        gap: 2,
    },
    dateLabel: {
        color: colors.textMuted,
        fontWeight: typography.fontWeight.medium,
    },
    dateValue: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.semibold,
    },
    tipCard: {
        borderRadius: borderRadius.xl,
        borderWidth: 1,
        borderColor: withAlpha(colors.success, 0.24),
        backgroundColor: withAlpha(colors.success, 0.08),
        padding: spacing.base,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.sm,
    },
    tipIconWrap: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: withAlpha(colors.success, 0.16),
    },
    tipText: {
        flex: 1,
        color: colors.textSecondary,
        lineHeight: 20,
    },
    saveButton: {
        marginTop: spacing.xs,
    },
});
