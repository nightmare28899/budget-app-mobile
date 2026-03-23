import React, { useState } from 'react';
import {
    View,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    TouchableOpacity,
    Text,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthScreenProps } from '../../navigation/types';
import { useAuth } from '../../hooks/useAuth';
import { HeroHeader } from '../../components/ui/HeroHeader';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { AnimatedScreen } from '../../components/ui/AnimatedScreen';
import {
    spacing,
    typography,
    useResponsive,
    useThemedStyles,
} from '../../theme';
import { useI18n } from '../../hooks/useI18n';

export function LoginScreen({ navigation }: AuthScreenProps<'Login'>) {
    const styles = useThemedStyles(createStyles);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { login, loading } = useAuth();
    const insets = useSafeAreaInsets();
    const { horizontalPadding, contentMaxWidth, scaleFont } = useResponsive();
    const { t } = useI18n();

    const onLogin = async () => {
        await login(email, password);
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={insets.top}
        >
            <AnimatedScreen style={styles.flex1} delay={40}>
                <ScrollView
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
                        />

                        <Input
                            label={t('auth.password')}
                            placeholder={t('auth.passwordPlaceholder')}
                            isPassword
                            value={password}
                            onChangeText={setPassword}
                        />

                        <Button
                            title={t('auth.signIn')}
                            onPress={onLogin}
                            loading={loading}
                            containerStyle={styles.loginButton}
                        />
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
    footer: {
        alignItems: 'center',
        marginTop: spacing['2xl'],
    },
    footerText: {
        fontSize: typography.fontSize.md,
        color: colors.textSecondary,
    },
    footerLink: {
        color: colors.primaryLight,
        fontWeight: typography.fontWeight.bold,
    },
});
