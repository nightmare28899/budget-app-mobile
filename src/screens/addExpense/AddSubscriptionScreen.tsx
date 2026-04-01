import React, { useMemo, useState } from 'react';
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
import { CurrencySelector } from '../../components/ui/CurrencySelector';
import { CreditCardSelector } from '../../components/ui/CreditCardSelector';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { PaymentMethodSelector } from '../../components/ui/PaymentMethodSelector';
import {
    type QuickSubscriptionPresetGroup,
    withAlpha,
} from '../../utils/subscriptions';
import {
    getPaymentMethodOption,
    isCreditCardPaymentMethod,
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
    QUICK_SUBSCRIPTION_PRESET_GROUPS,
    BILLING_CYCLE_OPTIONS,
} from '../../hooks/useSubscriptionForm';
import { getCurrencyLocale, getCurrencySymbol } from '../../utils/currency';
import { useScrollToFocusedInput } from '../../hooks/useScrollToFocusedInput';
import { formatCreditCardLabel } from '../../utils/creditCards';
import { useAppAccess } from '../../hooks/useAppAccess';
import { usePremiumAccess } from '../../hooks/usePremiumAccess';

const SUBSCRIPTION_GROUP_LABEL_KEYS: Record<
    QuickSubscriptionPresetGroup,
    | 'subscriptions.groupStreaming'
    | 'subscriptions.groupCloud'
    | 'subscriptions.groupWork'
    | 'subscriptions.groupGaming'
    | 'subscriptions.groupLifestyle'
    | 'subscriptions.groupOther'
> = {
    streaming: 'subscriptions.groupStreaming',
    cloud: 'subscriptions.groupCloud',
    work: 'subscriptions.groupWork',
    gaming: 'subscriptions.groupGaming',
    lifestyle: 'subscriptions.groupLifestyle',
    other: 'subscriptions.groupOther',
};

export function AddSubscriptionScreen({
    route,
    navigation,
}: RootScreenProps<'AddSubscription'>) {
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);
    const insets = useSafeAreaInsets();
    const isEmbedded = route.params?.embedded === true;
    const { t, language } = useI18n();
    const { hasPremium } = useAppAccess();
    const { requirePremiumAccess } = usePremiumAccess();
    const locale = getCurrencyLocale(language);
    const {
        horizontalPadding,
        contentMaxWidth,
        isSmallPhone,
        scaleFont,
    } = useResponsive();
    const { scrollRef, createScrollOnFocusHandler } = useScrollToFocusedInput(120);

    const {
        name,
        setName,
        cost,
        onChangeCost,
        currency,
        setCurrency,
        paymentMethod,
        setPaymentMethod,
        selectedCreditCardId,
        setSelectedCreditCardId,
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
        creditCards,
        creditCardsLoading,
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
    const currencySymbol = getCurrencySymbol(currency, locale);
    const [presetQuery, setPresetQuery] = useState('');
    const normalizedQuery = presetQuery.trim().toLowerCase();
    const initialPresetGroup = selectedPresetId
        ? QUICK_SUBSCRIPTION_PRESETS.find((preset) => preset.id === selectedPresetId)?.group
            ?? QUICK_SUBSCRIPTION_PRESET_GROUPS[0]
        : QUICK_SUBSCRIPTION_PRESET_GROUPS[0];
    const [selectedPresetGroup, setSelectedPresetGroup] =
        useState<QuickSubscriptionPresetGroup>(initialPresetGroup);
    const filteredPresets = normalizedQuery.length
        ? QUICK_SUBSCRIPTION_PRESETS.filter((preset) =>
            preset.name.toLowerCase().includes(normalizedQuery),
        )
        : QUICK_SUBSCRIPTION_PRESETS;
    const presetSections = useMemo(
        () =>
            QUICK_SUBSCRIPTION_PRESET_GROUPS
                .map((group) => ({
                    group,
                    title: t(SUBSCRIPTION_GROUP_LABEL_KEYS[group]),
                    items: filteredPresets.filter((preset) => preset.group === group),
                }))
                .filter((section) => section.items.length > 0),
        [filteredPresets, t],
    );
    const activePresetSection = useMemo(
        () =>
            presetSections.find((section) => section.group === selectedPresetGroup)
            ?? presetSections[0]
            ?? null,
        [presetSections, selectedPresetGroup],
    );
    const paymentMethodOption = getPaymentMethodOption(paymentMethod);
    const paymentMethodLabel = paymentMethodOption
        ? t(paymentMethodOption.labelKey)
        : t('paymentMethod.none');
    const paymentMethodIcon = paymentMethodOption?.icon ?? PAYMENT_METHOD_FALLBACK_ICON;
    const selectedCreditCard = creditCards.find((item) => item.id === selectedCreditCardId) ?? null;
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
                    ref={scrollRef}
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
                    <View style={styles.amountBlock}>
                        <View style={styles.amountContainer}>
                            <Text
                                style={[
                                    styles.currencySign,
                                    { fontSize: scaleFont(typography.fontSize['3xl']) },
                                ]}
                            >
                                {currencySymbol}
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

                    <Input
                        label={t('addSubscription.namePlaceholder')}
                        placeholder={t('addSubscription.namePlaceholder')}
                        value={name}
                        onChangeText={setName}
                        onFocus={createScrollOnFocusHandler()}
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
                        <Text
                            style={[
                                styles.quickPickHint,
                                { fontSize: scaleFont(typography.fontSize.xs) },
                            ]}
                        >
                            {t('addSubscription.quickPickHint')}
                        </Text>
                        <View style={styles.quickPickSearchWrap}>
                            <Icon name="search-outline" size={20} color={colors.textMuted} style={styles.quickPickSearchIcon} />
                            <Input
                                value={presetQuery}
                                onChangeText={setPresetQuery}
                                placeholder={t('subscriptions.searchPlaceholder')}
                                onFocus={createScrollOnFocusHandler(148)}
                                containerStyle={styles.quickPickSearch}
                                inputStyle={styles.quickPickSearchInput}
                            />
                        </View>
                        {presetSections.length === 0 ? (
                            <Text
                                style={[
                                    styles.quickPickEmpty,
                                    { fontSize: scaleFont(typography.fontSize.xs) },
                                ]}
                            >
                                {t('subscriptions.searchEmpty')}
                            </Text>
                        ) : (
                            <View style={styles.quickPickBrowser}>
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={styles.quickPickCategoryRailContent}
                                    style={styles.quickPickCategoryRail}
                                >
                                    {presetSections.map((section) => {
                                        const isActive = activePresetSection?.group === section.group;

                                        return (
                                            <TouchableOpacity
                                                key={section.group}
                                                style={[
                                                    styles.quickPickCategoryChip,
                                                    isActive ? styles.quickPickCategoryChipActive : null,
                                                ]}
                                                activeOpacity={0.86}
                                                onPress={() => setSelectedPresetGroup(section.group)}
                                            >
                                                <Text
                                                    style={[
                                                        styles.quickPickCategoryChipText,
                                                        isActive
                                                            ? styles.quickPickCategoryChipTextActive
                                                            : null,
                                                        { fontSize: scaleFont(typography.fontSize.xs) },
                                                    ]}
                                                    numberOfLines={1}
                                                >
                                                    {section.title}
                                                </Text>
                                                <View
                                                    style={[
                                                        styles.quickPickCategoryCountBadge,
                                                        isActive
                                                            ? styles.quickPickCategoryCountBadgeActive
                                                            : null,
                                                    ]}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.quickPickCategoryCountText,
                                                            isActive
                                                                ? styles.quickPickCategoryCountTextActive
                                                                : null,
                                                            { fontSize: scaleFont(typography.fontSize.xs) },
                                                        ]}
                                                    >
                                                        {section.items.length}
                                                    </Text>
                                                </View>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>

                                {activePresetSection ? (
                                    <View style={styles.quickPickSectionCard}>
                                        <View style={styles.quickPickSectionHeader}>
                                            <Text
                                                style={[
                                                    styles.quickPickSectionTitle,
                                                    { fontSize: scaleFont(typography.fontSize.xs) },
                                                ]}
                                            >
                                                {activePresetSection.title}
                                            </Text>
                                            <View style={styles.quickPickCountBadge}>
                                                <Text
                                                    style={[
                                                        styles.quickPickCountText,
                                                        { fontSize: scaleFont(typography.fontSize.xs) },
                                                    ]}
                                                >
                                                    {activePresetSection.items.length}
                                                </Text>
                                            </View>
                                        </View>

                                        <ScrollView
                                            nestedScrollEnabled
                                            showsVerticalScrollIndicator={false}
                                            style={[
                                                styles.quickPickListScroll,
                                                isSmallPhone
                                                    ? styles.quickPickListScrollCompact
                                                    : styles.quickPickListScrollRegular,
                                            ]}
                                            contentContainerStyle={styles.quickPickListScrollContent}
                                        >
                                            <View style={styles.quickPickCardGrid}>
                                                {activePresetSection.items.map((preset) => {
                                                    const selected = selectedPresetId === preset.id;

                                                    return (
                                                        <TouchableOpacity
                                                            key={preset.id}
                                                            style={[
                                                                styles.quickPickCard,
                                                                selected ? styles.quickPickCardActive : null,
                                                                {
                                                                    backgroundColor: selected
                                                                        ? withAlpha(preset.color, 0.18)
                                                                        : colors.surfaceElevated,
                                                                    borderColor: selected
                                                                        ? withAlpha(preset.color, 0.72)
                                                                        : colors.border,
                                                                },
                                                            ]}
                                                            onPress={() => onPickPreset(preset.id)}
                                                            activeOpacity={0.86}
                                                        >
                                                            <View
                                                                style={[
                                                                    styles.quickPickCardIconWrap,
                                                                    {
                                                                        backgroundColor: withAlpha(
                                                                            preset.color,
                                                                            selected ? 0.22 : 0.12,
                                                                        ),
                                                                        borderColor: withAlpha(
                                                                            preset.color,
                                                                            selected ? 0.5 : 0.22,
                                                                        ),
                                                                    },
                                                                ]}
                                                            >
                                                                <Icon
                                                                    name={preset.icon}
                                                                    size={18}
                                                                    color={selected ? colors.textPrimary : preset.color}
                                                                />
                                                            </View>
                                                            <View style={styles.quickPickCardCopy}>
                                                                <Text
                                                                    style={[
                                                                        styles.quickPickCardTitle,
                                                                        { fontSize: scaleFont(typography.fontSize.sm) },
                                                                    ]}
                                                                    numberOfLines={2}
                                                                >
                                                                    {preset.name}
                                                                </Text>
                                                            </View>
                                                            <Icon
                                                                name={selected ? 'checkmark-circle' : 'chevron-forward'}
                                                                size={selected ? 18 : 16}
                                                                color={
                                                                    selected
                                                                        ? preset.color
                                                                        : colors.textMuted
                                                                }
                                                            />
                                                        </TouchableOpacity>
                                                    );
                                                })}
                                            </View>
                                        </ScrollView>
                                    </View>
                                ) : null}
                            </View>
                        )}
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
                        {selectedCreditCard ? (
                            <View style={styles.previewBadge}>
                                <Icon
                                    name="card-outline"
                                    size={16}
                                    color={colors.primaryLight}
                                />
                                <Text
                                    style={[
                                        styles.previewValue,
                                        { fontSize: scaleFont(typography.fontSize.xs) },
                                    ]}
                                >
                                    {formatCreditCardLabel(selectedCreditCard)}
                                </Text>
                            </View>
                        ) : null}
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
    quickPickHint: {
        color: colors.textMuted,
        lineHeight: 18,
        marginTop: -2,
        marginBottom: spacing.sm,
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
    quickPickBrowser: {
        gap: spacing.base,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.xl,
        backgroundColor: colors.surfaceCard,
        padding: spacing.base,
    },
    quickPickCategoryRail: {
        marginHorizontal: -spacing.xs,
    },
    quickPickCategoryRailContent: {
        paddingHorizontal: spacing.xs,
        gap: spacing.sm,
    },
    quickPickCategoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.full,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surfaceElevated,
    },
    quickPickCategoryChipActive: {
        backgroundColor: withAlpha(colors.primaryAction, 0.2),
        borderColor: withAlpha(colors.primaryAction, 0.56),
    },
    quickPickCategoryChipText: {
        color: colors.textSecondary,
        fontWeight: typography.fontWeight.semibold,
    },
    quickPickCategoryChipTextActive: {
        color: colors.textPrimary,
    },
    quickPickCategoryCountBadge: {
        minWidth: 24,
        paddingHorizontal: spacing.xs,
        paddingVertical: 2,
        borderRadius: borderRadius.full,
        backgroundColor: colors.background,
        alignItems: 'center',
        justifyContent: 'center',
    },
    quickPickCategoryCountBadgeActive: {
        backgroundColor: withAlpha(colors.primaryAction, 0.26),
    },
    quickPickCategoryCountText: {
        color: colors.textMuted,
        fontWeight: typography.fontWeight.bold,
    },
    quickPickCategoryCountTextActive: {
        color: colors.textPrimary,
    },
    blockTitle: {
        color: colors.textSecondary,
        fontWeight: typography.fontWeight.semibold,
        marginBottom: spacing.sm,
    },
    quickPickSections: {
        gap: spacing.base,
    },
    quickPickSection: {
        gap: spacing.sm,
    },
    quickPickSectionCard: {
        gap: spacing.sm,
    },
    quickPickSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    quickPickSectionTitle: {
        color: colors.textMuted,
        fontWeight: typography.fontWeight.semibold,
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    quickPickCountBadge: {
        minWidth: 28,
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: borderRadius.full,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surfaceElevated,
        alignItems: 'center',
        justifyContent: 'center',
    },
    quickPickCountText: {
        color: colors.textMuted,
        fontWeight: typography.fontWeight.semibold,
    },
    quickPickCardGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    quickPickListScroll: {
        minHeight: 72,
    },
    quickPickListScrollCompact: {
        maxHeight: 208,
    },
    quickPickListScrollRegular: {
        maxHeight: 276,
    },
    quickPickListScrollContent: {
        paddingRight: spacing.xs,
    },
    quickPickCard: {
        flexBasis: 148,
        flexGrow: 1,
        borderWidth: 1,
        borderRadius: borderRadius.xl,
        paddingHorizontal: spacing.base,
        paddingVertical: spacing.base,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        minHeight: 64,
    },
    quickPickCardActive: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
        elevation: 2,
    },
    quickPickCardIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    quickPickCardCopy: {
        flex: 1,
    },
    quickPickCardTitle: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.semibold,
        lineHeight: 18,
    },
    quickPickEmpty: {
        color: colors.textMuted,
        marginTop: spacing.sm,
    },
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
