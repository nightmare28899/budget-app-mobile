import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { AnimatedScreen } from '../../components/ui/primitives/AnimatedScreen';
import { useI18n } from '../../hooks/useI18n';
import { termsDocuments } from '../../legal/termsAndConditions';
import {
    borderRadius,
    spacing,
    typography,
    useResponsive,
    useTheme,
    useThemedStyles,
    SemanticColors,
} from '../../theme/index';

export function TermsAndConditionsScreen() {
    const styles = useThemedStyles(createStyles);
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const { t, language } = useI18n();
    const { horizontalPadding, contentMaxWidth, scaleFont } = useResponsive();
    const document = termsDocuments[language];

    return (
        <AnimatedScreen style={styles.container} delay={25}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[
                    styles.content,
                    {
                        paddingTop: spacing.lg,
                        paddingBottom: insets.bottom + spacing['4xl'],
                        paddingHorizontal: horizontalPadding,
                    },
                    contentMaxWidth
                        ? { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }
                        : null,
                ]}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.heroCard}>
                    <View style={styles.heroIconWrap}>
                        <Icon
                            name="document-text-outline"
                            size={24}
                            color={colors.primaryLight}
                        />
                    </View>

                    <Text
                        style={[
                            styles.heroTitle,
                            { fontSize: scaleFont(typography.fontSize['2xl']) },
                        ]}
                    >
                        {t('legal.termsTitle')}
                    </Text>

                    <Text
                        style={[
                            styles.heroSubtitle,
                            { fontSize: scaleFont(typography.fontSize.sm) },
                        ]}
                    >
                        {t('legal.termsSubtitle')}
                    </Text>

                    <View style={styles.metaPill}>
                        <Text
                            style={[
                                styles.metaText,
                                { fontSize: scaleFont(typography.fontSize.xs) },
                            ]}
                        >
                            {t('legal.effectiveDate')}: {document.effectiveDate}
                        </Text>
                    </View>
                </View>

                <View style={styles.leadCard}>
                    <Text
                        style={[
                            styles.leadText,
                            { fontSize: scaleFont(typography.fontSize.sm) },
                        ]}
                    >
                        {document.intro}
                    </Text>
                </View>

                {document.sections.map((section, index) => (
                    <View key={section.title} style={styles.sectionCard}>
                        <View style={styles.sectionHeader}>
                            <View style={styles.sectionIndexWrap}>
                                <Text
                                    style={[
                                        styles.sectionIndex,
                                        { fontSize: scaleFont(typography.fontSize.xs) },
                                    ]}
                                >
                                    {String(index + 1).padStart(2, '0')}
                                </Text>
                            </View>
                            <Text
                                style={[
                                    styles.sectionTitle,
                                    { fontSize: scaleFont(typography.fontSize.base) },
                                ]}
                            >
                                {section.title}
                            </Text>
                        </View>

                        {section.paragraphs.map((paragraph) => (
                            <Text
                                key={paragraph}
                                style={[
                                    styles.sectionBody,
                                    { fontSize: scaleFont(typography.fontSize.sm) },
                                ]}
                            >
                                {paragraph}
                            </Text>
                        ))}
                    </View>
                ))}

                <Text
                    style={[
                        styles.closing,
                        { fontSize: scaleFont(typography.fontSize.sm) },
                    ]}
                >
                    {document.closing}
                </Text>
            </ScrollView>
        </AnimatedScreen>
    );
}

const createStyles = (colors: SemanticColors) =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },
        scrollView: {
            flex: 1,
        },
        content: {
            paddingBottom: spacing['4xl'],
        },
        heroCard: {
            borderRadius: borderRadius.xl,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surfaceCard,
            padding: spacing.xl,
            gap: spacing.base,
            marginBottom: spacing.base,
        },
        heroIconWrap: {
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.primaryAction + '1A',
            borderWidth: 1,
            borderColor: colors.primaryAction + '33',
        },
        heroTitle: {
            color: colors.textPrimary,
            fontWeight: typography.fontWeight.bold,
        },
        heroSubtitle: {
            color: colors.textSecondary,
            lineHeight: 20,
        },
        metaPill: {
            alignSelf: 'flex-start',
            borderRadius: borderRadius.full,
            paddingHorizontal: spacing.base,
            paddingVertical: spacing.xs,
            backgroundColor: colors.surfaceElevated,
            borderWidth: 1,
            borderColor: colors.border,
        },
        metaText: {
            color: colors.textMuted,
            fontWeight: typography.fontWeight.medium,
        },
        leadCard: {
            borderRadius: borderRadius.xl,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            padding: spacing.lg,
            marginBottom: spacing.base,
        },
        leadText: {
            color: colors.textSecondary,
            lineHeight: 21,
        },
        sectionCard: {
            borderRadius: borderRadius.xl,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surfaceCard,
            padding: spacing.lg,
            marginBottom: spacing.base,
            gap: spacing.sm,
        },
        sectionHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
        },
        sectionIndexWrap: {
            minWidth: 34,
            height: 34,
            borderRadius: 17,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.surfaceElevated,
            borderWidth: 1,
            borderColor: colors.border,
        },
        sectionIndex: {
            color: colors.primaryLight,
            fontWeight: typography.fontWeight.bold,
        },
        sectionTitle: {
            flex: 1,
            color: colors.textPrimary,
            fontWeight: typography.fontWeight.semibold,
        },
        sectionBody: {
            color: colors.textSecondary,
            lineHeight: 21,
        },
        closing: {
            color: colors.textMuted,
            textAlign: 'center',
            lineHeight: 20,
            marginTop: spacing.sm,
        },
    });
