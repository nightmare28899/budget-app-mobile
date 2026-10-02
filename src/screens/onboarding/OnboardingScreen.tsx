import React, { useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usersApi } from '../../api/resources/users';
import { Button } from '../../components/ui/primitives/Button';
import { CurrencySelector } from '../../components/ui/domain/CurrencySelector';
import { Input } from '../../components/ui/primitives/Input';
import { AnimatedScreen } from '../../components/ui/primitives/AnimatedScreen';
import { useAppAlert } from '../../components/alerts/AlertProvider';
import { useI18n } from '../../hooks/shared/useI18n';
import { RootScreenProps } from '../../navigation/types';
import { useAuthStore } from '../../store/authStore';
import { usePreferencesStore } from '../../store/preferencesStore';
import { borderRadius, spacing, typography, useResponsive, useTheme, useThemedStyles, SemanticColors,
} from '../../theme/index';
import { BudgetPeriod } from '../../types/index';
import { extractApiMessage } from '../../utils/platform/api';
import { BUDGET_PERIODS, budgetLabel, normalizeBudgetPeriod } from '../../utils/domain/budget';
import { DEFAULT_CURRENCY, normalizeCurrency } from '../../utils/domain/currency';
import { toNum } from '../../utils/core/number';
import {
    MAX_COST_LABEL,
    MAX_COST_VALUE,
    sanitizeMoneyInput,
} from '../../utils/platform/moneyInput';

const TOTAL_STEPS = 2;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidIsoDate(value: string): boolean {
    if (!ISO_DATE_RE.test(value)) {
        return false;
    }

    const parsed = new Date(`${value}T00:00:00`);
    return !Number.isNaN(parsed.getTime());
}

export function OnboardingScreen({ navigation }: RootScreenProps<'Onboarding'>) {
    const styles = useThemedStyles(createStyles);
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const queryClient = useQueryClient();
    const { alert } = useAppAlert();
    const user = useAuthStore((s) => s.user);
    const setUser = useAuthStore((s) => s.setUser);
    const markOnboardingCompleted = usePreferencesStore((s) => s.markOnboardingCompleted);
    const { t, language, setLanguage } = useI18n();
    const {
        horizontalPadding,
        contentMaxWidth,
        isSmallPhone,
        scaleFont,
        scaleSize,
    } = useResponsive();
    const contentMaxWidthStyle = contentMaxWidth
        ? { maxWidth: contentMaxWidth, alignSelf: 'center' as const, width: '100%' as const }
        : null;

    const [currentStep, setCurrentStep] = useState(0);
    const [budgetAmount, setBudgetAmount] = useState(
        String(toNum(user?.budgetAmount ?? 0)),
    );
    const [preferredCurrency, setPreferredCurrency] = useState(
        normalizeCurrency(user?.currency, DEFAULT_CURRENCY),
    );
    const [budgetPeriod, setBudgetPeriod] = useState<BudgetPeriod>(
        normalizeBudgetPeriod(user?.budgetPeriod, 'monthly'),
    );
    const [budgetPeriodStart, setBudgetPeriodStart] = useState(
        typeof user?.budgetPeriodStart === 'string' ? user.budgetPeriodStart : '',
    );
    const [budgetPeriodEnd, setBudgetPeriodEnd] = useState(
        typeof user?.budgetPeriodEnd === 'string' ? user.budgetPeriodEnd : '',
    );
    const [validationMessage, setValidationMessage] = useState<string | null>(null);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const openPrivacyPolicy = () => navigation.navigate('PrivacyPolicy');

    const finishOnboarding = async (skipSetup: boolean) => {
        if (!user) {
            return false;
        }

        setValidationMessage(null);
        setSaveError(null);

        if (!skipSetup) {
            const normalizedBudgetAmount = budgetAmount.trim().replace(/,/g, '.');
            if (!normalizedBudgetAmount) {
                setValidationMessage(t('onboarding.validationBudgetAmount'));
                return false;
            }

            const parsedBudgetAmount = Number(normalizedBudgetAmount);
            if (!Number.isFinite(parsedBudgetAmount) || parsedBudgetAmount < 0) {
                setValidationMessage(t('onboarding.validationBudgetAmount'));
                return false;
            }
            if (parsedBudgetAmount > MAX_COST_VALUE) {
                setValidationMessage(
                    t('common.maxAmountExceeded', { max: MAX_COST_LABEL }),
                );
                return false;
            }

            if (budgetPeriod === 'period') {
                if (!budgetPeriodStart.trim() || !budgetPeriodEnd.trim()) {
                    setValidationMessage(t('onboarding.validationPeriodDatesRequired'));
                    return false;
                }

                if (!isValidIsoDate(budgetPeriodStart) || !isValidIsoDate(budgetPeriodEnd)) {
                    setValidationMessage(t('onboarding.validationPeriodDateFormat'));
                    return false;
                }

                if (new Date(budgetPeriodEnd) < new Date(budgetPeriodStart)) {
                    setValidationMessage(t('onboarding.validationPeriodEndBeforeStart'));
                    return false;
                }
            }

            setIsSubmitting(true);
            try {
                const updatedUser = await usersApi.updateMe({
                    budgetAmount: parsedBudgetAmount,
                    currency: preferredCurrency,
                    budgetPeriod,
                    budgetPeriodStart: budgetPeriod === 'period' ? budgetPeriodStart : undefined,
                    budgetPeriodEnd: budgetPeriod === 'period' ? budgetPeriodEnd : undefined,
                });

                setUser({
                    ...user,
                    ...updatedUser,
                });
                queryClient.setQueryData(['users', 'me'], updatedUser);
                queryClient.invalidateQueries({ queryKey: ['users', 'me'] });
            } catch (error: any) {
                setSaveError(
                    extractApiMessage(error?.response?.data)
                    || t('onboarding.saveFailed'),
                );
                setIsSubmitting(false);
                return false;
            }
            setIsSubmitting(false);
        }

        markOnboardingCompleted();
        return true;
    };

    const completeOnboardingAndRoute = async (
        target: 'guest' | 'register' | 'login',
        skipSetup = false,
    ) => {
        const completed = await finishOnboarding(skipSetup);
        if (!completed) {
            return;
        }

        if (target === 'register') {
            navigation.navigate('Auth', { screen: 'Register' });
            return;
        }

        if (target === 'login') {
            navigation.navigate('Auth', { screen: 'Login' });
        }
    };

    const openAccessChoice = (skipSetup = false) => {
        alert(
            t('onboarding.accessChoiceTitle'),
            t('onboarding.accessChoiceMessage'),
            [
                {
                    text: t('onboarding.accessChoiceGuest'),
                    style: 'cancel',
                    onPress: () => {
                        completeOnboardingAndRoute('guest', skipSetup).catch(() => {});
                    },
                },
                {
                    text: t('onboarding.accessChoiceRegister'),
                    onPress: () => {
                        completeOnboardingAndRoute('register', skipSetup).catch(() => {});
                    },
                },
                {
                    text: t('onboarding.accessChoiceLogin'),
                    onPress: () => {
                        completeOnboardingAndRoute('login', skipSetup).catch(() => {});
                    },
                },
            ],
        );
    };

    const handleContinue = async () => {
        if (currentStep < TOTAL_STEPS - 1) {
            setCurrentStep((previous) => previous + 1);
            return;
        }

        openAccessChoice();
    };

    const stepTitle = [
        t('onboarding.welcomeTitle'),
        t('onboarding.setupTitle'),
    ][currentStep];

    const stepDescription = [
        t('onboarding.welcomeDescription'),
        t('onboarding.setupDescription'),
    ][currentStep];
    const isSetupStep = currentStep === TOTAL_STEPS - 1;

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={insets.top}
        >
            <AnimatedScreen style={styles.flex1} delay={60}>
                <View
                    style={[
                        styles.header,
                        {
                            paddingTop: insets.top + spacing.base,
                            paddingHorizontal: horizontalPadding,
                        },
                        contentMaxWidthStyle,
                    ]}
                >
                    <View style={styles.stepMetaRow}>
                        <View style={styles.stepPill}>
                            <Text
                                style={[
                                    styles.stepPillText,
                                    { fontSize: scaleFont(typography.fontSize.xs) },
                                ]}
                            >
                                {t('onboarding.stepLabel', {
                                    current: currentStep + 1,
                                    total: TOTAL_STEPS,
                                })}
                            </Text>
                        </View>

                        {isSetupStep ? (
                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={() => setCurrentStep((previous) => previous - 1)}
                                disabled={isSubmitting}
                            >
                                <Text
                                    style={[
                                        styles.skipText,
                                        { fontSize: scaleFont(typography.fontSize.sm) },
                                    ]}
                                >
                                    {t('onboarding.back')}
                                </Text>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={() => openAccessChoice(true)}
                                disabled={isSubmitting}
                            >
                                <Text
                                    style={[
                                        styles.skipText,
                                        { fontSize: scaleFont(typography.fontSize.sm) },
                                    ]}
                                >
                                    {t('onboarding.skip')}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    <Text
                        style={[
                            styles.headerTitle,
                            { fontSize: scaleFont(typography.fontSize['3xl']) },
                        ]}
                    >
                        {stepTitle}
                    </Text>
                    <Text
                        style={[
                            styles.headerSubtitle,
                            { fontSize: scaleFont(typography.fontSize.base) },
                        ]}
                    >
                        {stepDescription}
                    </Text>

                    <View style={styles.progressRow}>
                        {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
                            <View
                                key={index}
                                style={[
                                    styles.progressDot,
                                    index <= currentStep ? styles.progressDotActive : null,
                                ]}
                            />
                        ))}
                    </View>
                </View>

                <ScrollView
                    contentContainerStyle={[
                        styles.content,
                        {
                            paddingHorizontal: horizontalPadding,
                            paddingBottom: insets.bottom + spacing['3xl'],
                        },
                        contentMaxWidthStyle,
                    ]}
                    keyboardShouldPersistTaps="handled"
                >
                    {currentStep === 0 && (
                        <View style={styles.sectionStack}>
                            <View style={styles.heroCard}>
                                <View style={styles.heroIconWrap}>
                                    <Icon
                                        name="sparkles-outline"
                                        size={scaleSize(isSmallPhone ? 22 : 26, 0.35)}
                                        color={colors.primaryAction}
                                    />
                                </View>
                                <Text
                                    style={[
                                        styles.heroCardTitle,
                                        { fontSize: scaleFont(typography.fontSize.xl) },
                                    ]}
                                >
                                    {t('onboarding.heroTitle')}
                                </Text>
                                <Text
                                    style={[
                                        styles.heroCardText,
                                        { fontSize: scaleFont(typography.fontSize.sm) },
                                    ]}
                                >
                                    {t('onboarding.heroDescription')}
                                </Text>
                            </View>

                            <View style={styles.valueGrid}>
                                {[
                                    {
                                        icon: 'add-circle-outline',
                                        title: t('onboarding.valueCaptureTitle'),
                                        description: t('onboarding.valueCaptureDescription'),
                                    },
                                    {
                                        icon: 'calendar-outline',
                                        title: t('onboarding.valuePlanTitle'),
                                        description: t('onboarding.valuePlanDescription'),
                                    },
                                    {
                                        icon: 'shield-checkmark-outline',
                                        title: t('onboarding.valueControlTitle'),
                                        description: t('onboarding.valueControlDescription'),
                                    },
                                ].map((item) => (
                                    <View key={item.title} style={styles.valueCard}>
                                        <Icon
                                            name={item.icon}
                                            size={scaleSize(20, 0.3)}
                                            color={colors.primaryLight}
                                        />
                                        <Text
                                            style={[
                                                styles.valueCardTitle,
                                                { fontSize: scaleFont(typography.fontSize.base) },
                                            ]}
                                        >
                                            {item.title}
                                        </Text>
                                        <Text
                                            style={[
                                                styles.valueCardText,
                                                { fontSize: scaleFont(typography.fontSize.sm) },
                                            ]}
                                        >
                                            {item.description}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    {isSetupStep && (
                        <View style={styles.sectionStack}>
                            <View style={styles.setupCard}>
                                <Text
                                    style={[
                                        styles.sectionTitle,
                                        { fontSize: scaleFont(typography.fontSize.lg) },
                                    ]}
                                >
                                    {t('onboarding.languageTitle')}
                                </Text>
                                <Text
                                    style={[
                                        styles.sectionText,
                                        { fontSize: scaleFont(typography.fontSize.sm) },
                                    ]}
                                >
                                    {t('onboarding.languageDescription')}
                                </Text>

                                <View style={styles.choiceRow}>
                                    {([
                                        { code: 'en', label: t('language.english') },
                                        { code: 'es', label: t('language.spanish') },
                                    ] as const).map((item) => {
                                        const isActive = language === item.code;
                                        return (
                                            <TouchableOpacity
                                                key={item.code}
                                                style={[
                                                    styles.choiceChip,
                                                    isActive ? styles.choiceChipActive : null,
                                                ]}
                                                activeOpacity={0.85}
                                                onPress={() => setLanguage(item.code)}
                                            >
                                                <Text
                                                    style={[
                                                        styles.choiceChipText,
                                                        isActive ? styles.choiceChipTextActive : null,
                                                        { fontSize: scaleFont(typography.fontSize.sm) },
                                                    ]}
                                                >
                                                    {item.label}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>

                            <View style={styles.setupCard}>
                                <Text
                                    style={[
                                        styles.sectionTitle,
                                        { fontSize: scaleFont(typography.fontSize.lg) },
                                    ]}
                                >
                                    {t('onboarding.currencyTitle')}
                                </Text>
                                <Text
                                    style={[
                                        styles.sectionText,
                                        { fontSize: scaleFont(typography.fontSize.sm) },
                                    ]}
                                >
                                    {t('onboarding.currencyDescription')}
                                </Text>

                                <CurrencySelector
                                    label={t('common.currency')}
                                    value={preferredCurrency}
                                    onChange={(value) => {
                                        setPreferredCurrency(value);
                                        setValidationMessage(null);
                                        setSaveError(null);
                                    }}
                                />
                            </View>

                            <View style={styles.setupCard}>
                                <Text
                                    style={[
                                        styles.sectionTitle,
                                        { fontSize: scaleFont(typography.fontSize.lg) },
                                    ]}
                                >
                                    {t('onboarding.budgetTitle')}
                                </Text>
                                <Text
                                    style={[
                                        styles.sectionText,
                                        { fontSize: scaleFont(typography.fontSize.sm) },
                                    ]}
                                >
                                    {t('onboarding.budgetDescription')}
                                </Text>

                                <Input
                                    label={t('settings.budgetAmount')}
                                    placeholder={t('common.amountPlaceholder')}
                                    keyboardType="decimal-pad"
                                    value={budgetAmount}
                                    onChangeText={(value) => {
                                        setBudgetAmount(sanitizeMoneyInput(value));
                                        setValidationMessage(null);
                                        setSaveError(null);
                                    }}
                                />

                                <Text
                                    style={[
                                        styles.subsectionLabel,
                                        { fontSize: scaleFont(typography.fontSize.sm) },
                                    ]}
                                >
                                    {t('settings.budgetPeriod')}
                                </Text>
                                <View style={styles.choiceWrap}>
                                    {BUDGET_PERIODS.map((option) => {
                                        const isActive = budgetPeriod === option;
                                        return (
                                            <TouchableOpacity
                                                key={option}
                                                style={[
                                                    styles.choiceChip,
                                                    isActive ? styles.choiceChipActive : null,
                                                ]}
                                                activeOpacity={0.85}
                                                onPress={() => {
                                                    setBudgetPeriod(option);
                                                    setValidationMessage(null);
                                                    if (option !== 'period') {
                                                        setBudgetPeriodStart('');
                                                        setBudgetPeriodEnd('');
                                                    }
                                                }}
                                            >
                                                <Text
                                                    style={[
                                                        styles.choiceChipText,
                                                        isActive ? styles.choiceChipTextActive : null,
                                                        { fontSize: scaleFont(typography.fontSize.sm) },
                                                    ]}
                                                >
                                                    {budgetLabel(option, t)}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>

                                {budgetPeriod === 'period' && (
                                    <View style={styles.periodFields}>
                                        <Input
                                            label={t('settings.periodStart')}
                                            placeholder={t('filters.datePlaceholder')}
                                            value={budgetPeriodStart}
                                            onChangeText={(value) => {
                                                setBudgetPeriodStart(value);
                                                setValidationMessage(null);
                                            }}
                                            autoCapitalize="none"
                                        />
                                        <Input
                                            label={t('settings.periodEnd')}
                                            placeholder={t('filters.datePlaceholder')}
                                            value={budgetPeriodEnd}
                                            onChangeText={(value) => {
                                                setBudgetPeriodEnd(value);
                                                setValidationMessage(null);
                                            }}
                                            autoCapitalize="none"
                                        />
                                    </View>
                                )}

                                <View style={styles.helperCard}>
                                    <Text
                                        style={[
                                            styles.helperText,
                                            { fontSize: scaleFont(typography.fontSize.xs) },
                                        ]}
                                >
                                    {t('onboarding.setupHelper')}
                                </Text>
                            </View>

                                {validationMessage && (
                                    <Text
                                        style={[
                                            styles.validationText,
                                            { fontSize: scaleFont(typography.fontSize.sm) },
                                        ]}
                                    >
                                        {validationMessage}
                                    </Text>
                                )}

                                {saveError && (
                                    <Text
                                        style={[
                                            styles.validationText,
                                            { fontSize: scaleFont(typography.fontSize.sm) },
                                        ]}
                                    >
                                        {saveError}
                                    </Text>
                                )}
                            </View>
                        </View>
                    )}
                </ScrollView>

                <View
                    style={[
                        styles.footer,
                        isSetupStep ? styles.footerSingleAction : null,
                        {
                            paddingBottom: insets.bottom + spacing.base,
                            paddingHorizontal: horizontalPadding,
                        },
                        contentMaxWidthStyle,
                    ]}
                >
                    {isSetupStep ? (
                        <View style={styles.setupFooterActions}>
                            <Button
                                title={t('onboarding.finish')}
                                onPress={handleContinue}
                                loading={isSubmitting}
                                containerStyle={[
                                    styles.primaryButton,
                                    styles.footerActionFullWidth,
                                ]}
                            />
                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={() => openAccessChoice(true)}
                                disabled={isSubmitting}
                                style={styles.setupSkipButton}
                            >
                                <Text style={styles.setupSkipText}>
                                    {t('onboarding.skipSetup')}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <>
                            {currentStep > 0 ? (
                                <Button
                                    title={t('onboarding.back')}
                                    variant="ghost"
                                    onPress={() => setCurrentStep((previous) => previous - 1)}
                                    disabled={isSubmitting}
                                    containerStyle={styles.backButton}
                                    textStyle={styles.backButtonText}
                                />
                            ) : (
                                <View />
                            )}

                            <View style={styles.footerActions}>
                                <Button
                                    title={t('onboarding.next')}
                                    onPress={handleContinue}
                                    loading={isSubmitting}
                                    containerStyle={styles.primaryButton}
                                />
                            </View>
                        </>
                    )}
                </View>
                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={openPrivacyPolicy}
                    disabled={isSubmitting}
                    style={styles.privacyLinkButton}
                >
                    <Text style={styles.privacyLinkText}>
                        {t('legal.readPrivacy')}
                    </Text>
                </TouchableOpacity>
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
        gap: spacing.base,
        paddingBottom: spacing.base,
    },
    stepMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    stepPill: {
        alignSelf: 'flex-start',
        backgroundColor: colors.surfaceElevated,
        borderRadius: borderRadius.full,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
    },
    stepPillText: {
        color: colors.textSecondary,
        fontWeight: typography.fontWeight.semibold,
    },
    skipText: {
        color: colors.textSecondary,
        fontWeight: typography.fontWeight.semibold,
    },
    headerTitle: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.bold,
    },
    headerSubtitle: {
        color: colors.textSecondary,
        lineHeight: 22,
    },
    progressRow: {
        flexDirection: 'row',
        gap: spacing.xs,
    },
    progressDot: {
        flex: 1,
        height: 6,
        borderRadius: borderRadius.full,
        backgroundColor: colors.border,
    },
    progressDotActive: {
        backgroundColor: colors.primaryAction,
    },
    content: {
        gap: spacing.lg,
    },
    sectionStack: {
        gap: spacing.base,
    },
    heroCard: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.xl,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.lg,
        gap: spacing.sm,
    },
    heroIconWrap: {
        width: 42,
        height: 42,
        borderRadius: borderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.accentLight,
    },
    heroCardTitle: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.bold,
    },
    heroCardText: {
        color: colors.textSecondary,
        lineHeight: 20,
    },
    valueGrid: {
        gap: spacing.base,
    },
    valueCard: {
        backgroundColor: colors.surfaceElevated,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.base,
        gap: spacing.xs,
    },
    valueCardTitle: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.semibold,
    },
    valueCardText: {
        color: colors.textSecondary,
        lineHeight: 19,
    },
    featureGrid: {
        gap: spacing.base,
    },
    featureCard: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.base,
        gap: spacing.xs,
    },
    featureCardActive: {
        borderColor: colors.primaryLight,
        backgroundColor: colors.surfaceElevated,
    },
    featureIconWrap: {
        width: 38,
        height: 38,
        borderRadius: borderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surfaceElevated,
    },
    featureIconWrapActive: {
        backgroundColor: colors.accentLight,
    },
    featureCardTitle: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.semibold,
    },
    featureCardText: {
        color: colors.textSecondary,
        lineHeight: 18,
    },
    detailCard: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.xl,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.lg,
        gap: spacing.sm,
    },
    detailCardTitle: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.bold,
    },
    detailCardText: {
        color: colors.textSecondary,
        lineHeight: 20,
    },
    detailBullets: {
        gap: spacing.sm,
        marginTop: spacing.xs,
    },
    detailBulletRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.sm,
    },
    detailBulletText: {
        flex: 1,
        color: colors.textSecondary,
        lineHeight: 19,
    },
    workflowCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.base,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.xl,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.base,
    },
    workflowIndex: {
        width: 30,
        height: 30,
        borderRadius: borderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.accentLight,
    },
    workflowIndexText: {
        color: colors.primaryAction,
        fontWeight: typography.fontWeight.bold,
    },
    workflowContent: {
        flex: 1,
        gap: spacing.xs,
    },
    workflowTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    workflowTitle: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.semibold,
    },
    workflowText: {
        color: colors.textSecondary,
        lineHeight: 20,
    },
    setupCard: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.xl,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.lg,
        gap: spacing.base,
    },
    sectionTitle: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.bold,
    },
    sectionText: {
        color: colors.textSecondary,
        lineHeight: 20,
    },
    subsectionLabel: {
        color: colors.textSecondary,
        fontWeight: typography.fontWeight.semibold,
    },
    choiceRow: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    choiceWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    choiceChip: {
        paddingHorizontal: spacing.base,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.full,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surfaceElevated,
    },
    choiceChipActive: {
        borderColor: colors.primaryLight,
        backgroundColor: colors.accentLight,
    },
    choiceChipText: {
        color: colors.textSecondary,
        fontWeight: typography.fontWeight.medium,
    },
    choiceChipTextActive: {
        color: colors.primaryAction,
        fontWeight: typography.fontWeight.semibold,
    },
    periodFields: {
        gap: spacing.sm,
    },
    helperCard: {
        backgroundColor: colors.surfaceElevated,
        borderRadius: borderRadius.lg,
        padding: spacing.base,
    },
    helperText: {
        color: colors.textSecondary,
        lineHeight: 18,
    },
    validationText: {
        color: colors.error,
        fontWeight: typography.fontWeight.medium,
        lineHeight: 19,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.base,
        paddingTop: spacing.sm,
    },
    footerSingleAction: {
        alignItems: 'stretch',
        justifyContent: 'center',
        paddingTop: spacing.base,
    },
    footerUtilityButton: {
        minHeight: 0,
        paddingVertical: spacing.xs,
    },
    footerUtilityText: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.semibold,
    },
    footerUtilityTextMuted: {
        color: colors.textSecondary,
    },
    footerActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: spacing.sm,
        flex: 1,
    },
    backButton: {
        minHeight: 0,
        paddingHorizontal: 0,
        paddingVertical: 0,
    },
    backButtonText: {
        color: colors.textSecondary,
    },
    primaryButton: {
        minWidth: 150,
    },
    footerActionFullWidth: {
        width: '100%',
        minWidth: 0,
    },
    setupFooterActions: {
        width: '100%',
        alignItems: 'center',
        gap: spacing.sm,
    },
    setupSkipButton: {
        paddingVertical: spacing.xs,
    },
    setupSkipText: {
        color: colors.textSecondary,
        fontWeight: typography.fontWeight.semibold,
    },
    privacyLinkButton: {
        alignItems: 'center',
        paddingVertical: spacing.sm,
    },
    privacyLinkText: {
        color: colors.primaryLight,
        fontWeight: typography.fontWeight.semibold,
    },
});
