import React, { useMemo, useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { RootScreenProps } from '../../navigation/types';
import { useIncomeForm } from '../../hooks/useIncomeForm';
import { CurrencySelector } from '../../components/ui/CurrencySelector';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { AnimatedScreen } from '../../components/ui/AnimatedScreen';
import { HomeBackground } from '../../components/ui/HomeBackground';
import { ScreenBackButton } from '../../components/ui/ScreenBackButton';
import {
    borderRadius,
    spacing,
    typography,
    useResponsive,
    useTheme,
    useThemedStyles,
} from '../../theme';
import { useI18n } from '../../hooks/useI18n';
import { sanitizeMoneyInput } from '../../utils/moneyInput';
import { getCurrencyLocale, getCurrencySymbol } from '../../utils/currency';
import { formatCurrency, formatDate } from '../../utils/format';
import { withAlpha } from '../../utils/subscriptions';

function parseDateOrToday(value: string): Date {
    const parsed = new Date(`${value}T12:00:00`);
    if (Number.isNaN(parsed.getTime())) {
        return new Date();
    }

    return parsed;
}

export function AddIncomeScreen({ navigation, route }: RootScreenProps<'AddIncome'>) {
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);
    const insets = useSafeAreaInsets();
    const isEmbedded = route.params?.embedded === true;
    const editingIncome = route.params?.income ?? null;
    const {
        horizontalPadding,
        contentMaxWidth,
        isSmallPhone,
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
    const constrainedContentStyle = useMemo(
        () => (
            contentMaxWidth
                ? { maxWidth: contentMaxWidth, alignSelf: 'center' as const, width: '100%' as const }
                : null
        ),
        [contentMaxWidth],
    );
    const amountInputSizeStyle = useMemo(
        () => ({ minWidth: isSmallPhone ? 100 : 120 }),
        [isSmallPhone],
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

            navigation.navigate('Main', {
                screen: 'Income',
                params: {
                    successMessage: isEditMode
                        ? t('income.updatedSuccess')
                        : t('income.savedSuccess'),
                },
            });
        });
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? (isEmbedded ? 0 : insets.top) : 0}
        >
            <HomeBackground />
            <AnimatedScreen style={styles.flex1} delay={8} duration={200} travelY={6}>
                <View
                    style={[
                        styles.header,
                        {
                            paddingTop: isEmbedded ? spacing.base : insets.top + spacing.base,
                            paddingHorizontal: horizontalPadding,
                        },
                    ]}
                >
                    <View style={styles.headerRow}>
                        {!isEmbedded ? (
                            <ScreenBackButton
                                onPress={() => navigation.goBack()}
                                containerStyle={styles.backButton}
                            />
                        ) : null}
                        <View style={styles.headerCopy}>
                            <Text style={[styles.headerTitle, { fontSize: scaleFont(typography.fontSize['2xl']) }]}>
                                {isEditMode ? t('income.editTitle') : t('income.addTitle')}
                            </Text>
                            <Text style={[styles.headerSubtitle, { fontSize: scaleFont(typography.fontSize.md) }]}>
                                {t('income.subtitle')}
                            </Text>
                        </View>
                    </View>
                </View>

                <ScrollView
                    contentContainerStyle={[
                        styles.scrollContent,
                        {
                            paddingBottom: insets.bottom + spacing['4xl'],
                            paddingHorizontal: horizontalPadding,
                        },
                        constrainedContentStyle,
                    ]}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
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
                                        lineHeight: scaleFont(typography.fontSize['5xl']),
                                    },
                                    amountInputSizeStyle,
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
        alignItems: 'flex-end',
        justifyContent: 'center',
        gap: spacing.sm,
    },
    currencySign: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.semibold,
        marginBottom: spacing.sm,
    },
    amountInput: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.bold,
        minWidth: 120,
        textAlign: 'center',
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
