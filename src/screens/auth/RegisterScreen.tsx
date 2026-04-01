import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Image,
    TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { AuthScreenProps } from '../../navigation/types';
import { useAuth } from '../../hooks/useAuth';
import { useImagePicker } from '../../hooks/useImagePicker';
import { HeroHeader } from '../../components/ui/HeroHeader';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { AnimatedScreen } from '../../components/ui/AnimatedScreen';
import {
    spacing,
    typography,
    borderRadius,
    useResponsive,
    useTheme,
    useThemedStyles,
} from '../../theme';
import { useI18n } from '../../hooks/useI18n';
import { useScrollToFocusedInput } from '../../hooks/useScrollToFocusedInput';

export function RegisterScreen({ navigation }: AuthScreenProps<'Register'>) {
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const {
        register,
        loading,
        pendingRegistrationsCount,
        isSyncingOfflineRegistrations,
    } = useAuth();

    const { profileImage, setProfileImage, promptPickImage } = useImagePicker();

    const insets = useSafeAreaInsets();
    const { scrollRef, createScrollOnFocusHandler } = useScrollToFocusedInput(112);
    const {
        horizontalPadding,
        contentMaxWidth,
        isSmallPhone,
        scaleFont,
        scaleSize,
    } = useResponsive();

    const onRegister = async () => {
        const success = await register(email, name, password, confirmPassword, profileImage);
        if (success) {
            navigation.getParent()?.goBack();
        }
    };
    const { t, tPlural } = useI18n();

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={insets.top}
        >
            <AnimatedScreen style={styles.flex1} delay={55}>
                <View
                    style={[
                        styles.hero,
                        {
                            paddingTop: insets.top + spacing.base,
                            paddingHorizontal: horizontalPadding,
                        },
                    ]}
                >
                    <HeroHeader
                        icon="person-add-outline"
                        title={t('auth.createAccount')}
                        subtitle={t('auth.createAccountSubtitle')}
                        containerStyle={{ marginBottom: 0 }}
                    />
                </View>

                <ScrollView
                    ref={scrollRef}
                    contentContainerStyle={[
                        styles.content,
                        {
                            paddingBottom: insets.bottom + spacing['3xl'],
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
                    <View style={styles.form}>
                        <View style={styles.avatarContainer}>
                            <TouchableOpacity
                                style={[
                                    styles.avatarButton,
                                    {
                                        width: isSmallPhone ? scaleSize(88, 0.7) : 96,
                                        height: isSmallPhone ? scaleSize(88, 0.7) : 96,
                                        borderRadius: isSmallPhone ? scaleSize(44, 0.7) : 48,
                                    },
                                ]}
                                onPress={promptPickImage}
                                activeOpacity={0.8}
                            >
                                {profileImage?.uri ? (
                                    <Image
                                        source={{ uri: profileImage.uri }}
                                        style={styles.avatarImage}
                                    />
                                ) : (
                                    <Icon
                                        name="person-circle-outline"
                                        size={isSmallPhone ? scaleSize(50, 0.7) : 56}
                                        color={colors.textMuted}
                                    />
                                )}
                            </TouchableOpacity>

                            <View style={styles.avatarActions}>
                                <TouchableOpacity
                                    style={styles.avatarActionButton}
                                    onPress={promptPickImage}
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
                                        {profileImage?.uri ? t('auth.changePhoto') : t('auth.addPhoto')}
                                    </Text>
                                </TouchableOpacity>

                                {profileImage?.uri && (
                                    <TouchableOpacity
                                        onPress={() => setProfileImage(null)}
                                        activeOpacity={0.8}
                                    >
                                        <Text
                                            style={[
                                                styles.removePhotoText,
                                                { fontSize: scaleFont(typography.fontSize.sm) },
                                            ]}
                                        >
                                            {t('auth.removePhoto')}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>

                        <Input
                            label={t('auth.fullName')}
                            placeholder={t('auth.namePlaceholder')}
                            value={name}
                            onChangeText={setName}
                            onFocus={createScrollOnFocusHandler()}
                        />

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

                        <Input
                            label={t('auth.confirmPassword')}
                            placeholder={t('auth.passwordPlaceholder')}
                            isPassword
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            onFocus={createScrollOnFocusHandler(148)}
                        />

                        <Button
                            title={t('auth.createAccountButton')}
                            onPress={onRegister}
                            loading={loading}
                            containerStyle={styles.registerButton}
                        />

                        {pendingRegistrationsCount > 0 && (
                            <View style={styles.offlineNotice}>
                                <Text
                                    style={[
                                        styles.offlineNoticeTitle,
                                        { fontSize: scaleFont(typography.fontSize.sm) },
                                    ]}
                                >
                                    {isSyncingOfflineRegistrations
                                        ? t('auth.syncingPendingRegistrations')
                                        : tPlural('auth.pendingOfflineRegistrations', pendingRegistrationsCount)}
                                </Text>
                                <Text
                                    style={[
                                        styles.offlineNoticeBody,
                                        { fontSize: scaleFont(typography.fontSize.xs) },
                                    ]}
                                >
                                    {t('auth.offlineSavedHint')}
                                </Text>
                            </View>
                        )}
                    </View>

                    <TouchableOpacity
                        style={styles.footer}
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={[styles.footerText, { fontSize: scaleFont(typography.fontSize.md) }]}>
                            {t('auth.alreadyHaveAccount')}{' '}
                            <Text style={styles.footerLink}>{t('auth.signIn')}</Text>
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
        paddingVertical: spacing['2xl'],
    },
    hero: {
        alignItems: 'center',
        paddingBottom: spacing.base,
        backgroundColor: colors.background,
    },
    avatarContainer: {
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.sm,
    },
    avatarButton: {
        width: 96,
        height: 96,
        borderRadius: 48,
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
    avatarActions: {
        alignItems: 'center',
        gap: spacing.xs,
    },
    avatarActionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        backgroundColor: colors.primary,
        borderRadius: borderRadius.full,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
    },
    avatarActionText: {
        color: colors.textPrimary,
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.semibold,
    },
    removePhotoText: {
        color: colors.textMuted,
        fontSize: typography.fontSize.sm,
        textDecorationLine: 'underline',
    },
    form: {
        gap: spacing.md,
    },
    registerButton: {
        marginTop: spacing.sm,
    },
    offlineNotice: {
        marginTop: spacing.base,
        padding: spacing.base,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.primary,
        backgroundColor: colors.surfaceElevated,
        gap: spacing.xs,
    },
    offlineNoticeTitle: {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.semibold,
        color: colors.primaryLight,
    },
    offlineNoticeBody: {
        fontSize: typography.fontSize.xs,
        color: colors.textSecondary,
        lineHeight: 18,
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
