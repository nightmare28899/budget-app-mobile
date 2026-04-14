import React, { useMemo, useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootScreenProps } from '../../navigation/types';
import { AnimatedScreen } from '../../components/ui/primitives/AnimatedScreen';
import { HomeBackground } from '../../components/ui/layout/HomeBackground';
import { ScreenBackButton } from '../../components/ui/primitives/ScreenBackButton';
import { Button } from '../../components/ui/primitives/Button';
import { Input } from '../../components/ui/primitives/Input';
import { useScrollToFocusedInput } from '../../hooks/useScrollToFocusedInput';
import { useCreditCardsCatalog } from '../../hooks/useCreditCardsCatalog';
import { useAppAlert } from '../../components/alerts/AlertProvider';
import { useI18n } from '../../hooks/useI18n';
import {
    CREDIT_CARD_BRAND_OPTIONS,
    CREDIT_CARD_COLOR_OPTIONS,
} from '../../utils/domain/creditCards';
import {
    borderRadius,
    spacing,
    typography,
    useResponsive,
    useTheme,
    useThemedStyles,
    SemanticColors,
} from '../../theme/index';
import { sanitizeMoneyInput } from '../../utils/platform/moneyInput';
import { useAppAccess } from '../../hooks/useAppAccess';
import { PremiumFeatureGate } from '../../components/premium/PremiumFeatureGate';

function digitsOnly(value: string) {
    return value.replace(/\D+/g, '');
}

export function CreditCardFormScreen({
    route,
    navigation,
}: RootScreenProps<'CreditCardForm'>) {
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);
    const insets = useSafeAreaInsets();
    const { t } = useI18n();
    const { alert } = useAppAlert();
    const { hasPremium } = useAppAccess();
    const {
        horizontalPadding,
        contentMaxWidth,
        scaleFont,
    } = useResponsive();
    const { scrollRef, createScrollOnFocusHandler } = useScrollToFocusedInput(120);
    const {
        createCard,
        updateCard,
        isCreating,
        isUpdating,
    } = useCreditCardsCatalog({ includeInactive: true, enabled: false });

    const editingCard = route.params?.card;
    const isEditMode = Boolean(editingCard?.id);
    const [name, setName] = useState(editingCard?.name ?? '');
    const [bank, setBank] = useState(editingCard?.bank ?? '');
    const [brand, setBrand] = useState(editingCard?.brand ?? 'VISA');
    const [last4, setLast4] = useState(editingCard?.last4 ?? '');
    const [color, setColor] = useState(editingCard?.color ?? CREDIT_CARD_COLOR_OPTIONS[0]);
    const [creditLimit, setCreditLimit] = useState(
        editingCard?.creditLimit != null ? String(editingCard.creditLimit) : '',
    );
    const [closingDay, setClosingDay] = useState(
        editingCard?.closingDay != null ? String(editingCard.closingDay) : '',
    );
    const [paymentDueDay, setPaymentDueDay] = useState(
        editingCard?.paymentDueDay != null ? String(editingCard.paymentDueDay) : '',
    );
    const [isActive, setIsActive] = useState(editingCard?.isActive ?? true);

    const screenTitle = useMemo(
        () => t(isEditMode ? 'creditCards.editTitle' : 'creditCards.addTitle'),
        [isEditMode, t],
    );

    if (!hasPremium && !isEditMode) {
        return (
            <PremiumFeatureGate
                feature="credit_cards"
                onClose={() => navigation.goBack()}
                onContinueToAuth={() => navigation.navigate('Auth', { screen: 'Login' })}
            />
        );
    }

    const parseOptionalInt = (value: string): number | null => {
        const normalized = digitsOnly(value);
        if (!normalized) {
            return null;
        }

        const parsed = Number(normalized);
        return Number.isFinite(parsed) ? parsed : null;
    };

    const onSave = async () => {
        const normalizedLast4 = digitsOnly(last4).slice(-4);
        const parsedLimit = creditLimit.trim() ? Number(creditLimit) : null;
        const parsedClosingDay = parseOptionalInt(closingDay);
        const parsedPaymentDueDay = parseOptionalInt(paymentDueDay);

        if (!name.trim()) {
            alert(t('common.error'), t('creditCards.validationName'));
            return;
        }
        if (!bank.trim()) {
            alert(t('common.error'), t('creditCards.validationBank'));
            return;
        }
        if (!brand.trim()) {
            alert(t('common.error'), t('creditCards.validationBrand'));
            return;
        }
        if (normalizedLast4.length !== 4) {
            alert(t('common.error'), t('creditCards.validationLast4'));
            return;
        }
        if (parsedLimit != null && (!Number.isFinite(parsedLimit) || parsedLimit < 0)) {
            alert(t('common.error'), t('creditCards.validationLimit'));
            return;
        }
        if (parsedClosingDay != null && (parsedClosingDay < 1 || parsedClosingDay > 31)) {
            alert(t('common.error'), t('creditCards.validationClosingDay'));
            return;
        }
        if (parsedPaymentDueDay != null && (parsedPaymentDueDay < 1 || parsedPaymentDueDay > 31)) {
            alert(t('common.error'), t('creditCards.validationDueDay'));
            return;
        }

        const payload = {
            name: name.trim(),
            bank: bank.trim(),
            brand: brand.trim().toUpperCase(),
            last4: normalizedLast4,
            color,
            creditLimit: parsedLimit,
            closingDay: parsedClosingDay,
            paymentDueDay: parsedPaymentDueDay,
            isActive,
        };

        try {
            if (editingCard?.id) {
                await updateCard(editingCard.id, payload);
            } else {
                await createCard(payload);
            }

            navigation.goBack();
        } catch {
            return;
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
        >
            <HomeBackground />
            <AnimatedScreen style={styles.flex1} delay={20}>
                <View
                    style={[
                        styles.header,
                        {
                            paddingTop: insets.top + spacing.base,
                            paddingHorizontal: horizontalPadding,
                        },
                        contentMaxWidth
                            ? { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }
                            : null,
                    ]}
                >
                    <View style={styles.headerRow}>
                        <ScreenBackButton onPress={() => navigation.goBack()} />
                        <View style={styles.headerTextWrap}>
                            <Text
                                style={[
                                    styles.headerTitle,
                                    { fontSize: scaleFont(typography.fontSize['2xl']) },
                                ]}
                            >
                                {screenTitle}
                            </Text>
                            <Text
                                style={[
                                    styles.headerSubtitle,
                                    { fontSize: scaleFont(typography.fontSize.md) },
                                ]}
                            >
                                {t('creditCards.formSubtitle')}
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
                            paddingBottom: insets.bottom + spacing['4xl'],
                        },
                        contentMaxWidth
                            ? { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }
                            : null,
                    ]}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.previewCard}>
                        <View style={styles.previewTopRow}>
                            <Text
                                style={[
                                    styles.previewBank,
                                    { fontSize: scaleFont(typography.fontSize.sm) },
                                ]}
                            >
                                {bank.trim() || t('creditCards.bank')}
                            </Text>
                            <View
                                style={[
                                    styles.previewBrandPill,
                                    { backgroundColor: color || colors.primaryAction },
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.previewBrandText,
                                        { fontSize: scaleFont(typography.fontSize.xs) },
                                    ]}
                                >
                                    {brand.trim() || 'CARD'}
                                </Text>
                            </View>
                        </View>
                        <Text
                            style={[
                                styles.previewName,
                                { fontSize: scaleFont(typography.fontSize.xl) },
                            ]}
                        >
                            {name.trim() || t('creditCards.previewName')}
                        </Text>
                        <Text
                            style={[
                                styles.previewDigits,
                                { fontSize: scaleFont(typography.fontSize.lg) },
                            ]}
                        >
                            •••• {digitsOnly(last4).slice(-4) || '0000'}
                        </Text>
                    </View>

                    <Input
                        label={t('creditCards.name')}
                        placeholder={t('creditCards.namePlaceholder')}
                        value={name}
                        onChangeText={setName}
                        onFocus={createScrollOnFocusHandler()}
                        containerStyle={styles.fieldContainer}
                    />

                    <Input
                        label={t('creditCards.bank')}
                        placeholder={t('creditCards.bankPlaceholder')}
                        value={bank}
                        onChangeText={setBank}
                        onFocus={createScrollOnFocusHandler(60)}
                        containerStyle={styles.fieldContainer}
                    />

                    <View style={styles.fieldContainer}>
                        <Text
                            style={[
                                styles.label,
                                { fontSize: scaleFont(typography.fontSize.sm) },
                            ]}
                        >
                            {t('creditCards.brand')}
                        </Text>
                        <View style={styles.choiceRow}>
                            {CREDIT_CARD_BRAND_OPTIONS.map((option) => {
                                const selected = brand === option;
                                return (
                                    <TouchableOpacity
                                        key={option}
                                        style={[
                                            styles.choiceChip,
                                            selected ? styles.choiceChipActive : null,
                                        ]}
                                        activeOpacity={0.84}
                                        onPress={() => setBrand(option)}
                                    >
                                        <Text
                                            style={[
                                                styles.choiceChipText,
                                                selected ? styles.choiceChipTextActive : null,
                                                { fontSize: scaleFont(typography.fontSize.xs) },
                                            ]}
                                        >
                                            {option}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    <Input
                        label={t('creditCards.last4')}
                        placeholder="1234"
                        keyboardType="number-pad"
                        maxLength={4}
                        value={last4}
                        onChangeText={(value) => setLast4(digitsOnly(value).slice(0, 4))}
                        onFocus={createScrollOnFocusHandler(120)}
                        containerStyle={styles.fieldContainer}
                    />

                    <Input
                        label={t('creditCards.limit')}
                        placeholder={t('common.amountPlaceholder')}
                        keyboardType="decimal-pad"
                        value={creditLimit}
                        onChangeText={(value) => setCreditLimit(sanitizeMoneyInput(value))}
                        onFocus={createScrollOnFocusHandler(160)}
                        containerStyle={styles.fieldContainer}
                    />

                    <View style={styles.inlineFields}>
                        <Input
                            label={t('creditCards.closingDay')}
                            placeholder="25"
                            keyboardType="number-pad"
                            value={closingDay}
                            onChangeText={(value) => setClosingDay(digitsOnly(value).slice(0, 2))}
                            onFocus={createScrollOnFocusHandler(200)}
                            containerStyle={[styles.fieldContainer, styles.inlineField]}
                        />
                        <Input
                            label={t('creditCards.paymentDueDay')}
                            placeholder="12"
                            keyboardType="number-pad"
                            value={paymentDueDay}
                            onChangeText={(value) => setPaymentDueDay(digitsOnly(value).slice(0, 2))}
                            onFocus={createScrollOnFocusHandler(200)}
                            containerStyle={[styles.fieldContainer, styles.inlineField]}
                        />
                    </View>

                    <View style={styles.fieldContainer}>
                        <Text
                            style={[
                                styles.label,
                                { fontSize: scaleFont(typography.fontSize.sm) },
                            ]}
                        >
                            {t('creditCards.color')}
                        </Text>
                        <View style={styles.colorRow}>
                            {CREDIT_CARD_COLOR_OPTIONS.map((option) => {
                                const selected = color === option;
                                return (
                                    <TouchableOpacity
                                        key={option}
                                        style={[
                                            styles.colorOption,
                                            { backgroundColor: option },
                                            selected ? styles.colorOptionSelected : null,
                                        ]}
                                        activeOpacity={0.84}
                                        onPress={() => setColor(option)}
                                    />
                                );
                            })}
                        </View>
                    </View>

                    <View style={styles.fieldContainer}>
                        <Text
                            style={[
                                styles.label,
                                { fontSize: scaleFont(typography.fontSize.sm) },
                            ]}
                        >
                            {t('creditCards.status')}
                        </Text>
                        <View style={styles.choiceRow}>
                            {[
                                {
                                    key: 'active',
                                    value: true,
                                    labelKey: 'creditCards.active' as const,
                                },
                                {
                                    key: 'inactive',
                                    value: false,
                                    labelKey: 'creditCards.inactive' as const,
                                },
                            ].map((option) => {
                                const selected = isActive === option.value;
                                return (
                                    <TouchableOpacity
                                        key={option.key}
                                        style={[
                                            styles.choiceChip,
                                            selected ? styles.choiceChipActive : null,
                                        ]}
                                        activeOpacity={0.84}
                                        onPress={() => setIsActive(option.value)}
                                    >
                                        <Text
                                            style={[
                                                styles.choiceChipText,
                                                selected ? styles.choiceChipTextActive : null,
                                                { fontSize: scaleFont(typography.fontSize.sm) },
                                            ]}
                                        >
                                            {t(option.labelKey)}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    <Button
                        title={t(isEditMode ? 'creditCards.saveChanges' : 'creditCards.save')}
                        onPress={onSave}
                        loading={isCreating || isUpdating}
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
    header: {
        paddingBottom: spacing.base,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    headerTextWrap: {
        flex: 1,
    },
    headerTitle: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.bold,
    },
    headerSubtitle: {
        color: colors.textSecondary,
        marginTop: spacing.xs,
    },
    content: {
        paddingBottom: spacing['4xl'],
    },
    previewCard: {
        backgroundColor: colors.surfaceCard,
        borderRadius: borderRadius.xl,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.lg,
        gap: spacing.sm,
        marginBottom: spacing.lg,
    },
    previewTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    previewBank: {
        color: colors.textSecondary,
        fontWeight: typography.fontWeight.semibold,
    },
    previewBrandPill: {
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.full,
    },
    previewBrandText: {
        color: '#FFFFFF',
        fontWeight: typography.fontWeight.bold,
    },
    previewName: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.bold,
    },
    previewDigits: {
        color: colors.textSecondary,
        letterSpacing: 2,
    },
    fieldContainer: {
        marginBottom: spacing.lg,
    },
    label: {
        color: colors.textSecondary,
        fontWeight: typography.fontWeight.medium,
        marginBottom: spacing.sm,
        marginLeft: spacing.xs,
    },
    choiceRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    choiceChip: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.full,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surfaceElevated,
    },
    choiceChipActive: {
        borderColor: colors.primaryLight,
        backgroundColor: `${colors.primaryAction}18`,
    },
    choiceChipText: {
        color: colors.textSecondary,
        fontWeight: typography.fontWeight.semibold,
    },
    choiceChipTextActive: {
        color: colors.primaryLight,
    },
    inlineFields: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    inlineField: {
        flex: 1,
    },
    colorRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    colorOption: {
        width: 34,
        height: 34,
        borderRadius: borderRadius.full,
        borderWidth: 1,
        borderColor: colors.surface,
    },
    colorOptionSelected: {
        borderColor: colors.textPrimary,
        borderWidth: 2,
    },
    saveButton: {
        marginTop: spacing.base,
    },
});
