import React from 'react';
import {
    Image,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { RootScreenProps } from '../../navigation/types';
import { formatCurrency } from '../../utils/format';
import {
    spacing,
    typography,
    borderRadius,
    useResponsive,
    useTheme,
    useThemedStyles,
    themeDefinitions,
} from '../../theme';
import { HeroHeader } from '../../components/ui/HeroHeader';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { ScreenBackButton } from '../../components/ui/ScreenBackButton';
import { ThemeLivePreviewCard } from '../../components/ui/ThemeLivePreviewCard';
import { AnimatedScreen } from '../../components/ui/AnimatedScreen';
import { HomeBackground } from '../../components/ui/HomeBackground';
import { useSettings } from '../../hooks/useSettings';
import { budgetLabel } from '../../utils/budget';
import { ThemeMode } from '../../theme/themes';

export function SettingsScreen({ navigation }: RootScreenProps<'Profile'>) {
    const { colors: themeColors } = useTheme();
    const styles = useThemedStyles(createStyles);
    const colors = themeColors;
    const insets = useSafeAreaInsets();
    const { horizontalPadding, contentMaxWidth, isSmallPhone, scaleFont, scaleSize } = useResponsive();
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
        onLogout,
        onSeedCategories,
        onSendWeeklyReport,
        onSelectLanguage,
        onSelectTheme,
        onPickProfileImage,
        onRemovePhoto,
    } = useSettings();
    const onSaveAll = () => {
        onSave();
    };
    const quickThemeModes: ThemeMode[] = ['system', ...themeOptions.map((item) => item.id)];
    const onGoBack = () => {
        navigation.goBack();
    };

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
                >
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
                            containerStyle={styles.fieldContainer}
                        />

                        <View style={styles.fieldContainer}>
                            <Text style={styles.label}>{t('settings.email')}</Text>
                            <View style={styles.readOnlyField}>
                                <Text style={styles.readOnlyText}>{user?.email}</Text>
                            </View>
                        </View>
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
                            {t('settings.budgetSettings')}
                        </Text>

                        <Input
                            label={t('settings.budgetAmount')}
                            value={budgetAmount}
                            onChangeText={setBudgetAmount}
                            keyboardType="decimal-pad"
                            leftContent={<Text style={styles.currencySign}>$</Text>}
                            containerStyle={{ marginBottom: 2 }}
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
                        )}

                        <Text style={styles.budgetHint}>
                            {t('settings.currentBudget', {
                                value: formatCurrency(
                                    user?.budgetAmount ?? user?.dailyBudget ?? 0,
                                    user?.currency,
                                ),
                                period: budgetLabel(user?.budgetPeriod ?? budgetPeriod, t),
                            })}
                        </Text>
                    </View>

                    <Button
                        title={t('settings.saveChanges')}
                        onPress={onSaveAll}
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
                            {t('settings.actions')}
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

                </ScrollView>
            </AnimatedScreen>
        </KeyboardAvoidingView>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    fieldContainer: {
        marginTop: spacing.md,
    },
    backButton: {
        position: 'absolute',
        zIndex: 10,
    },
    headerHero: {
        paddingHorizontal: spacing['4xl'],
    },
    readOnlyField: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.lg,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: colors.surfaceCard,
    },
    readOnlyText: {
        color: colors.textPrimary,
        fontSize: typography.fontSize.sm,
    },
    avatarContainer: {
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    avatarButton: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surfaceCard,
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
        alignItems: 'center',
        marginTop: spacing.md,
    },
    avatarActionButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarActionText: {
        marginLeft: spacing.xs,
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.semibold,
    },
    removePhotoText: {
        marginTop: spacing.xs,
        color: colors.textMuted,
    },
    container: {
        flex: 1,
        backgroundColor: '#050F22',
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
    card: {
        marginHorizontal: spacing.xl,
        backgroundColor: colors.surfaceCard,
        borderRadius: borderRadius.xl,
        padding: spacing.xl,
        marginBottom: spacing.base,
        borderWidth: 1,
        borderColor: colors.border,
    },
    cardTitle: {
        fontSize: typography.fontSize.base,
        fontWeight: typography.fontWeight.semibold,
        color: colors.textSecondary,
        marginBottom: spacing.base,
    },
    avatarContainer: {
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    avatarButton: {
        width: 92,
        height: 92,
        borderRadius: 46,
        backgroundColor: colors.surfaceElevated,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    avatarInitial: {
        fontSize: typography.fontSize['3xl'],
        fontWeight: typography.fontWeight.bold,
        color: colors.textSecondary,
    },
    avatarActions: {
        alignItems: 'center',
        marginTop: spacing.sm,
        gap: spacing.xs,
    },
    avatarActionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        backgroundColor: colors.surfaceElevated,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
    },
    avatarActionText: {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.medium,
        color: colors.textPrimary,
    },
    removePhotoText: {
        fontSize: typography.fontSize.sm,
        color: colors.error,
    },
    fieldContainer: {
        marginBottom: spacing.md,
    },
    label: {
        fontSize: typography.fontSize.sm,
        color: colors.textMuted,
        marginBottom: spacing.xs,
    },
    readOnlyField: {
        backgroundColor: colors.surfaceElevated,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
        opacity: 0.6,
    },
    readOnlyText: {
        fontSize: typography.fontSize.base,
        color: colors.textSecondary,
    },
    currencySign: {
        fontSize: typography.fontSize.base,
        color: colors.textMuted,
    },
    periodSelectorContainer: {
        marginTop: spacing.sm,
    },
    periodSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.surfaceElevated,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: spacing.base,
        paddingVertical: spacing.md,
    },
    periodSelectorText: {
        fontSize: typography.fontSize.base,
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.medium,
    },
    periodHint: {
        fontSize: typography.fontSize.xs,
        color: colors.textMuted,
        marginTop: spacing.xs,
    },
    budgetHint: {
        fontSize: typography.fontSize.sm,
        color: colors.textMuted,
        marginTop: spacing.sm,
    },
    saveButton: {
        marginHorizontal: spacing.xl,
        marginBottom: spacing.base,
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        borderBottomWidth: 0.5,
        borderBottomColor: colors.border,
        gap: spacing.md,
    },
    actionInfo: {
        flex: 1,
    },
    actionText: {
        fontSize: typography.fontSize.base,
        fontWeight: typography.fontWeight.medium,
        color: colors.textPrimary,
    },
    actionSubtext: {
        fontSize: typography.fontSize.xs,
        color: colors.textMuted,
        marginTop: 2,
    },
    actionRowDanger: {
        borderBottomWidth: 0,
        marginTop: spacing.xs,
    },
    actionTextDanger: {
        color: colors.error,
    },
    actionSubtextDanger: {
        color: colors.error + 'BB',
    },
    versionRow: {
        borderBottomWidth: 0,
        paddingTop: spacing.lg,
    },
    versionText: {
        color: colors.textMuted,
    },
    themePreviewRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        marginTop: spacing.xs,
    },
    themePreviewDot: {
        width: 14,
        height: 14,
        borderRadius: 7,
        borderWidth: 1,
    },
    themeChipsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.xs,
        marginTop: spacing.sm,
    },
    themeChip: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: borderRadius.full,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        gap: spacing.xs,
    },
    themeChipPreview: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
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
