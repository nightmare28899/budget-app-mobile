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
import { useAuth } from '../../hooks/useAuth';
import { HeroHeader } from '../../components/ui/layout/HeroHeader';
import { Input } from '../../components/ui/primitives/Input';
import { Button } from '../../components/ui/primitives/Button';
import { AnimatedScreen } from '../../components/ui/primitives/AnimatedScreen';
import {
    spacing,
    typography,
    useResponsive,
    useThemedStyles,
    SemanticColors,
} from '../../theme/index';
import { useI18n } from '../../hooks/useI18n';
import { useScrollToFocusedInput } from '../../hooks/useScrollToFocusedInput';

export function LoginScreen({ navigation }: AuthScreenProps<'Login'>) {
    const styles = useThemedStyles(createStyles);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { login, loginWithGoogle, loading } = useAuth();
    const insets = useSafeAreaInsets();
    const { horizontalPadding, contentMaxWidth, scaleFont } = useResponsive();
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
                        contentMaxWidth
                            ? { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }
                            : null,
                    ]}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
                >
                    <HeroHeader
                        icon="wallet-outline"
                        title={t('app.name')}
                        subtitle={t('auth.appSubtitle')}
                    />

                    <View style={styles.form}>
                        <Input
                            label={t('auth.email')}
                            placeholder={t('auth.emailPlaceholder')}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            value={email}
                            onChangeText={setEmail}
                            onFocus={createScrollOnFocusHandler()}
                        />

                        <Input
                            label={t('auth.password')}
                            placeholder={t('auth.passwordPlaceholder')}
                            isPassword
                            value={password}
                            onChangeText={setPassword}
                            onFocus={createScrollOnFocusHandler(132)}
                        />

                        <Button
                            title={t('auth.signIn')}
                            onPress={onLogin}
                            loading={loading}
                            containerStyle={styles.loginButton}
                        />

                        <View style={styles.dividerRow}>
                            <View style={styles.dividerLine} />
                            <Text style={[styles.dividerText, { fontSize: scaleFont(typography.fontSize.sm) }]}>
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
                            <Icon name="logo-google" size={20} color="#DB4437" />
                            <Text style={[styles.googleButtonText, { fontSize: scaleFont(typography.fontSize.md) }]}>
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
                            <Text style={styles.legalNoticeLink} onPress={openTerms}>
                                {t('legal.readTerms')}
                            </Text>
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={styles.footer}
                        onPress={() => navigation.navigate('Register')}
                    >
                        <Text style={[styles.footerText, { fontSize: scaleFont(typography.fontSize.md) }]}>
                            {t('auth.noAccount')}{' '}
                            <Text style={styles.footerLink}>{t('auth.signUp')}</Text>
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.guestFooter}
                        onPress={() => navigation.getParent()?.goBack()}
                    >
                        <Text style={[styles.guestFooterText, { fontSize: scaleFont(typography.fontSize.sm) }]}>
                            {t('auth.continueGuest')}
                        </Text>
                    </TouchableOpacity>
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
    form: {
        gap: spacing.base,
    },
    loginButton: {
        marginTop: spacing.sm,
    },
    dividerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginTop: spacing.base,
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
        minHeight: 48,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#D1D5DB',
        backgroundColor: '#FFFFFF',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
    },
    googleButtonText: {
        color: '#111827',
        fontSize: typography.fontSize.md,
        fontWeight: typography.fontWeight.semibold,
    },
    legalNoticeText: {
        color: colors.textMuted,
        textAlign: 'center',
        lineHeight: 18,
        marginTop: spacing.xs,
        paddingHorizontal: spacing.xs,
    },
    legalNoticeLink: {
        color: colors.primaryLight,
        fontWeight: typography.fontWeight.semibold,
    },
    footer: {
        alignItems: 'center',
        marginTop: spacing['2xl'],
    },
    guestFooter: {
        alignItems: 'center',
        marginTop: spacing.base,
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
