import React, { useMemo, useState } from 'react';
import {
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import DateTimePicker, {
    DateTimePickerAndroid,
    DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/Ionicons';
import { RootScreenProps } from '../../navigation/types';
import { useIncomeForm } from '../../hooks/useIncomeForm';
import { CurrencySelector } from '../../components/ui/domain/CurrencySelector';
import { Button } from '../../components/ui/primitives/Button';
import { Input } from '../../components/ui/primitives/Input';
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
import { useI18n } from '../../hooks/useI18n';
import { sanitizeMoneyInput } from '../../utils/platform/moneyInput';
import { getCurrencyLocale, getCurrencySymbol } from '../../utils/domain/currency';
import { formatCurrency, formatDate, parseDateOrToday } from '../../utils/core/format';
import { withAlpha } from '../../utils/domain/subscriptions';

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
        await saveIncome(() => {
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
    };

    return (
        <EntryScreenScaffold
            title={isEditMode ? t('income.editTitle') : t('income.addTitle')}
            subtitle={t('income.subtitle')}
            embedded={isEmbedded}
            onBack={() => navigation.goBack()}
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
                        placeholder={t('income.amountPlaceholder')}
                        placeholderTextColor={colors.textMuted}
                        keyboardType="decimal-pad"
                        value={amount}
                        onChangeText={(value) => setAmount(sanitizeMoneyInput(value))}
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
                <Text style={[styles.amountPreview, { fontSize: scaleFont(typography.fontSize.sm) }]}>
                    {t('income.amountPreview', { amount: amountPreview })}
                </Text>
            </View>

            <CurrencySelector
                label={t('income.currency')}
                value={currency}
                onChange={setCurrency}
            />

            <View style={styles.formCard}>
                <Input
                    label={t('income.source')}
                    placeholder={t('income.sourcePlaceholder')}
                    value={title}
                    onChangeText={setTitle}
                />

                <TouchableOpacity
                    activeOpacity={0.84}
                    style={styles.dateButton}
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
    amountBlock: {
        borderRadius: borderRadius.xl,
        borderWidth: 1,
        borderColor: withAlpha(colors.success, 0.28),
        backgroundColor: withAlpha(colors.surfaceElevated, 0.82),
        padding: spacing.xl,
        gap: spacing.sm,
    },
    amountContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        width: '100%',
        maxWidth: 360,
        alignSelf: 'center',
    },
    currencySign: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.semibold,
        marginBottom: spacing.sm,
    },
    amountInput: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.bold,
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
        alignSelf: 'center',
        borderRadius: borderRadius.full,
        backgroundColor: withAlpha(colors.success, 0.14),
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        marginBottom: spacing.sm,
    },
    amountCurrencyText: {
        color: colors.success,
        fontWeight: typography.fontWeight.semibold,
    },
    amountPreview: {
        color: colors.textMuted,
        textAlign: 'center',
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
