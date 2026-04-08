import React from 'react';
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
import { AnimatedScreen } from '../../components/ui/AnimatedScreen';
import { Button } from '../../components/ui/Button';
import { CurrencySelector } from '../../components/ui/CurrencySelector';
import { HomeBackground } from '../../components/ui/HomeBackground';
import { Input } from '../../components/ui/Input';
import { ScreenBackButton } from '../../components/ui/ScreenBackButton';
import { PlanAccessSection } from '../../components/profile/PlanAccessSection';
import { useI18n } from '../../hooks/useI18n';
import { useSettings } from '../../hooks/useSettings';
import { RootScreenProps } from '../../navigation/types';
import {
    borderRadius,
    spacing,
    typography,
    useResponsive,
    useTheme,
    useThemedStyles,
} from '../../theme';
import { getCurrencyLocale, getCurrencySymbol } from '../../utils/currency';
import { formatCurrency } from '../../utils/format';
import { budgetLabel } from '../../utils/budget';
import Icon from 'react-native-vector-icons/Ionicons';

export function PlanOverviewScreen({ navigation }: RootScreenProps<'PlanOverview'>) {
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);
    const insets = useSafeAreaInsets();
    const { t, language } = useI18n();
    const {
        horizontalPadding,
        contentMaxWidth,
        isSmallPhone,
        scaleFont,
        scaleSize,
    } = useResponsive();
    const {
        user,
        budgetAmount,
        setBudgetAmount,
        currency,
        setCurrency,
        budgetPeriod,
        budgetPeriodStart,
        setBudgetPeriodStart,
        budgetPeriodEnd,
        setBudgetPeriodEnd,
        isSavingSettings,
        onSelectBudgetPeriod,
        onSave,
    } = useSettings();
    const locale = getCurrencyLocale(language);
    const currencySymbol = getCurrencySymbol(currency, locale);

    const openPremium = () => {
        navigation.navigate('PremiumPaywall', { feature: 'credit_cards' });
    };

    const openCreditCards = () => {
        navigation.navigate('Main', { screen: 'CreditCards' });
    };

    const openLogin = () => {
        navigation.navigate('Auth', { screen: 'Login' });
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={insets.top}
        >
            <HomeBackground />
            <AnimatedScreen style={styles.flex1} delay={12} duration={220} travelY={8}>
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
                    <ScreenBackButton onPress={() => navigation.goBack()} />
                    <View style={styles.headerCopy}>
                        <Text
                            style={[
                                styles.headerTitle,
                                { fontSize: scaleFont(typography.fontSize['2xl']) },
                            ]}
                        >
                            {t('plan.title')}
                        </Text>
                        <Text
                            style={[
                                styles.headerSubtitle,
                                { fontSize: scaleFont(typography.fontSize.sm) },
                            ]}
                        >
                            {t('plan.subtitle')}
                        </Text>
                    </View>
                </View>

                <ScrollView
                    contentContainerStyle={[
                        styles.content,
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
                    showsVerticalScrollIndicator={false}
                >
                    <View
                        style={[
                            styles.card,
                            {
                                padding: isSmallPhone
                                    ? scaleSize(spacing.lg, 0.5)
                                    : scaleSize(spacing.xl, 0.5),
                            },
                        ]}
                    >
                        <Text
                            style={[
                                styles.cardTitle,
                                { fontSize: scaleFont(typography.fontSize.base) },
                            ]}
                        >
                            {t('settings.budgetSettings')}
                        </Text>
                        <Text
                            style={[
                                styles.cardDescription,
                                { fontSize: scaleFont(typography.fontSize.sm) },
                            ]}
                        >
                            {t('settings.budgetHelp')}
                        </Text>

                        <Input
                            label={t('settings.budgetAmount')}
                            value={budgetAmount}
                            onChangeText={setBudgetAmount}
                            keyboardType="decimal-pad"
                            leftContent={<Text style={styles.currencySign}>{currencySymbol}</Text>}
                            containerStyle={styles.sectionSpacing}
                        />

                        <CurrencySelector
                            label={t('common.currency')}
                            value={currency}
                            onChange={setCurrency}
                            helperText={t('settings.currencyHelp')}
                            containerStyle={styles.sectionSpacing}
                        />

                        <View style={styles.periodSelectorContainer}>
                            <Text style={styles.label}>{t('settings.budgetPeriod')}</Text>
                            <TouchableOpacity
                                style={styles.periodSelector}
                                onPress={onSelectBudgetPeriod}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.periodSelectorText}>
                                    {budgetLabel(budgetPeriod, t)}
                                </Text>
                                <Icon
                                    name="chevron-down"
                                    size={18}
                                    color={colors.textMuted}
                                />
                            </TouchableOpacity>
                        </View>

                        {budgetPeriod === 'period' ? (
                            <>
                                <Input
                                    label={t('settings.periodStart')}
                                    value={budgetPeriodStart}
                                    onChangeText={setBudgetPeriodStart}
                                    placeholder={t('filters.datePlaceholder')}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                                <Input
                                    label={t('settings.periodEnd')}
                                    value={budgetPeriodEnd}
                                    onChangeText={setBudgetPeriodEnd}
                                    placeholder={t('filters.datePlaceholder')}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    containerStyle={{ marginTop: spacing.xs }}
                                />
                                <Text style={styles.periodHint}>
                                    {t('settings.periodDateFormat')}
                                </Text>
                            </>
                        ) : null}

                        <Text style={styles.budgetHint}>
                            {t('settings.currentBudget', {
                                value: formatCurrency(
                                    user?.budgetAmount ?? user?.dailyBudget ?? 0,
                                    currency,
                                    locale,
                                ),
                                period: budgetLabel(user?.budgetPeriod ?? budgetPeriod, t),
                            })}
                        </Text>
                        <Text style={styles.planHint}>
                            {t('plan.spendingHint')}
                        </Text>

                        <Button
                            title={t('settings.saveChanges')}
                            onPress={onSave}
                            loading={isSavingSettings}
                            containerStyle={styles.saveButton}
                        />
                    </View>

                    <PlanAccessSection
                        onOpenPremium={openPremium}
                        onOpenCreditCards={openCreditCards}
                        onOpenLogin={openLogin}
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
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        marginBottom: spacing.base,
    },
    headerCopy: {
        flex: 1,
    },
    headerTitle: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.bold,
    },
    headerSubtitle: {
        color: colors.textSecondary,
        marginTop: spacing.xs,
        lineHeight: 20,
    },
    content: {
        gap: spacing.base,
    },
    card: {
        backgroundColor: colors.surfaceCard,
        borderRadius: borderRadius.xl,
        borderWidth: 1,
        borderColor: colors.border,
    },
    cardTitle: {
        color: colors.textSecondary,
        fontWeight: typography.fontWeight.semibold,
        marginBottom: spacing.sm,
    },
    cardDescription: {
        color: colors.textMuted,
        lineHeight: 20,
        marginBottom: spacing.sm,
    },
    sectionSpacing: {
        marginBottom: spacing.base,
    },
    currencySign: {
        color: colors.textSecondary,
        fontWeight: typography.fontWeight.semibold,
        fontSize: typography.fontSize.base,
    },
    label: {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.semibold,
        color: colors.textSecondary,
        marginBottom: spacing.xs,
    },
    periodSelectorContainer: {
        marginBottom: spacing.base,
    },
    periodSelector: {
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surfaceElevated,
        paddingHorizontal: spacing.base,
        paddingVertical: spacing.base,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    periodSelectorText: {
        color: colors.textPrimary,
        fontSize: typography.fontSize.base,
        fontWeight: typography.fontWeight.medium,
    },
    periodHint: {
        color: colors.textMuted,
        fontSize: typography.fontSize.xs,
        marginTop: spacing.xs,
        lineHeight: 18,
    },
    budgetHint: {
        color: colors.textMuted,
        fontSize: typography.fontSize.sm,
        lineHeight: 20,
        marginTop: spacing.sm,
    },
    planHint: {
        color: colors.textSecondary,
        fontSize: typography.fontSize.xs,
        lineHeight: 18,
        marginTop: spacing.sm,
    },
    saveButton: {
        marginTop: spacing.base,
    },
});
