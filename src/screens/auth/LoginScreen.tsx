import React, { useState } from 'react';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
    View,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    TouchableOpacity,
    Text,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthScreenProps, RootStackParamList } from '../../navigation/types';
import { useAuth } from '../../hooks/auth/useAuth';
import { HeroHeader } from '../../components/ui/layout/HeroHeader';
import { HomeBackground } from '../../components/ui/layout/HomeBackground';
import { Input } from '../../components/ui/primitives/Input';
import { Button } from '../../components/ui/primitives/Button';
import { AnimatedScreen } from '../../components/ui/primitives/AnimatedScreen';
import {
    spacing,
    borderRadius,
    typography,
    useResponsive,
    useTheme,
    useThemedStyles,
    SemanticColors,
} from '../../theme/index';
import { useI18n } from '../../hooks/shared/useI18n';
import { useScrollToFocusedInput } from '../../hooks/shared/useScrollToFocusedInput';

export function LoginScreen({ navigation }: AuthScreenProps<'Login'>) {
    const styles = useThemedStyles(createStyles);
    const { colors } = useTheme();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { login, loginWithGoogle, loading } = useAuth();
    const insets = useSafeAreaInsets();
    const { horizontalPadding, scaleFont } = useResponsive();
    const { t } = useI18n();
    const { scrollRef, createScrollOnFocusHandler } = useScrollToFocusedInput(112);
    const openTerms = () => {
        navigation
            .getParent<NativeStackNavigationProp<RootStackParamList>>()
            ?.navigate('TermsAndConditions');
    };

    const onLogin = async () => {
        await login(email, password);
    };

    const onGoogleLogin = async () => {
        await loginWithGoogle();
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={insets.top}
        >
            <HomeBackground />
            <AnimatedScreen style={styles.flex1} delay={40}>
                <ScrollView
                    ref={scrollRef}
                    contentContainerStyle={[
                        styles.content,
                        {
                            paddingTop: insets.top + spacing.xl,
                            paddingBottom: insets.bottom + spacing['2xl'],
                            paddingHorizontal: horizontalPadding,
                        },
                    ]}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.authShell}>
                        <HeroHeader
                            icon="wallet-outline"
                            title={t('app.name')}
                            subtitle={t('auth.appSubtitle')}
                            containerStyle={styles.hero}
                        />

                        <View style={styles.authCard}>
                            <View style={styles.cardHeading}>
                                <View style={styles.headingIcon}>
                                    <Icon
                                        name="lock-open-outline"
                                        size={20}
                                        color={colors.primaryLight}
                                    />
                                </View>
                                <Text
                                    style={[
                                        styles.cardTitle,
                                        { fontSize: scaleFont(typography.fontSize.xl) },
                                    ]}
                                >
                                    {t('auth.signIn')}
                                </Text>
                            </View>

                            <View style={styles.form}>
                                <Input
                                    label={t('auth.email')}
                                    placeholder={t('auth.emailPlaceholder')}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    value={email}
                                    onChangeText={setEmail}
                                    onFocus={createScrollOnFocusHandler()}
                                    leftContent={(
                                        <Icon
                                            name="mail-outline"
                                            size={20}
                                            color={colors.textMuted}
                                        />
                                    )}
                                />

                                <Input
                                    label={t('auth.password')}
                                    placeholder={t('auth.passwordPlaceholder')}
                                    isPassword
                                    value={password}
                                    onChangeText={setPassword}
                                    onFocus={createScrollOnFocusHandler(132)}
                                    leftContent={(
                                        <Icon
                                            name="key-outline"
                                            size={20}
                                            color={colors.textMuted}
                                        />
                                    )}
                                />

                                <Button
                                    title={t('auth.signIn')}
                                    onPress={onLogin}
                                    loading={loading}
                                    containerStyle={styles.loginButton}
                                />

                                <View style={styles.dividerRow}>
                                    <View style={styles.dividerLine} />
                                    <Text
                                        style={[
                                            styles.dividerText,
                                            { fontSize: scaleFont(typography.fontSize.sm) },
                                        ]}
                                    >
                                        {t('auth.orContinueWith')}
                                    </Text>
                                    <View style={styles.dividerLine} />
                                </View>

                                <TouchableOpacity
                                    style={styles.googleButton}
                                    onPress={onGoogleLogin}
                                    activeOpacity={0.82}
                                    disabled={loading}
                                    testID="google-login-button"
                                    accessibilityRole="button"
                                    accessibilityLabel={t('auth.continueWithGoogle')}
                                >
                                    <View style={styles.googleIconWrap}>
                                        <Icon name="logo-google" size={19} color="#DB4437" />
                                    </View>
                                    <Text
                                        style={[
                                            styles.googleButtonText,
                                            { fontSize: scaleFont(typography.fontSize.md) },
                                        ]}
                                    >
                                        {t('auth.continueWithGoogle')}
                                    </Text>
                                </TouchableOpacity>

                                <Text
                                    style={[
                                        styles.legalNoticeText,
                                        { fontSize: scaleFont(typography.fontSize.xs) },
                                    ]}
                                >
                                    {t('legal.googleNotice')}{' '}
                                    <Text
                                        style={styles.legalNoticeLink}
                                        onPress={openTerms}
                                        accessibilityRole="link"
                                    >
                                        {t('legal.readTerms')}
                                    </Text>
                                </Text>
                            </View>
                        </View>

                        <View style={styles.secondaryActions}>
                            <TouchableOpacity
                                style={styles.footer}
                                onPress={() => navigation.navigate('Register')}
                                activeOpacity={0.8}
                                accessibilityRole="button"
                            >
                                <Text
                                    style={[
                                        styles.footerText,
                                        { fontSize: scaleFont(typography.fontSize.md) },
                                    ]}
                                >
                                    {t('auth.noAccount')}{' '}
                                    <Text style={styles.footerLink}>{t('auth.signUp')}</Text>
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.guestFooter}
                                onPress={() => navigation.getParent()?.goBack()}
                                activeOpacity={0.8}
                                accessibilityRole="button"
                            >
                                <Icon
                                    name="phone-portrait-outline"
                                    size={17}
                                    color={colors.textMuted}
                                />
                                <Text
                                    style={[
                                        styles.guestFooterText,
                                        { fontSize: scaleFont(typography.fontSize.sm) },
                                    ]}
                                >
                                    {t('auth.continueGuest')}
                                </Text>
                                <Icon
                                    name="arrow-forward"
                                    size={16}
                                    color={colors.textMuted}
                                />
                            </TouchableOpacity>
                        </View>
                    </View>
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
    content: {
        flexGrow: 1,
        justifyContent: 'center',
    },
    authShell: {
        width: '100%',
        maxWidth: 480,
        alignSelf: 'center',
    },
    hero: {
        marginBottom: spacing.lg,
    },
    authCard: {
        borderRadius: borderRadius['2xl'],
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surfaceCard,
        padding: spacing.xl,
        shadowColor: colors.overlay,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.18,
        shadowRadius: 24,
        elevation: 7,
    },
    cardHeading: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.lg,
    },
    headingIcon: {
        width: 38,
        height: 38,
        borderRadius: borderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.accentLight,
    },
    cardTitle: {
        flex: 1,
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.bold,
    },
    form: {
        gap: spacing.md,
    },
    loginButton: {
        minHeight: 52,
        marginTop: spacing.xs,
        borderRadius: borderRadius.lg,
    },
    dividerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginVertical: spacing.sm,
    },
    dividerLine: {
        flex: 1,
        height: StyleSheet.hairlineWidth,
        backgroundColor: colors.border,
    },
    dividerText: {
        color: colors.textMuted,
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.medium,
    },
    googleButton: {
        minHeight: 52,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surfaceElevated,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
    },
    googleIconWrap: {
        width: 30,
        height: 30,
        borderRadius: borderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
    },
    googleButtonText: {
        color: colors.textPrimary,
        fontSize: typography.fontSize.md,
        fontWeight: typography.fontWeight.semibold,
    },
    legalNoticeText: {
        color: colors.textMuted,
        textAlign: 'center',
        lineHeight: 18,
        marginTop: spacing.sm,
        paddingHorizontal: spacing.sm,
    },
    legalNoticeLink: {
        color: colors.primaryLight,
        fontWeight: typography.fontWeight.semibold,
    },
    secondaryActions: {
        alignItems: 'center',
        gap: spacing.base,
        marginTop: spacing.xl,
    },
    footer: {
        alignItems: 'center',
        paddingVertical: spacing.xs,
    },
    guestFooter: {
        minHeight: 44,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        borderRadius: borderRadius.full,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surfaceElevated,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
    },
    footerText: {
        fontSize: typography.fontSize.md,
        color: colors.textSecondary,
    },
    footerLink: {
        color: colors.primaryLight,
        fontWeight: typography.fontWeight.bold,
    },
    guestFooterText: {
        color: colors.textMuted,
        fontWeight: typography.fontWeight.medium,
    },
});
