import React from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedScreen } from '../../components/ui/AnimatedScreen';
import { HomeBackground } from '../../components/ui/HomeBackground';
import { ScreenBackButton } from '../../components/ui/ScreenBackButton';
import { PlanAccessSection } from '../../components/profile/PlanAccessSection';
import { useI18n } from '../../hooks/useI18n';
import { RootScreenProps } from '../../navigation/types';
import {
    spacing,
    typography,
    useResponsive,
    useThemedStyles,
} from '../../theme';

export function PlanOverviewScreen({ navigation }: RootScreenProps<'PlanOverview'>) {
    const styles = useThemedStyles(createStyles);
    const insets = useSafeAreaInsets();
    const { t } = useI18n();
    const { horizontalPadding, contentMaxWidth, scaleFont } = useResponsive();

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
        <View style={styles.container}>
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
                    showsVerticalScrollIndicator={false}
                >
                    <PlanAccessSection
                        onOpenPremium={openPremium}
                        onOpenCreditCards={openCreditCards}
                        onOpenLogin={openLogin}
                    />
                </ScrollView>
            </AnimatedScreen>
        </View>
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
});
