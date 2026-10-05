import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { RootScreenProps } from '../../navigation/types';
import { AnimatedScreen } from '../../components/ui/primitives/AnimatedScreen';
import { HomeBackground } from '../../components/ui/layout/HomeBackground';
import { Button } from '../../components/ui/primitives/Button';
import { CreditCardSelector } from '../../components/ui/domain/CreditCardSelector';
import { PremiumFeatureGate } from '../../components/premium/PremiumFeatureGate';
import { StatementScreenHeader } from '../../components/statements/StatementScreenHeader';
import { useAppAlert } from '../../components/alerts/AlertProvider';
import { useCreditCardsCatalog } from '../../hooks/creditCards/useCreditCardsCatalog';
import { usePremiumAccess } from '../../hooks/access/usePremiumAccess';
import { useStatementUpload } from '../../hooks/statements/useStatementUpload';
import { useI18n } from '../../hooks/shared/useI18n';
import { formatFileSize } from '../../modules/statements/statementFormat';
import {
    borderRadius,
    spacing,
    typography,
    useResponsive,
    useTheme,
    useThemedStyles,
    SemanticColors,
} from '../../theme/index';

export function StatementUploadScreen({ navigation, route }: RootScreenProps<'StatementUpload'>) {
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);
    const insets = useSafeAreaInsets();
    const { t } = useI18n();
    const { alert } = useAppAlert();
    const { hasPremium } = usePremiumAccess();
    const { horizontalPadding, contentMaxWidth, scaleFont } = useResponsive();
    const { cards, isLoading: isLoadingCards } = useCreditCardsCatalog({ enabled: hasPremium });
    const { file, progress, errorMessage, isUploading, choosePdf, clearFile, upload } =
        useStatementUpload();
    const [cardId, setCardId] = useState<string | undefined>(route.params?.creditCardId);

    if (!hasPremium) {
        return (
            <PremiumFeatureGate
                feature="statement_imports"
                onClose={() => navigation.goBack()}
                onContinueToAuth={() => navigation.navigate('Auth', { screen: 'Login' })}
            />
        );
    }

    // A single active card needs no choosing.
    const selectedCardId = cardId ?? (cards.length === 1 ? cards[0].id : undefined);
    const sizeLabel = formatFileSize(file?.size);
    const canUpload = Boolean(file && selectedCardId) && !isUploading;
    const processing = isUploading && progress >= 1;
    const contentMaxWidthStyle = contentMaxWidth
        ? { maxWidth: contentMaxWidth, alignSelf: 'center' as const, width: '100%' as const }
        : null;

    const handleUpload = async () => {
        const result = await upload(selectedCardId);
        if (!result) {
            return;
        }
        if (result.duplicate) {
            alert(t('statements.duplicateTitle'), t('statements.duplicate'));
        }
        navigation.replace('StatementDetail', { id: result.id });
    };

    return (
        <View style={styles.container}>
            <HomeBackground />
            <AnimatedScreen style={styles.flex1} delay={20}>
                <StatementScreenHeader
                    title={t('statements.uploadTitle')}
                    subtitle={t('statements.uploadSubtitle')}
                    onBack={() => navigation.goBack()}
                />
                <ScrollView
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={[
                        styles.content,
                        {
                            paddingHorizontal: horizontalPadding,
                            paddingBottom: insets.bottom + spacing['4xl'],
                        },
                        contentMaxWidthStyle,
                    ]}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.card}>
                        <Text style={[styles.step, { fontSize: scaleFont(typography.fontSize.xs) }]}>
                            {t('statements.step1')}
                        </Text>
                        <CreditCardSelector
                            label={t('statements.chooseCard')}
                            value={selectedCardId}
                            cards={cards}
                            isLoading={isLoadingCards}
                            onChange={setCardId}
                            onAddCard={() => navigation.navigate('CreditCardForm')}
                        />
                    </View>

                    <View style={styles.card}>
                        <Text style={[styles.step, { fontSize: scaleFont(typography.fontSize.xs) }]}>
                            {t('statements.step2')}
                        </Text>
                        {file ? (
                            <View style={styles.fileRow}>
                                <View style={styles.fileIcon}>
                                    <Icon name="document-text-outline" size={22} color={colors.primaryAction} />
                                </View>
                                <View style={styles.fileMeta}>
                                    <Text
                                        style={[styles.fileName, { fontSize: scaleFont(typography.fontSize.base) }]}
                                        numberOfLines={1}
                                    >
                                        {file.name}
                                    </Text>
                                    {sizeLabel ? (
                                        <Text style={[styles.fileSize, { fontSize: scaleFont(typography.fontSize.xs) }]}>
                                            {sizeLabel}
                                        </Text>
                                    ) : null}
                                </View>
                                {!isUploading ? (
                                    <TouchableOpacity
                                        onPress={clearFile}
                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                        accessibilityRole="button"
                                        accessibilityLabel={t('common.remove')}
                                    >
                                        <Icon name="close-circle" size={22} color={colors.textMuted} />
                                    </TouchableOpacity>
                                ) : null}
                            </View>
                        ) : null}
                        <Button
                            title={file ? t('statements.changePdf') : t('statements.choosePdf')}
                            variant="secondary"
                            onPress={choosePdf}
                            disabled={isUploading}
                        />
                        <Text style={[styles.hint, { fontSize: scaleFont(typography.fontSize.xs) }]}>
                            {t('statements.fileHint')}
                        </Text>
                    </View>

                    {errorMessage ? (
                        <View style={styles.errorBox}>
                            <Icon name="alert-circle-outline" size={18} color={colors.error} />
                            <Text style={[styles.errorText, { fontSize: scaleFont(typography.fontSize.sm) }]}>
                                {errorMessage}
                            </Text>
                        </View>
                    ) : null}

                    {isUploading ? (
                        <View style={styles.progressWrap}>
                            <View style={styles.progressTrack}>
                                <View
                                    style={[
                                        styles.progressFill,
                                        { width: `${Math.round((processing ? 1 : progress) * 100)}%` },
                                    ]}
                                />
                            </View>
                            <Text style={[styles.hint, { fontSize: scaleFont(typography.fontSize.xs) }]}>
                                {processing
                                    ? t('statements.processing')
                                    : t('statements.uploading', { percent: Math.round(progress * 100) })}
                            </Text>
                        </View>
                    ) : null}

                    <Button
                        title={t('statements.uploadAction')}
                        onPress={handleUpload}
                        disabled={!canUpload}
                        loading={isUploading}
                    />
                </ScrollView>
            </AnimatedScreen>
        </View>
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
        gap: spacing.base,
        paddingTop: spacing.sm,
    },
    card: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.xl,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.base,
        gap: spacing.sm,
    },
    step: {
        color: colors.primaryAction,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        fontWeight: typography.fontWeight.semibold,
    },
    fileRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: colors.surfaceElevated,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.sm,
    },
    fileIcon: {
        width: 40,
        height: 40,
        borderRadius: borderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surface,
    },
    fileMeta: {
        flex: 1,
    },
    fileName: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.semibold,
    },
    fileSize: {
        color: colors.textMuted,
    },
    hint: {
        color: colors.textMuted,
        lineHeight: 18,
    },
    errorBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.sm,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.error,
        padding: spacing.base,
    },
    errorText: {
        flex: 1,
        color: colors.error,
        lineHeight: 20,
    },
    progressWrap: {
        gap: spacing.xs,
    },
    progressTrack: {
        height: 6,
        borderRadius: borderRadius.full,
        backgroundColor: colors.surfaceElevated,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: borderRadius.full,
        backgroundColor: colors.primaryAction,
    },
});
