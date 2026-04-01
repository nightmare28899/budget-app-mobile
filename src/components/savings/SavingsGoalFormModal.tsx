import React, { useEffect, useMemo, useState } from 'react';
import {
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
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
import { CreateSavingsGoalPayload, SavingsGoal } from '../../types';
import { useI18n } from '../../hooks/useI18n';
import { formatCurrency } from '../../utils/format';
import { formatDateISO } from '../../utils/subscriptions';
import {
    SAVINGS_GOAL_COLOR_OPTIONS,
    SAVINGS_GOAL_ICON_OPTIONS,
    formatSavingsDate,
    resolveSavingsGoalColor,
    withSavingsAlpha,
} from '../../utils/savings';
import {
    borderRadius,
    spacing,
    typography,
    useResponsive,
    useTheme,
    useThemedStyles,
} from '../../theme';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import {
    MAX_COST_LABEL,
    MAX_COST_VALUE,
    sanitizeMoneyInput,
} from '../../utils/moneyInput';
import { useScrollToFocusedInput } from '../../hooks/useScrollToFocusedInput';

type SavingsGoalFormMode = 'create' | 'edit';
type SavingsGoalFormInitialValues = Partial<
    Pick<SavingsGoal, 'title' | 'targetAmount' | 'targetDate' | 'icon' | 'color'>
>;

interface SavingsGoalFormModalProps {
    visible: boolean;
    loading: boolean;
    errorMessage?: string | null;
    mode?: SavingsGoalFormMode;
    initialValues?: SavingsGoalFormInitialValues | null;
    onClose: () => void;
    onSubmit: (payload: CreateSavingsGoalPayload) => void | Promise<void>;
}

function parseDateOrToday(value?: string): Date {
    if (!value) {
        const today = new Date();
        today.setHours(12, 0, 0, 0);
        return today;
    }

    const parsed = new Date(`${value}T12:00:00`);
    if (Number.isNaN(parsed.getTime())) {
        const today = new Date();
        today.setHours(12, 0, 0, 0);
        return today;
    }

    return parsed;
}

function normalizeTargetDateValue(value?: string | null): string {
    if (typeof value !== 'string' || !value.trim()) {
        return '';
    }

    const normalized = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
        return normalized;
    }

    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) {
        return '';
    }

    return formatDateISO(parsed);
}

function resolveInitialGoalIcon(value?: string | null): string {
    if (
        typeof value === 'string'
        && SAVINGS_GOAL_ICON_OPTIONS.includes(value as (typeof SAVINGS_GOAL_ICON_OPTIONS)[number])
    ) {
        return value;
    }

    return SAVINGS_GOAL_ICON_OPTIONS[0];
}

function resolveInitialGoalColor(value?: string | null): string {
    const normalized = resolveSavingsGoalColor(value, SAVINGS_GOAL_COLOR_OPTIONS[0]);
    if (
        SAVINGS_GOAL_COLOR_OPTIONS.includes(
            normalized as (typeof SAVINGS_GOAL_COLOR_OPTIONS)[number],
        )
    ) {
        return normalized;
    }

    return SAVINGS_GOAL_COLOR_OPTIONS[0];
}

export function SavingsGoalFormModal({
    visible,
    loading,
    errorMessage,
    mode = 'create',
    initialValues = null,
    onClose,
    onSubmit,
}: SavingsGoalFormModalProps) {
    const styles = useThemedStyles(createStyles);
    const { colors } = useTheme();
    const { scaleFont } = useResponsive();
    const { t, language } = useI18n();
    const { scrollRef, createScrollOnFocusHandler } = useScrollToFocusedInput(116);
    const locale: 'es-MX' | 'en-US' = language === 'es' ? 'es-MX' : 'en-US';
    const [title, setTitle] = useState('');
    const [targetAmount, setTargetAmount] = useState('');
    const [targetDate, setTargetDate] = useState('');
    const [selectedIcon, setSelectedIcon] = useState<string>(SAVINGS_GOAL_ICON_OPTIONS[0]);
    const [selectedColor, setSelectedColor] = useState<string>(SAVINGS_GOAL_COLOR_OPTIONS[0]);
    const [showIosDatePicker, setShowIosDatePicker] = useState(false);
    const [showPersonalization, setShowPersonalization] = useState(mode === 'edit');
    const [titleError, setTitleError] = useState<string | undefined>();
    const [targetAmountError, setTargetAmountError] = useState<string | undefined>();
    const accentColor = resolveSavingsGoalColor(selectedColor, colors.primaryAction);
    const targetDateLabel = targetDate
        ? formatSavingsDate(targetDate, locale)
        : t('savings.noTargetDate');
    const modalTitle = mode === 'edit'
        ? t('savings.editGoalTitle')
        : t('savings.createGoalTitle');
    const modalSubtitle = mode === 'edit'
        ? t('savings.editGoalSubtitle')
        : t('savings.createGoalSubtitle');
    const submitLabel = mode === 'edit'
        ? t('common.save')
        : t('savings.createGoalAction');
    const secondaryActionLabel = mode === 'edit'
        ? t('common.cancel')
        : t('savings.formDismissAction');

    useEffect(() => {
        if (!visible) {
            return;
        }

        setTitle(initialValues?.title ?? '');
        setTargetAmount(
            typeof initialValues?.targetAmount === 'number' && initialValues.targetAmount > 0
                ? sanitizeMoneyInput(String(initialValues.targetAmount))
                : '',
        );
        setTargetDate(normalizeTargetDateValue(initialValues?.targetDate));
        setSelectedIcon(resolveInitialGoalIcon(initialValues?.icon));
        setSelectedColor(resolveInitialGoalColor(initialValues?.color));
        setShowIosDatePicker(false);
        setShowPersonalization(mode === 'edit');
        setTitleError(undefined);
        setTargetAmountError(undefined);
    }, [initialValues, mode, visible]);

    const previewAmount = useMemo(() => {
        const parsed = Number(targetAmount);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
    }, [targetAmount]);
    const previewAmountLabel = formatCurrency(previewAmount, 'MXN');

    const handleClose = () => {
        if (loading) {
            return;
        }

        onClose();
    };

    const onChangeDate = (event: DateTimePickerEvent, date?: Date) => {
        if (Platform.OS === 'ios') {
            if (event.type === 'dismissed' || !date) {
                return;
            }

            setTargetDate(formatDateISO(date));
            return;
        }

        if (event.type === 'dismissed' || !date) {
            return;
        }

        setTargetDate(formatDateISO(date));
    };

    const openDatePicker = () => {
        const current = parseDateOrToday(targetDate);

        if (Platform.OS === 'android') {
            DateTimePickerAndroid.open({
                mode: 'date',
                value: current,
                minimumDate: new Date(),
                onChange: onChangeDate,
            });
            return;
        }

        setShowIosDatePicker((prev) => !prev);
    };

    const handleSubmit = () => {
        let hasError = false;
        const normalizedTitle = title.trim();
        const parsedTargetAmount = Number(targetAmount);

        if (!normalizedTitle) {
            setTitleError(t('savings.validationGoalTitle'));
            hasError = true;
        } else {
            setTitleError(undefined);
        }

        if (!targetAmount || !Number.isFinite(parsedTargetAmount) || parsedTargetAmount <= 0) {
            setTargetAmountError(t('savings.validationTargetAmount'));
            hasError = true;
        } else if (parsedTargetAmount > MAX_COST_VALUE) {
            setTargetAmountError(t('common.maxAmountExceeded', { max: MAX_COST_LABEL }));
            hasError = true;
        } else {
            setTargetAmountError(undefined);
        }

        if (hasError) {
            return;
        }

        onSubmit({
            title: normalizedTitle,
            targetAmount: parsedTargetAmount,
            targetDate: targetDate || undefined,
            icon: selectedIcon,
            color: selectedColor,
        });
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={handleClose}
            statusBarTranslucent
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.overlay}
            >
                <Pressable style={styles.backdrop} onPress={handleClose} />
                <View style={styles.card}>
                    <View style={styles.header}>
                        <View style={styles.headerCopy}>
                            <Text
                                style={[
                                    styles.title,
                                    { fontSize: scaleFont(typography.fontSize.xl) },
                                ]}
                            >
                                {modalTitle}
                            </Text>
                            <Text
                                style={[
                                    styles.subtitle,
                                    { fontSize: scaleFont(typography.fontSize.sm) },
                                ]}
                            >
                                {modalSubtitle}
                            </Text>
                        </View>
                        <TouchableOpacity
                            activeOpacity={0.82}
                            style={styles.closeButton}
                            onPress={handleClose}
                            disabled={loading}
                        >
                            <Icon name="close" size={18} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        ref={scrollRef}
                        contentContainerStyle={styles.cardContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        keyboardDismissMode="on-drag"
                        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
                    >
                        <View
                            style={[
                                styles.previewStrip,
                                {
                                    backgroundColor: withSavingsAlpha(accentColor, 0.1),
                                    borderColor: withSavingsAlpha(accentColor, 0.18),
                                },
                            ]}
                        >
                            <Text
                                style={[
                                    styles.previewLabel,
                                    { fontSize: scaleFont(typography.fontSize.xs) },
                                ]}
                            >
                                {t('savings.formPreviewTitle')}
                            </Text>
                            <View style={styles.previewRow}>
                                <View
                                    style={[
                                        styles.previewIconWrap,
                                        {
                                            backgroundColor: withSavingsAlpha(accentColor, 0.16),
                                        },
                                    ]}
                                >
                                    <Icon name={selectedIcon} size={18} color={accentColor} />
                                </View>
                                <View style={styles.previewMainCopy}>
                                    <Text
                                        style={[
                                            styles.previewTitle,
                                            { fontSize: scaleFont(typography.fontSize.base) },
                                        ]}
                                        numberOfLines={1}
                                    >
                                        {title.trim() || t('savings.formGoalPlaceholder')}
                                    </Text>
                                    <Text
                                        style={[
                                            styles.previewAmount,
                                            { fontSize: scaleFont(typography.fontSize.sm) },
                                        ]}
                                    >
                                        {previewAmountLabel}
                                    </Text>
                                </View>
                                <View style={styles.previewDatePill}>
                                    <Text
                                        style={[
                                            styles.previewDateText,
                                            { fontSize: scaleFont(typography.fontSize.xs) },
                                        ]}
                                        numberOfLines={1}
                                    >
                                        {targetDateLabel}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.formSection}>
                            <View style={styles.sectionHeader}>
                                <Text
                                    style={[
                                        styles.sectionHeading,
                                        { fontSize: scaleFont(typography.fontSize.base) },
                                    ]}
                                >
                                    {t('savings.formDetailsTitle')}
                                </Text>
                                <Text
                                    style={[
                                        styles.sectionHeadingSubtitle,
                                        { fontSize: scaleFont(typography.fontSize.sm) },
                                    ]}
                                >
                                    {t('savings.formDetailsSubtitle')}
                                </Text>
                            </View>

                            <Input
                                label={t('savings.formGoalTitle')}
                                placeholder={t('savings.formGoalPlaceholder')}
                                value={title}
                                onChangeText={setTitle}
                                error={titleError}
                                containerStyle={styles.field}
                                autoCapitalize="sentences"
                                autoCorrect={false}
                                onFocus={createScrollOnFocusHandler()}
                                leftContent={
                                    <Icon
                                        name="pricetag-outline"
                                        size={18}
                                        color={colors.textMuted}
                                    />
                                }
                            />

                            <Input
                                label={t('savings.formTargetAmount')}
                                placeholder={t('common.amountPlaceholder')}
                                value={targetAmount}
                                onChangeText={(value) => setTargetAmount(sanitizeMoneyInput(value))}
                                error={targetAmountError}
                                keyboardType="decimal-pad"
                                containerStyle={styles.field}
                                onFocus={createScrollOnFocusHandler(132)}
                                leftContent={<Text style={styles.currencySign}>$</Text>}
                            />

                            <View style={styles.fieldNoGap}>
                                <Text
                                    style={[
                                        styles.sectionLabel,
                                        { fontSize: scaleFont(typography.fontSize.sm) },
                                    ]}
                                >
                                    {t('savings.formTargetDate')}
                                </Text>
                                <TouchableOpacity
                                    style={styles.selectorButton}
                                    activeOpacity={0.82}
                                    onPress={openDatePicker}
                                >
                                    <View style={styles.selectorContent}>
                                        <Icon
                                            name="calendar-outline"
                                            size={18}
                                            color={colors.textMuted}
                                        />
                                        <Text
                                            style={[
                                                styles.selectorText,
                                                { fontSize: scaleFont(typography.fontSize.base) },
                                                !targetDate ? styles.selectorPlaceholder : null,
                                            ]}
                                        >
                                            {targetDateLabel}
                                        </Text>
                                    </View>
                                    <Icon
                                        name={showIosDatePicker ? 'chevron-up' : 'chevron-down'}
                                        size={18}
                                        color={colors.textMuted}
                                    />
                                </TouchableOpacity>
                                <View style={styles.dateHelperRow}>
                                    <Text
                                        style={[
                                            styles.dateHelperText,
                                            { fontSize: scaleFont(typography.fontSize.xs) },
                                        ]}
                                    >
                                        {t('savings.formTargetDateHint')}
                                    </Text>
                                    {targetDate ? (
                                        <Button
                                            title={t('savings.clearTargetDate')}
                                            variant="ghost"
                                            onPress={() => {
                                                setTargetDate('');
                                                setShowIosDatePicker(false);
                                            }}
                                        />
                                    ) : null}
                                </View>
                                {Platform.OS === 'ios' && showIosDatePicker ? (
                                    <View style={styles.iosPickerWrap}>
                                        <DateTimePicker
                                            mode="date"
                                            display="inline"
                                            value={parseDateOrToday(targetDate)}
                                            minimumDate={new Date()}
                                            onChange={onChangeDate}
                                        />
                                    </View>
                                ) : null}
                            </View>
                        </View>

                        <TouchableOpacity
                            activeOpacity={0.84}
                            style={styles.personalizeToggle}
                            onPress={() => setShowPersonalization((prev) => !prev)}
                        >
                            <View style={styles.personalizeCopy}>
                                <Text
                                    style={[
                                        styles.personalizeTitle,
                                        { fontSize: scaleFont(typography.fontSize.base) },
                                    ]}
                                >
                                    {t('savings.personalizeToggleTitle')}
                                </Text>
                                <Text
                                    style={[
                                        styles.personalizeSubtitle,
                                        { fontSize: scaleFont(typography.fontSize.sm) },
                                    ]}
                                >
                                    {t('savings.personalizeToggleSubtitle')}
                                </Text>
                            </View>
                            <Icon
                                name={showPersonalization ? 'chevron-up' : 'chevron-down'}
                                size={18}
                                color={colors.textSecondary}
                            />
                        </TouchableOpacity>

                        {showPersonalization ? (
                            <View style={styles.personalizationPanel}>
                                <View style={styles.field}>
                                    <Text
                                        style={[
                                            styles.sectionLabel,
                                            { fontSize: scaleFont(typography.fontSize.sm) },
                                        ]}
                                    >
                                        {t('savings.formGoalIcon')}
                                    </Text>
                                    <ScrollView
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        contentContainerStyle={styles.iconOptions}
                                    >
                                        {SAVINGS_GOAL_ICON_OPTIONS.map((iconName) => {
                                            const selected = selectedIcon === iconName;
                                            return (
                                                <TouchableOpacity
                                                    key={iconName}
                                                    style={[
                                                        styles.iconOption,
                                                        selected
                                                            ? {
                                                                borderColor: accentColor,
                                                                backgroundColor: withSavingsAlpha(
                                                                    accentColor,
                                                                    0.14,
                                                                ),
                                                            }
                                                            : null,
                                                    ]}
                                                    activeOpacity={0.82}
                                                    onPress={() => setSelectedIcon(iconName)}
                                                >
                                                    {selected ? (
                                                        <View
                                                            style={[
                                                                styles.optionCheckBadge,
                                                                {
                                                                    backgroundColor: accentColor,
                                                                },
                                                            ]}
                                                        >
                                                            <Icon
                                                                name="checkmark"
                                                                size={10}
                                                                color="#FFFFFF"
                                                            />
                                                        </View>
                                                    ) : null}
                                                    <Icon
                                                        name={iconName}
                                                        size={18}
                                                        color={
                                                            selected
                                                                ? accentColor
                                                                : colors.textSecondary
                                                        }
                                                    />
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </ScrollView>
                                </View>

                                <View style={styles.fieldNoGap}>
                                    <Text
                                        style={[
                                            styles.sectionLabel,
                                            { fontSize: scaleFont(typography.fontSize.sm) },
                                        ]}
                                    >
                                        {t('savings.formGoalColor')}
                                    </Text>
                                    <View style={styles.colorOptions}>
                                        {SAVINGS_GOAL_COLOR_OPTIONS.map((optionColor) => {
                                            const selected = selectedColor === optionColor;
                                            return (
                                                <TouchableOpacity
                                                    key={optionColor}
                                                    style={[
                                                        styles.colorOption,
                                                        {
                                                            backgroundColor: optionColor,
                                                            borderColor: selected
                                                                ? colors.textPrimary
                                                                : colors.surface,
                                                        },
                                                        selected
                                                            ? styles.colorOptionSelected
                                                            : null,
                                                    ]}
                                                    activeOpacity={0.82}
                                                    onPress={() => setSelectedColor(optionColor)}
                                                >
                                                    {selected ? (
                                                        <Icon
                                                            name="checkmark"
                                                            size={16}
                                                            color="#FFFFFF"
                                                        />
                                                    ) : null}
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                </View>
                            </View>
                        ) : null}

                        {errorMessage ? (
                            <View style={styles.errorCard}>
                                <Text
                                    style={[
                                        styles.serverError,
                                        { fontSize: scaleFont(typography.fontSize.sm) },
                                    ]}
                                >
                                    {errorMessage}
                                </Text>
                            </View>
                        ) : null}
                    </ScrollView>

                    <View style={styles.footer}>
                        <Button
                            title={secondaryActionLabel}
                            variant="secondary"
                            onPress={handleClose}
                            disabled={loading}
                            containerStyle={styles.actionButton}
                        />
                        <Button
                            title={submitLabel}
                            onPress={handleSubmit}
                            loading={loading}
                            containerStyle={styles.actionButton}
                        />
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const createStyles = (colors: any) =>
    StyleSheet.create({
        overlay: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: spacing.lg,
        },
        backdrop: {
            ...StyleSheet.absoluteFillObject,
            backgroundColor: colors.overlay,
        },
        card: {
            width: '100%',
            maxWidth: 440,
            maxHeight: '88%',
            borderRadius: borderRadius.xl,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surfaceCard,
            overflow: 'hidden',
        },
        header: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            paddingHorizontal: spacing.xl,
            paddingTop: spacing.xl,
            paddingBottom: spacing.base,
            borderBottomWidth: 1,
            borderBottomColor: withSavingsAlpha(colors.textPrimary, 0.08),
        },
        headerCopy: {
            flex: 1,
            marginRight: spacing.base,
        },
        closeButton: {
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.surfaceElevated,
            borderWidth: 1,
            borderColor: colors.border,
        },
        title: {
            color: colors.textPrimary,
            fontWeight: typography.fontWeight.bold,
        },
        subtitle: {
            color: colors.textSecondary,
            marginTop: spacing.xs,
        },
        cardContent: {
            paddingHorizontal: spacing.xl,
            paddingTop: spacing.lg,
            paddingBottom: spacing.xl,
        },
        previewStrip: {
            borderRadius: borderRadius.lg,
            borderWidth: 1,
            padding: spacing.base,
            marginBottom: spacing.lg,
        },
        previewLabel: {
            color: colors.textSecondary,
            fontWeight: typography.fontWeight.semibold,
            marginBottom: spacing.sm,
        },
        previewRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
        },
        previewIconWrap: {
            width: 42,
            height: 42,
            borderRadius: 21,
            alignItems: 'center',
            justifyContent: 'center',
        },
        previewMainCopy: {
            flex: 1,
        },
        previewTitle: {
            color: colors.textPrimary,
            fontWeight: typography.fontWeight.semibold,
        },
        previewAmount: {
            color: colors.textSecondary,
            marginTop: spacing.xs,
        },
        previewDatePill: {
            maxWidth: '38%',
            borderRadius: borderRadius.full,
            backgroundColor: colors.surfaceCard,
            paddingHorizontal: spacing.sm,
            paddingVertical: spacing.xs + 2,
        },
        previewDateText: {
            color: colors.textPrimary,
            fontWeight: typography.fontWeight.medium,
        },
        formSection: {
            borderRadius: borderRadius.lg,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surfaceElevated,
            padding: spacing.base,
            marginBottom: spacing.base,
        },
        sectionHeader: {
            marginBottom: spacing.base,
        },
        sectionHeading: {
            color: colors.textPrimary,
            fontWeight: typography.fontWeight.semibold,
        },
        sectionHeadingSubtitle: {
            color: colors.textSecondary,
            marginTop: spacing.xs,
        },
        personalizeToggle: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderRadius: borderRadius.lg,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surfaceCard,
            paddingHorizontal: spacing.base,
            paddingVertical: spacing.base,
        },
        personalizeCopy: {
            flex: 1,
            marginRight: spacing.base,
        },
        personalizeTitle: {
            color: colors.textPrimary,
            fontWeight: typography.fontWeight.semibold,
        },
        personalizeSubtitle: {
            color: colors.textSecondary,
            marginTop: spacing.xs,
        },
        personalizationPanel: {
            marginTop: spacing.base,
            borderRadius: borderRadius.lg,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surfaceElevated,
            padding: spacing.base,
        },
        field: {
            marginBottom: spacing.base,
        },
        fieldNoGap: {
            marginBottom: 0,
        },
        currencySign: {
            color: colors.textPrimary,
            fontSize: typography.fontSize.base,
            fontWeight: typography.fontWeight.semibold,
        },
        sectionLabel: {
            color: colors.textSecondary,
            fontWeight: typography.fontWeight.medium,
            marginBottom: spacing.sm,
            marginLeft: spacing.xs,
        },
        selectorButton: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: borderRadius.md,
            paddingHorizontal: spacing.base,
            paddingVertical: spacing.base,
        },
        selectorContent: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            flex: 1,
            marginRight: spacing.sm,
        },
        selectorText: {
            color: colors.textPrimary,
            flexShrink: 1,
        },
        selectorPlaceholder: {
            color: colors.textMuted,
        },
        dateHelperRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: spacing.sm,
            marginTop: spacing.xs,
        },
        dateHelperText: {
            flex: 1,
            color: colors.textMuted,
        },
        iosPickerWrap: {
            marginTop: spacing.sm,
            borderRadius: borderRadius.lg,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
        },
        iconOptions: {
            gap: spacing.sm,
        },
        iconOption: {
            width: 46,
            height: 46,
            borderRadius: borderRadius.md,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
        },
        optionCheckBadge: {
            position: 'absolute',
            top: 4,
            right: 4,
            width: 16,
            height: 16,
            borderRadius: 8,
            alignItems: 'center',
            justifyContent: 'center',
        },
        colorOptions: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: spacing.sm,
        },
        colorOption: {
            width: 34,
            height: 34,
            borderRadius: borderRadius.full,
            borderWidth: 1,
            alignItems: 'center',
            justifyContent: 'center',
        },
        colorOptionSelected: {
            borderWidth: 2,
        },
        errorCard: {
            borderRadius: borderRadius.lg,
            borderWidth: 1,
            borderColor: 'rgba(239, 68, 68, 0.24)',
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            paddingHorizontal: spacing.base,
            paddingVertical: spacing.sm,
            marginTop: spacing.base,
        },
        serverError: {
            color: colors.error,
        },
        footer: {
            flexDirection: 'row',
            gap: spacing.sm,
            paddingHorizontal: spacing.xl,
            paddingTop: spacing.base,
            paddingBottom: spacing.xl,
            borderTopWidth: 1,
            borderTopColor: withSavingsAlpha(colors.textPrimary, 0.08),
            backgroundColor: colors.surfaceCard,
        },
        actionButton: {
            flex: 1,
        },
    });
