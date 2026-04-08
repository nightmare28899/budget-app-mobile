import React from 'react';
import {
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { PlanAccessSection } from '../../components/profile/PlanAccessSection';
import { AnimatedScreen } from '../../components/ui/AnimatedScreen';
import { Button } from '../../components/ui/Button';
import { CurrencySelector } from '../../components/ui/CurrencySelector';
import { HeroHeader } from '../../components/ui/HeroHeader';
import { HomeBackground } from '../../components/ui/HomeBackground';
import { Input } from '../../components/ui/Input';
import { ScreenBackButton } from '../../components/ui/ScreenBackButton';
import { ThemeLivePreviewCard } from '../../components/ui/ThemeLivePreviewCard';
import { useSettings } from '../../hooks/useSettings';
import { useScrollToFocusedInput } from '../../hooks/useScrollToFocusedInput';
import { RootScreenProps } from '../../navigation/types';
import {
    borderRadius,
    spacing,
    themeDefinitions,
    typography,
    useResponsive,
    useTheme,
    useThemedStyles,
} from '../../theme';
import { ThemeMode } from '../../theme/themes';
import { getCurrencyLocale, getCurrencySymbol } from '../../utils/currency';
import { formatCurrency } from '../../utils/format';
import { budgetLabel } from '../../utils/budget';
import { useAppAccess } from '../../hooks/useAppAccess';

type ProfileSectionTab = 'profile' | 'settings' | 'plan';

export function SettingsScreen({ navigation }: RootScreenProps<'Profile'>) {
    const { colors: themeColors } = useTheme();
    const styles = useThemedStyles(createStyles);
    const colors = themeColors;
    const insets = useSafeAreaInsets();
    const { scrollRef, createScrollOnFocusHandler } = useScrollToFocusedInput(116);
    const {
        horizontalPadding,
        contentMaxWidth,
        isSmallPhone,
        scaleFont,
        scaleSize,
    } = useResponsive();
    const {
        isAuthenticated,
        isGuest,
        hasPremium,
    } = useAppAccess();
    const {
        t,
        language,
        user,
        name,
        setName,
        avatarUri,
        avatarLoadFailed,
        setAvatarLoadFailed,
        fallbackInitial,
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
        isSendingWeeklyReport,
        themeMode,
        setThemeMode,
        resolvedThemeId,
        themeOptions,
        getThemeModeLabel,
        onSelectBudgetPeriod,
        onSave,
        onSaveProfile,
        onLogout,
        onSeedCategories,
        onSendWeeklyReport,
        onSelectLanguage,
        onSelectTheme,
        onPickProfileImage,
        onRemovePhoto,
    } = useSettings();

    const [activeTab, setActiveTab] = React.useState<ProfileSectionTab>('profile');
    const locale = getCurrencyLocale(language);
    const currencySymbol = getCurrencySymbol(currency, locale);
    const quickThemeModes: ThemeMode[] = ['system', ...themeOptions.map((item) => item.id)];
    const accessLabel = isGuest ? t('guest.statusGuest') : t('guest.statusAccount');
    const planStatusLabel = hasPremium ? t('premium.activeStatus') : t('premium.inactiveStatus');

    const sectionTabs = React.useMemo(
        () => [
            {
                key: 'profile' as const,
                label: t('settings.profile'),
                icon: 'person-circle-outline',
            },
            {
                key: 'settings' as const,
                label: t('settings.preferencesTitle'),
                icon: 'options-outline',
            },
            {
                key: 'plan' as const,
                label: t('settings.planLabel'),
                icon: hasPremium ? 'sparkles-outline' : 'shield-outline',
            },
        ],
        [hasPremium, t],
    );

    const accountSummaryItems = React.useMemo(
        () => [
            {
                key: 'access',
                icon: isGuest ? 'person-outline' : 'shield-checkmark-outline',
                label: t('settings.planAccessLabel'),
                value: accessLabel,
                active: !isGuest,
            },
            {
                key: 'backup',
                icon: isGuest ? 'phone-portrait-outline' : 'cloud-done-outline',
                label: t('settings.backupLabel'),
                value: isGuest
                    ? t('settings.backupGuestValue')
                    : t('settings.backupAccountValue'),
                active: !isGuest,
            },
        ],
        [accessLabel, isGuest, t],
    );

    const onGoBack = () => {
        navigation.goBack();
    };

    const openLogin = () => navigation.navigate('Auth', { screen: 'Login' });
    const openRegister = () => navigation.navigate('Auth', { screen: 'Register' });
    const openPremium = () => navigation.navigate('PremiumPaywall', { feature: 'credit_cards' });
    const openCreditCards = () => navigation.navigate('Main', { screen: 'CreditCards' });
    const openTerms = () => navigation.navigate('TermsAndConditions');

    const renderSectionTabs = () => (
        <View
            style={[
                styles.tabBar,
                {
                    marginHorizontal: 0,
                    padding: isSmallPhone ? scaleSize(spacing.sm, 0.5) : scaleSize(spacing.base, 0.5),
                },
            ]}
        >
            {sectionTabs.map((tab) => {
                const isActive = tab.key === activeTab;

                return (
                    <TouchableOpacity
                        key={tab.key}
                        style={[
                            styles.tabButton,
                            isActive ? styles.tabButtonActive : null,
                        ]}
                        activeOpacity={0.85}
                        onPress={() => {
                            setActiveTab(tab.key);
                            scrollRef.current?.scrollTo?.({ y: 0, animated: false });
                        }}
                    >
                        <Icon
                            name={tab.icon}
                            size={18}
                            color={isActive ? colors.textPrimary : colors.textMuted}
                        />
                        <Text
                            style={[
                                styles.tabButtonText,
                                { fontSize: scaleFont(typography.fontSize.xs) },
                                isActive ? styles.tabButtonTextActive : null,
                            ]}
                        >
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );

    const renderProfileTab = () => (
        <>
            <View
                style={[
                    styles.card,
                    {
                        marginHorizontal: 0,
                        padding: isSmallPhone ? scaleSize(spacing.lg, 0.5) : scaleSize(spacing.xl, 0.5),
                    },
                ]}
            >
                <View style={styles.avatarContainer}>
                    <TouchableOpacity
                        style={[
                            styles.avatarButton,
                            {
                                width: isSmallPhone ? 84 : 92,
                                height: isSmallPhone ? 84 : 92,
                                borderRadius: isSmallPhone ? 42 : 46,
                            },
                        ]}
                        onPress={onPickProfileImage}
                        activeOpacity={0.8}
                    >
                        {avatarUri && !avatarLoadFailed ? (
                            <Image
                                source={{ uri: avatarUri }}
                                style={[
                                    styles.avatarImage,
                                    { borderRadius: isSmallPhone ? 42 : 46 },
                                ]}
                                resizeMode="cover"
                                onError={() => setAvatarLoadFailed(true)}
                            />
                        ) : (
                            <Text
                                style={[
                                    styles.avatarInitial,
                                    { fontSize: scaleFont(typography.fontSize['3xl']) },
                                ]}
                            >
                                {fallbackInitial}
                            </Text>
                        )}
                    </TouchableOpacity>

                    <View style={styles.avatarActions}>
                        <TouchableOpacity
                            style={styles.avatarActionButton}
                            onPress={onPickProfileImage}
                            activeOpacity={0.8}
                        >
                            <Icon
                                name="image-outline"
                                size={16}
                                color={colors.textPrimary}
                            />
                            <Text
                                style={[
                                    styles.avatarActionText,
                                    { fontSize: scaleFont(typography.fontSize.sm) },
                                ]}
                            >
                                {avatarUri ? t('auth.changePhoto') : t('auth.addPhoto')}
                            </Text>
                        </TouchableOpacity>

                        {!!avatarUri && (
                            <TouchableOpacity
                                onPress={onRemovePhoto}
                                activeOpacity={0.8}
                            >
                                <Text
                                    style={[
                                        styles.removePhotoText,
                                        { fontSize: scaleFont(typography.fontSize.sm) },
                                    ]}
                                >
                                    {t('profileImage.removeTitle')}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                <Input
                    label={t('settings.name')}
                    value={name}
                    onChangeText={setName}
                    onFocus={createScrollOnFocusHandler()}
                    containerStyle={styles.fieldContainer}
                />

                <View style={styles.fieldContainer}>
                    <Text style={styles.label}>{t('settings.email')}</Text>
                    <View style={styles.readOnlyField}>
                        <Text style={styles.readOnlyText}>
                            {isGuest ? t('guest.statusGuest') : user?.email}
                        </Text>
                    </View>
                </View>

                <View style={styles.statusRow}>
                    <View
                        style={[
                            styles.statusPill,
                            isGuest ? styles.statusPillGuest : styles.statusPillAccount,
                        ]}
                    >
                        <Text
                            style={[
                                styles.statusPillText,
                                { fontSize: scaleFont(typography.fontSize.xs) },
                            ]}
                        >
                            {accessLabel}
                        </Text>
                    </View>

                    <View
                        style={[
                            styles.statusPill,
                            hasPremium ? styles.statusPillPremium : styles.statusPillFree,
                        ]}
                    >
                        <Text
                            style={[
                                styles.statusPillText,
                                { fontSize: scaleFont(typography.fontSize.xs) },
                            ]}
                        >
                            {planStatusLabel}
                        </Text>
                    </View>
                </View>
            </View>

            <Button
                title={t('settings.saveProfile')}
                onPress={onSaveProfile}
                loading={isSavingSettings}
                containerStyle={[styles.saveButton, { marginHorizontal: 0 }]}
            />

            <View
                style={[
                    styles.card,
                    {
                        marginHorizontal: 0,
                        padding: isSmallPhone ? scaleSize(spacing.lg, 0.5) : scaleSize(spacing.xl, 0.5),
                    },
                ]}
            >
                <Text style={[styles.cardTitle, { fontSize: scaleFont(typography.fontSize.base) }]}>
                    {t('guest.accessTitle')}
                </Text>

                <Text
                    style={[
                        styles.accessCopy,
                        { fontSize: scaleFont(typography.fontSize.sm) },
                    ]}
                >
                    {isGuest
                        ? t('settings.accessBackupGuestDescription')
                        : t('settings.accessBackupAccountDescription')}
                </Text>

                <View style={styles.summaryGrid}>
                    {accountSummaryItems.map((item) => (
                        <View key={item.key} style={styles.summaryCard}>
                            <View
                                style={[
                                    styles.summaryIconWrap,
                                    item.active
                                        ? styles.summaryIconWrapActive
                                        : styles.summaryIconWrapMuted,
                                ]}
                            >
                                <Icon
                                    name={item.icon}
                                    size={16}
                                    color={item.active ? colors.primaryLight : colors.textMuted}
                                />
                            </View>
                            <Text
                                style={[
                                    styles.summaryLabel,
                                    { fontSize: scaleFont(typography.fontSize.xs) },
                                ]}
                            >
                                {item.label}
                            </Text>
                            <Text
                                style={[
                                    styles.summaryValue,
                                    { fontSize: scaleFont(typography.fontSize.sm) },
                                ]}
                            >
                                {item.value}
                            </Text>
                        </View>
                    ))}
                </View>

                {isGuest ? (
                    <>
                        <Button
                            title={t('auth.signIn')}
                            onPress={openLogin}
                            containerStyle={styles.inlineActionButton}
                        />
                        <Button
                            title={t('auth.signUp')}
                            variant="secondary"
                            onPress={openRegister}
                            containerStyle={styles.inlineActionButtonSecondary}
                        />
                    </>
                ) : (
                    <Text
                        style={[
                            styles.inlineHelperText,
                            { fontSize: scaleFont(typography.fontSize.xs) },
                        ]}
                    >
                        {t('guest.accountReadyHint')}
                    </Text>
                )}
            </View>

            <View
                style={[
                    styles.card,
                    {
                        marginHorizontal: 0,
                        padding: isSmallPhone ? scaleSize(spacing.lg, 0.5) : scaleSize(spacing.xl, 0.5),
                    },
                ]}
            >
                <Text style={[styles.cardTitle, { fontSize: scaleFont(typography.fontSize.base) }]}>
                    {t('settings.accountActionsTitle')}
                </Text>

                {isAuthenticated ? (
                    <TouchableOpacity
                        style={[styles.actionRow, styles.actionRowDanger]}
                        onPress={onLogout}
                        activeOpacity={0.78}
                    >
                        <Icon name="log-out-outline" size={22} color={colors.error} />
                        <View style={styles.actionInfo}>
                            <Text
                                style={[
                                    styles.actionText,
                                    styles.actionTextDanger,
                                    { fontSize: scaleFont(typography.fontSize.base) },
                                ]}
                            >
                                {t('settings.logout')}
                            </Text>
                            <Text
                                style={[
                                    styles.actionSubtext,
                                    styles.actionSubtextDanger,
                                    { fontSize: scaleFont(typography.fontSize.xs) },
                                ]}
                            >
                                {t('settings.logoutConfirm')}
                            </Text>
                        </View>
                        <Icon name="chevron-forward" size={20} color={colors.error} />
                    </TouchableOpacity>
                ) : null}

                <View style={[styles.actionRow, styles.versionRow]}>
                    <Icon
                        name="information-circle-outline"
                        size={20}
                        color={colors.textMuted}
                    />
                    <View style={styles.actionInfo}>
                        <Text
                            style={[
                                styles.actionText,
                                styles.versionText,
                                { fontSize: scaleFont(typography.fontSize.sm) },
                            ]}
                        >
                            {t('settings.version')}
                        </Text>
                    </View>
                </View>
            </View>
        </>
    );

    const renderSettingsTab = () => (
        <>
            <View
                style={[
                    styles.card,
                    {
                        marginHorizontal: 0,
                        padding: isSmallPhone ? scaleSize(spacing.lg, 0.5) : scaleSize(spacing.xl, 0.5),
                    },
                ]}
            >
                <Text style={[styles.cardTitle, { fontSize: scaleFont(typography.fontSize.base) }]}>
                    {t('settings.budgetSettings')}
                </Text>

                <Input
                    label={t('settings.budgetAmount')}
                    value={budgetAmount}
                    onChangeText={setBudgetAmount}
                    keyboardType="decimal-pad"
                    leftContent={<Text style={styles.currencySign}>{currencySymbol}</Text>}
                    onFocus={createScrollOnFocusHandler(124)}
                    containerStyle={{ marginBottom: 2 }}
                />

                <CurrencySelector
                    label={t('common.currency')}
                    value={currency}
                    onChange={setCurrency}
                    helperText={t('settings.currencyHelp')}
                    containerStyle={styles.currencySelector}
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

                {budgetPeriod === 'period' && (
                    <>
                        <Input
                            label={t('settings.periodStart')}
                            value={budgetPeriodStart}
                            onChangeText={setBudgetPeriodStart}
                            placeholder={t('filters.datePlaceholder')}
                            autoCapitalize="none"
                            autoCorrect={false}
                            onFocus={createScrollOnFocusHandler(132)}
                        />

                        <Input
                            label={t('settings.periodEnd')}
                            value={budgetPeriodEnd}
                            onChangeText={setBudgetPeriodEnd}
                            placeholder={t('filters.datePlaceholder')}
                            autoCapitalize="none"
                            autoCorrect={false}
                            onFocus={createScrollOnFocusHandler(148)}
                            containerStyle={{ marginTop: spacing.xs }}
                        />
                        <Text style={styles.periodHint}>
                            {t('settings.periodDateFormat')}
                        </Text>
                    </>
                )}

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
            </View>

            <Button
                title={t('settings.saveChanges')}
                onPress={onSave}
                loading={isSavingSettings}
                containerStyle={[styles.saveButton, { marginHorizontal: 0 }]}
            />

            <View
                style={[
                    styles.card,
                    {
                        marginHorizontal: 0,
                        padding: isSmallPhone ? scaleSize(spacing.lg, 0.5) : scaleSize(spacing.xl, 0.5),
                    },
                ]}
            >
                <Text style={[styles.cardTitle, { fontSize: scaleFont(typography.fontSize.base) }]}>
                    {t('settings.preferencesTitle')}
                </Text>

                <TouchableOpacity
                    style={styles.actionRow}
                    onPress={onSelectLanguage}
                    activeOpacity={0.7}
                >
                    <Icon name="language-outline" size={22} color={colors.primaryLight} />
                    <View style={styles.actionInfo}>
                        <Text style={[styles.actionText, { fontSize: scaleFont(typography.fontSize.base) }]}>
                            {t('settings.languageTitle')}
                        </Text>
                        <Text style={[styles.actionSubtext, { fontSize: scaleFont(typography.fontSize.xs) }]}>
                            {t('settings.languageDesc')} •{' '}
                            {language === 'es' ? t('language.spanish') : t('language.english')}
                        </Text>
                    </View>
                    <Icon name="chevron-forward" size={20} color={colors.textMuted} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.actionRow}
                    onPress={onSelectTheme}
                    activeOpacity={0.7}
                >
                    <Icon name="color-palette-outline" size={22} color={themeColors.accent} />
                    <View style={styles.actionInfo}>
                        <Text style={[styles.actionText, { fontSize: scaleFont(typography.fontSize.base) }]}>
                            {t('settings.themeTitle')}
                        </Text>
                        <Text style={[styles.actionSubtext, { fontSize: scaleFont(typography.fontSize.xs) }]}>
                            {t('settings.themeDesc')} • {getThemeModeLabel(themeMode)}
                        </Text>
                        <View style={styles.themePreviewRow}>
                            <View
                                style={[
                                    styles.themePreviewDot,
                                    {
                                        backgroundColor: themeDefinitions[resolvedThemeId].colors.background,
                                        borderColor: themeDefinitions[resolvedThemeId].colors.border,
                                    },
                                ]}
                            />
                            <View
                                style={[
                                    styles.themePreviewDot,
                                    {
                                        backgroundColor:
                                            themeDefinitions[resolvedThemeId].colors.primaryAction,
                                        borderColor:
                                            themeDefinitions[resolvedThemeId].colors.primaryActionHover,
                                    },
                                ]}
                            />
                        </View>
                    </View>
                    <Icon name="chevron-forward" size={20} color={colors.textMuted} />
                </TouchableOpacity>

                <View style={styles.themeChipsRow}>
                    {quickThemeModes.map((mode) => {
                        const isActive = mode === themeMode;
                        const previewMode =
                            mode === 'system' ? resolvedThemeId : mode;
                        const previewColors = themeDefinitions[previewMode].colors;

                        return (
                            <TouchableOpacity
                                key={mode}
                                style={[
                                    styles.themeChip,
                                    {
                                        borderColor: isActive
                                            ? themeColors.primaryAction
                                            : colors.border,
                                        backgroundColor: isActive
                                            ? themeColors.primaryAction + '20'
                                            : colors.surfaceElevated,
                                    },
                                ]}
                                activeOpacity={0.8}
                                onPress={() => setThemeMode(mode)}
                            >
                                <View style={styles.themeChipPreview}>
                                    <View
                                        style={[
                                            styles.themeChipDot,
                                            {
                                                backgroundColor: previewColors.background,
                                                borderColor: previewColors.border,
                                            },
                                        ]}
                                    />
                                    <View
                                        style={[
                                            styles.themeChipDot,
                                            {
                                                backgroundColor: previewColors.primaryAction,
                                                borderColor: previewColors.primaryActionHover,
                                            },
                                        ]}
                                    />
                                </View>
                                <Text
                                    style={[
                                        styles.themeChipText,
                                        isActive
                                            ? { color: themeColors.textPrimary }
                                            : null,
                                        { fontSize: scaleFont(typography.fontSize.xs) },
                                    ]}
                                >
                                    {getThemeModeLabel(mode)}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <ThemeLivePreviewCard onPress={onSelectTheme} />

                <TouchableOpacity
                    style={styles.actionRow}
                    onPress={openTerms}
                    activeOpacity={0.7}
                >
                    <Icon name="document-text-outline" size={22} color={colors.primaryLight} />
                    <View style={styles.actionInfo}>
                        <Text style={[styles.actionText, { fontSize: scaleFont(typography.fontSize.base) }]}>
                            {t('settings.termsTitle')}
                        </Text>
                        <Text style={[styles.actionSubtext, { fontSize: scaleFont(typography.fontSize.xs) }]}>
                            {t('settings.termsDesc')}
                        </Text>
                    </View>
                    <Icon name="chevron-forward" size={20} color={colors.textMuted} />
                </TouchableOpacity>

                {isAuthenticated ? (
                    <TouchableOpacity
                        style={styles.actionRow}
                        onPress={onSeedCategories}
                        activeOpacity={0.7}
                    >
                        <Icon name="grid-outline" size={22} color={colors.secondary} />
                        <View style={styles.actionInfo}>
                            <Text style={[styles.actionText, { fontSize: scaleFont(typography.fontSize.base) }]}>
                                {t('settings.seedCategories')}
                            </Text>
                            <Text style={[styles.actionSubtext, { fontSize: scaleFont(typography.fontSize.xs) }]}>
                                {t('settings.seedCategoriesDesc')}
                            </Text>
                        </View>
                        <Icon name="chevron-forward" size={20} color={colors.textMuted} />
                    </TouchableOpacity>
                ) : null}

                {isAuthenticated ? (
                    <TouchableOpacity
                        style={styles.actionRow}
                        onPress={onSendWeeklyReport}
                        disabled={isSendingWeeklyReport}
                        activeOpacity={0.7}
                    >
                        <Icon name="mail-outline" size={22} color={colors.primaryLight} />
                        <View style={styles.actionInfo}>
                            <Text style={[styles.actionText, { fontSize: scaleFont(typography.fontSize.base) }]}>
                                {t('settings.sendWeeklyReport')}
                            </Text>
                            <Text style={[styles.actionSubtext, { fontSize: scaleFont(typography.fontSize.xs) }]}>
                                {isSendingWeeklyReport
                                    ? t('settings.sendWeeklyReportPending')
                                    : t('settings.sendWeeklyReportDesc')}
                            </Text>
                        </View>
                        <Icon name="chevron-forward" size={20} color={colors.textMuted} />
                    </TouchableOpacity>
                ) : null}
            </View>
        </>
    );

    const renderPlanTab = () => (
        <PlanAccessSection
            onOpenPremium={openPremium}
            onOpenCreditCards={openCreditCards}
            onOpenLogin={openLogin}
        />
    );

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={insets.top}
        >
            <HomeBackground />
            <AnimatedScreen style={styles.flex1} delay={8} duration={200} travelY={6}>
                <View
                    style={[
                        styles.header,
                        {
                            paddingTop: insets.top + spacing.base,
                            paddingHorizontal: horizontalPadding,
                        },
                    ]}
                >
                    <ScreenBackButton
                        onPress={onGoBack}
                        containerStyle={[
                            styles.backButton,
                            { top: insets.top + spacing.xs, left: horizontalPadding },
                        ]}
                    />
                    <HeroHeader
                        title={t('settings.profile')}
                        icon="person-circle-outline"
                        subtitle={t('settings.subtitle')}
                        containerStyle={styles.headerHero}
                    />
                </View>

                <ScrollView
                    ref={scrollRef}
                    style={styles.scrollView}
                    contentContainerStyle={[
                        styles.content,
                        {
                            paddingBottom: insets.bottom + spacing['5xl'],
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
                    {renderSectionTabs()}
                    {activeTab === 'profile' ? renderProfileTab() : null}
                    {activeTab === 'settings' ? renderSettingsTab() : null}
                    {activeTab === 'plan' ? renderPlanTab() : null}
                </ScrollView>
            </AnimatedScreen>
        </KeyboardAvoidingView>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    backButton: {
        position: 'absolute',
        zIndex: 10,
    },
    headerHero: {
        paddingHorizontal: spacing['4xl'],
    },
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    flex1: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        paddingBottom: spacing['5xl'],
    },
    header: {
        backgroundColor: 'transparent',
    },
    tabBar: {
        flexDirection: 'row',
        gap: spacing.sm,
        borderRadius: borderRadius.xl,
        backgroundColor: colors.surfaceCard,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: spacing.base,
    },
    tabButton: {
        flex: 1,
        minHeight: 54,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.xs,
    },
    tabButtonActive: {
        backgroundColor: colors.surfaceElevated,
        borderWidth: 1,
        borderColor: colors.primaryAction + '44',
    },
    tabButtonText: {
        color: colors.textMuted,
        fontWeight: typography.fontWeight.semibold,
        textAlign: 'center',
    },
    tabButtonTextActive: {
        color: colors.textPrimary,
    },
    card: {
        backgroundColor: colors.surfaceCard,
        borderRadius: borderRadius.xl,
        padding: spacing.xl,
        marginBottom: spacing.base,
        borderWidth: 1,
        borderColor: colors.border,
    },
    cardTitle: {
        fontWeight: typography.fontWeight.semibold,
        color: colors.textSecondary,
        marginBottom: spacing.base,
    },
    avatarContainer: {
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    avatarButton: {
        backgroundColor: colors.surfaceElevated,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    avatarInitial: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.bold,
    },
    avatarActions: {
        marginTop: spacing.sm,
        alignItems: 'center',
        gap: spacing.xs,
    },
    avatarActionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        borderRadius: borderRadius.full,
        paddingHorizontal: spacing.base,
        paddingVertical: spacing.sm,
        backgroundColor: colors.surfaceElevated,
        borderWidth: 1,
        borderColor: colors.border,
    },
    avatarActionText: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.medium,
    },
    removePhotoText: {
        color: colors.error,
        fontWeight: typography.fontWeight.medium,
    },
    fieldContainer: {
        marginBottom: spacing.base,
    },
    label: {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.semibold,
        color: colors.textSecondary,
        marginBottom: spacing.xs,
    },
    readOnlyField: {
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surfaceElevated,
        paddingHorizontal: spacing.base,
        paddingVertical: spacing.base,
    },
    readOnlyText: {
        color: colors.textPrimary,
        fontSize: typography.fontSize.base,
    },
    statusRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        marginTop: spacing.xs,
    },
    statusPill: {
        borderRadius: borderRadius.full,
        paddingHorizontal: spacing.sm,
        paddingVertical: 6,
        borderWidth: 1,
    },
    statusPillGuest: {
        backgroundColor: 'rgba(255, 173, 51, 0.12)',
        borderColor: 'rgba(255, 173, 51, 0.28)',
    },
    statusPillAccount: {
        backgroundColor: 'rgba(77, 163, 255, 0.12)',
        borderColor: 'rgba(77, 163, 255, 0.28)',
    },
    statusPillPremium: {
        backgroundColor: 'rgba(0, 230, 118, 0.12)',
        borderColor: 'rgba(0, 230, 118, 0.28)',
    },
    statusPillFree: {
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        borderColor: colors.border,
    },
    statusPillText: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.semibold,
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    saveButton: {
        marginBottom: spacing.base,
    },
    accessCopy: {
        color: colors.textPrimary,
        lineHeight: 22,
        marginBottom: spacing.base,
    },
    summaryGrid: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginBottom: spacing.base,
    },
    summaryCard: {
        flex: 1,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surfaceElevated,
        padding: spacing.base,
    },
    summaryIconWrap: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.sm,
    },
    summaryIconWrapActive: {
        backgroundColor: 'rgba(0, 230, 118, 0.12)',
        borderWidth: 1,
        borderColor: 'rgba(0, 230, 118, 0.24)',
    },
    summaryIconWrapMuted: {
        backgroundColor: colors.surfaceCard,
        borderWidth: 1,
        borderColor: colors.border,
    },
    summaryLabel: {
        color: colors.textMuted,
        marginBottom: spacing.xs,
        fontWeight: typography.fontWeight.medium,
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    summaryValue: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.semibold,
    },
    inlineActionButton: {
        marginTop: spacing.xs,
    },
    inlineActionButtonSecondary: {
        marginTop: spacing.xs,
        marginBottom: spacing.xs,
    },
    inlineHelperText: {
        color: colors.textMuted,
        lineHeight: 18,
        marginTop: spacing.xs,
        marginBottom: spacing.xs,
    },
    currencySign: {
        color: colors.textSecondary,
        fontWeight: typography.fontWeight.semibold,
        fontSize: typography.fontSize.base,
    },
    currencySelector: {
        marginBottom: spacing.base,
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
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.base,
        paddingVertical: spacing.base,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    actionRowDanger: {
        marginTop: spacing.xs,
    },
    actionInfo: {
        flex: 1,
    },
    actionText: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.semibold,
    },
    actionTextDanger: {
        color: colors.error,
    },
    actionSubtext: {
        color: colors.textMuted,
        marginTop: spacing.xs,
        lineHeight: 18,
    },
    actionSubtextDanger: {
        color: colors.error,
        opacity: 0.82,
    },
    versionRow: {
        marginTop: spacing.xs,
    },
    versionText: {
        color: colors.textSecondary,
    },
    themePreviewRow: {
        flexDirection: 'row',
        gap: spacing.xs,
        marginTop: spacing.sm,
    },
    themePreviewDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        borderWidth: 1,
    },
    themeChipsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        marginTop: spacing.base,
        marginBottom: spacing.base,
    },
    themeChip: {
        minWidth: 92,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.sm,
        gap: spacing.xs,
    },
    themeChipPreview: {
        flexDirection: 'row',
        gap: spacing.xs,
    },
    themeChipDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        borderWidth: 1,
    },
    themeChipText: {
        color: colors.textSecondary,
        fontWeight: typography.fontWeight.medium,
    },
});
