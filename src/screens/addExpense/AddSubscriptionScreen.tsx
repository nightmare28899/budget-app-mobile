import React, { useState } from 'react';
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
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { RootScreenProps } from '../../navigation/types';
import { AnimatedScreen } from '../../components/ui/AnimatedScreen';
import { HomeBackground } from '../../components/ui/HomeBackground';
import { ScreenBackButton } from '../../components/ui/ScreenBackButton';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { PaymentMethodSelector } from '../../components/ui/PaymentMethodSelector';
import { withAlpha } from '../../utils/subscriptions';
import {
    getPaymentMethodOption,
    PAYMENT_METHOD_FALLBACK_ICON,
} from '../../utils/paymentMethod';
import {
    spacing,
    typography,
    borderRadius,
    useResponsive,
    useTheme,
    useThemedStyles,
} from '../../theme';
import { useI18n } from '../../hooks/useI18n';
import {
    useSubscriptionForm,
    QUICK_SUBSCRIPTION_PRESETS,
    BILLING_CYCLE_OPTIONS,
} from '../../hooks/useSubscriptionForm';

export function AddSubscriptionScreen({
    route,
    navigation,
}: RootScreenProps<'AddSubscription'>) {
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);
    const insets = useSafeAreaInsets();
    const isEmbedded = route.params?.embedded === true;
    const { t } = useI18n();
    const {
        horizontalPadding,
        contentMaxWidth,
        isSmallPhone,
        scaleFont,
    } = useResponsive();

    const {
        name,
        setName,
        cost,
        onChangeCost,
        paymentMethod,
        setPaymentMethod,
        chargeDateLabel,
        serviceColor,
        serviceIcon,
        selectedPresetId,
        billingCycle,
        setBillingCycle,
        showIosPicker,
        isEditMode,
        isCreating,
        isUpdating,
        isRemoving,
        onChangeDate,
        openDatePicker,
        onPickPreset,
        onSave,
        onDelete,
        parseDateOrToday,
        chargeDate,
    } = useSubscriptionForm({
        navigation,
        editingSubscription: route.params?.subscription,
        embedded: isEmbedded,
    });
    const [presetQuery, setPresetQuery] = useState('');
    const normalizedQuery = presetQuery.trim().toLowerCase();
    const filteredPresets = normalizedQuery.length
        ? QUICK_SUBSCRIPTION_PRESETS.filter((preset) =>
            preset.name.toLowerCase().includes(normalizedQuery),
        )
        : QUICK_SUBSCRIPTION_PRESETS;
    const paymentMethodOption = getPaymentMethodOption(paymentMethod);
    const paymentMethodLabel = paymentMethodOption
        ? (t(paymentMethodOption.labelKey as any) || paymentMethodOption.fallback)
        : (t('paymentMethod.none' as any) || 'No payment method');
    const paymentMethodIcon = paymentMethodOption?.icon ?? PAYMENT_METHOD_FALLBACK_ICON;

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? (isEmbedded ? 0 : insets.top) : 0}
        >
            <HomeBackground />
            <AnimatedScreen style={styles.flex1} delay={10} duration={240} travelY={8}>
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
                        {isEditMode && (
                            <ScreenBackButton
                                onPress={() => navigation.goBack()}
                                containerStyle={styles.backButton}
                            />
                        )}
                        <View
                            style={[
                                styles.headerTextWrap,
                                isEditMode ? styles.headerTextWrapWithBack : null,
                            ]}
                        >
                            <Text
                                style={[
                                    styles.headerTitle,
                                    { fontSize: scaleFont(typography.fontSize['2xl']) },
                                ]}
                            >
                                {t(isEditMode ? 'addSubscription.editTitle' : 'addSubscription.title')}
                            </Text>
                            <Text
                                style={[
                                    styles.headerSubtitle,
                                    { fontSize: scaleFont(typography.fontSize.md) },
                                ]}
                            >
                                {t(
                                    isEditMode
                                        ? 'addSubscription.editSubtitle'
                                        : 'addSubscription.subtitle',
                                )}
                            </Text>
                        </View>
                    </View>
                </View>

                <ScrollView
                    contentContainerStyle={[
                        styles.content,
                        {
                            paddingHorizontal: horizontalPadding,
                            paddingBottom: insets.bottom + spacing.xl,
                        },
                        contentMaxWidth
                            ? { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }
                            : null,
                    ]}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    showsVerticalScrollIndicator={false}
                    automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
                >
                    <View style={styles.amountContainer}>
                        <Text
                            style={[
                                styles.currencySign,
                                { fontSize: scaleFont(typography.fontSize['3xl']) },
                            ]}
                        >
                            $
                        </Text>
                        <TextInput
                            style={[
                                styles.amountInput,
                                {
                                    fontSize: scaleFont(typography.fontSize['5xl']),
                                    lineHeight: scaleFont(typography.fontSize['5xl']),
                                    minWidth: isSmallPhone ? 120 : 140,
                                },
                            ]}
                            placeholder="0.00"
                            placeholderTextColor={colors.textMuted}
                            keyboardType="decimal-pad"
                            value={cost}
                            onChangeText={onChangeCost}
                        />
                    </View>

                    <Input
                        label={t('addSubscription.namePlaceholder')}
                        placeholder={t('addSubscription.namePlaceholder')}
                        value={name}
                        onChangeText={setName}
                        containerStyle={styles.fieldContainer}
                    />

                    <View style={styles.quickPickBlock}>
                        <Text
                            style={[
                                styles.blockTitle,
                                { fontSize: scaleFont(typography.fontSize.sm) },
                            ]}
                        >
                            {t('addSubscription.quickPick')}
                        </Text>
                        <View style={styles.quickPickSearchWrap}>
                            <Icon name="search-outline" size={20} color={colors.textMuted} style={styles.quickPickSearchIcon} />
                            <Input
                                value={presetQuery}
                                onChangeText={setPresetQuery}
                                placeholder={t('subscriptions.searchPlaceholder')}
                                containerStyle={styles.quickPickSearch}
                                inputStyle={styles.quickPickSearchInput}
                            />
                        </View>
                        <View style={styles.quickPickGrid}>
                            {filteredPresets.map((preset) => {
                                const selected = selectedPresetId === preset.id;
                                const buttonColor = selected
                                    ? withAlpha(preset.color, 0.24)
                                    : colors.surfaceElevated;

                                return (
                                    <TouchableOpacity
                                        key={preset.id}
                                        style={[
                                            styles.quickPickButton,
                                            {
                                                backgroundColor: buttonColor,
                                                borderColor: selected
                                                    ? withAlpha(preset.color, 0.75)
                                                    : colors.border,
                                            },
                                        ]}
                                        onPress={() => onPickPreset(preset.id)}
                                        activeOpacity={0.84}
                                    >
                                        <Icon
                                            name={preset.icon}
                                            size={20}
                                            color={colors.textPrimary}
                                        />
                                    </TouchableOpacity>
                                );
                            })}
                            {filteredPresets.length === 0 ? (
                                <Text
                                    style={[
                                        styles.quickPickEmpty,
                                        { fontSize: scaleFont(typography.fontSize.xs) },
                                    ]}
                                >
                                    {t('subscriptions.searchEmpty')}
                                </Text>
                            ) : null}
                        </View>
                    </View>

                    <View style={styles.fieldContainer}>
                        <Text
                            style={[
                                styles.dateLabel,
                                { fontSize: scaleFont(typography.fontSize.sm) },
                            ]}
                        >
                            {t('addSubscription.frequency')}
                        </Text>
                        <View style={styles.frequencyRow}>
                            {BILLING_CYCLE_OPTIONS.map((option) => {
                                const isActive = option.value === billingCycle;
                                return (
                                    <TouchableOpacity
                                        key={option.value}
                                        style={[
                                            styles.frequencyChip,
                                            isActive ? styles.frequencyChipActive : null,
                                        ]}
                                        activeOpacity={0.84}
                                        onPress={() => setBillingCycle(option.value)}
                                    >
                                        <Text
                                            style={[
                                                styles.frequencyChipText,
                                                isActive
                                                    ? styles.frequencyChipTextActive
                                                    : null,
                                                { fontSize: scaleFont(typography.fontSize.xs) },
                                            ]}
                                        >
                                            {t(option.labelKey)}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    <View style={styles.fieldContainer}>
                        <Text
                            style={[
                                styles.dateLabel,
                                { fontSize: scaleFont(typography.fontSize.sm) },
                            ]}
                        >
                            {t('addSubscription.chargeDate')}
                        </Text>
                        <TouchableOpacity
                            style={styles.dateButton}
                            onPress={openDatePicker}
                            activeOpacity={0.86}
                        >
                            <View style={styles.dateLeft}>
                                <Icon
                                    name="calendar-outline"
                                    size={18}
                                    color={colors.textSecondary}
                                />
                                <Text
                                    style={[
                                        styles.dateText,
                                        {
                                            fontSize: scaleFont(typography.fontSize.base),
                                        },
                                    ]}
                                >
                                    {chargeDateLabel}
                                </Text>
                            </View>
                            <Icon
                                name="chevron-down"
                                size={16}
                                color={colors.textMuted}
                            />
                        </TouchableOpacity>
                        <Text
                            style={[
                                styles.dateHint,
                                { fontSize: scaleFont(typography.fontSize.xs) },
                            ]}
                        >
                            {t('addSubscription.androidPickerHint')}
                        </Text>
                    </View>

                    <PaymentMethodSelector
                        value={paymentMethod}
                        onChange={setPaymentMethod}
                    />

                    {Platform.OS === 'ios' && showIosPicker && (
                        <DateTimePicker
                            value={parseDateOrToday(chargeDate)}
                            mode="date"
                            display="inline"
                            onChange={onChangeDate}
                            style={styles.iosPicker}
                        />
                    )}

                    <View style={styles.previewRow}>
                        <View style={styles.previewBadge}>
                            <Text
                                style={[
                                    styles.previewLabel,
                                    { fontSize: scaleFont(typography.fontSize.xs) },
                                ]}
                            >
                                {t('addSubscription.brandColor')}
                            </Text>
                            <Icon
                                name={serviceIcon}
                                size={16}
                                color={colors.textSecondary}
                            />
                            <View
                                style={[
                                    styles.previewDot,
                                    { backgroundColor: serviceColor },
                                ]}
                            />
                        </View>
                        <View style={styles.previewBadge}>
                            <Icon
                                name={paymentMethodIcon}
                                size={16}
                                color={paymentMethodOption ? colors.primaryLight : colors.textSecondary}
                            />
                            <Text
                                style={[
                                    styles.previewValue,
                                    { fontSize: scaleFont(typography.fontSize.xs) },
                                ]}
                            >
                                {paymentMethodLabel}
                            </Text>
                        </View>
                    </View>
                </ScrollView>
                <View style={[styles.stickyFooter, { paddingHorizontal: horizontalPadding, paddingBottom: isEmbedded ? spacing.lg : insets.bottom || spacing.lg }]}>
                    {isEditMode ? (
                        <Button
                            title={t('common.delete')}
                            variant="danger"
                            onPress={onDelete}
                            loading={isRemoving}
                            disabled={isCreating || isUpdating}
                            containerStyle={styles.deleteButton}
                        />
                    ) : null}
                    <Button
                        title={t(isEditMode ? 'addSubscription.update' : 'addSubscription.save')}
                        onPress={onSave}
                        loading={isCreating || isUpdating}
                        disabled={isRemoving}
                        containerStyle={styles.saveButton}
                    />
                </View>
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
        paddingBottom: spacing.base,
        backgroundColor: colors.background,
    },
    headerRow: {
        minHeight: 36,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    headerTextWrap: {
        width: '100%',
    },
    headerTextWrapWithBack: {
        paddingLeft: spacing['3xl'],
    },
    backButton: {
        position: 'absolute',
        left: 0,
        top: 0,
        zIndex: 2,
    },
    headerTitle: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.extrabold,
    },
    headerSubtitle: {
        color: colors.textSecondary,
        marginTop: spacing.xs,
    },
    content: {
        paddingBottom: spacing['5xl'],
    },
    quickPickBlock: {
        marginBottom: spacing.lg,
    },
    quickPickSearchWrap: {
        position: 'relative',
        marginBottom: spacing.sm,
    },
    quickPickSearchIcon: {
        position: 'absolute',
        left: 12,
        top: 15,
        zIndex: 1,
    },
    quickPickSearchInput: {
        paddingLeft: 40,
    },
    quickPickSearch: {
        marginBottom: 0,
    },
    blockTitle: {
        color: colors.textSecondary,
        fontWeight: typography.fontWeight.semibold,
        marginBottom: spacing.sm,
    },
    quickPickGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    quickPickButton: {
        borderWidth: 1,
        borderRadius: borderRadius.xl,
        width: 48,
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    quickPickText: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.medium,
    },
    quickPickEmpty: {
        color: colors.textMuted,
        marginTop: spacing.sm,
    },
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
    fieldContainer: {
        marginBottom: spacing.lg,
    },

    headerNameInput: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.semibold,
        minWidth: '80%',
        paddingVertical: spacing.xs,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    frequencyRow: {
        marginTop: spacing.xs,
        flexDirection: 'row',
        backgroundColor: colors.surfaceElevated,
        borderRadius: borderRadius.lg,
        padding: 4,
        gap: spacing.xs,
    },
    frequencyChip: {
        flex: 1,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.md,
        paddingVertical: spacing.sm,
        alignItems: 'center',
        justifyContent: 'center',
    },
    frequencyChipActive: {
        backgroundColor: withAlpha(colors.primaryAction, 0.22),
        borderColor: withAlpha(colors.primaryAction, 0.55),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 2,
        elevation: 2,
    },
    frequencyChipText: {
        color: colors.textSecondary,
        fontWeight: typography.fontWeight.semibold,
    },
    frequencyChipTextActive: {
        color: colors.textPrimary,
    },
    dateLabel: {
        fontSize: typography.fontSize.sm,
        color: colors.textSecondary,
        fontWeight: typography.fontWeight.medium,
        marginLeft: spacing.xs,
        marginBottom: spacing.xs,
    },
    dateButton: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.lg,
        backgroundColor: colors.surfaceElevated,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        minHeight: 52,
    },
    dateLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    dateText: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.semibold,
    },
    dateHint: {
        color: colors.textMuted,
        marginTop: spacing.xs,
        marginLeft: spacing.xs,
    },
    iosPicker: {
        marginTop: spacing.sm,
    },
    previewRow: {
        marginTop: spacing.xl,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    previewBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.full,
        backgroundColor: colors.surfaceElevated,
        borderWidth: 1,
        borderColor: colors.border,
    },
    previewLabel: {
        color: colors.textMuted,
        fontWeight: typography.fontWeight.medium,
    },
    previewValue: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.medium,
    },
    previewDot: {
        width: 16,
        height: 16,
        borderRadius: borderRadius.full,
        borderWidth: 2,
        borderColor: colors.surfaceCard,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
        elevation: 2,
    },
    stickyFooter: {
        backgroundColor: colors.background,
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    deleteButton: {
        width: '100%',
        marginBottom: spacing.sm,
    },
    saveButton: {
        width: '100%',
    },
});
