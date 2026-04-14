import React from 'react';
import {
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { AnimatedScreen } from '../../components/ui/primitives/AnimatedScreen';
import { Button } from '../../components/ui/primitives/Button';
import { EmptyState } from '../../components/ui/primitives/EmptyState';
import { HomeBackground } from '../../components/ui/layout/HomeBackground';
import { ScreenBackButton } from '../../components/ui/primitives/ScreenBackButton';
import { useNotificationCenter } from '../../hooks/useNotificationCenter';
import { useI18n } from '../../hooks/useI18n';
import { MainDrawerScreenProps } from '../../navigation/types';
import {
    borderRadius,
    spacing,
    typography,
    useResponsive,
    useTheme,
    useThemedStyles,
    SemanticColors,
} from '../../theme/index';
import { withAlpha } from '../../utils/domain/subscriptions';

export function NotificationsScreen({
    navigation,
}: MainDrawerScreenProps<'Notifications'>) {
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);
    const { t } = useI18n();
    const { horizontalPadding, contentMaxWidth, scaleFont } = useResponsive();
    const {
        attentionItems,
        suggestionItems,
        summary,
        isLoading,
        hasError,
        refetch,
    } = useNotificationCenter();

    const constrainedContentStyle = contentMaxWidth
        ? { maxWidth: contentMaxWidth, alignSelf: 'center' as const, width: '100%' as const }
        : null;

    const handleBackPress = () => {
        if (navigation.canGoBack()) {
            navigation.goBack();
            return;
        }

        navigation.navigate('Tabs', { screen: 'Dashboard' });
    };

    const handleActionPress = (item: (typeof attentionItems)[number] | (typeof suggestionItems)[number]) => {
        if (item.action === 'add-income') {
            navigation.navigate('AddEntry', { initialTab: 'income' });
            return;
        }

        if (item.action === 'open-analytics') {
            navigation.navigate('Tabs', { screen: 'Analytics' });
            return;
        }

        if (item.action === 'open-category-budgets') {
            navigation.navigate('CategoryBudgets');
            return;
        }

        if (item.action === 'open-credit-cards') {
            navigation.navigate('CreditCards');
            return;
        }

        if (item.action === 'open-subscriptions') {
            navigation.navigate('Subscriptions');
            return;
        }

        if (item.action === 'open-upcoming-subscriptions') {
            navigation.navigate('UpcomingSubscriptions', { upcomingDays: 7 });
            return;
        }

        if (item.action === 'open-savings-goal' && item.goalId) {
            navigation.navigate('SavingsGoalDetail', {
                goalId: item.goalId,
                title: item.goalTitle,
            });
            return;
        }

        navigation.navigate('Savings');
    };

    const renderSection = (
        title: string,
        items: typeof attentionItems,
        emptyLabel: string,
    ) => {
        if (!items.length) {
            return (
                <View style={styles.sectionEmpty}>
                    <Text
                        style={[
                            styles.sectionEmptyText,
                            { fontSize: scaleFont(typography.fontSize.sm) },
                        ]}
                    >
                        {emptyLabel}
                    </Text>
                </View>
            );
        }

        return (
            <View style={styles.section}>
                <Text
                    style={[
                        styles.sectionTitle,
                        { fontSize: scaleFont(typography.fontSize.lg) },
                    ]}
                >
                    {title}
                </Text>

                {items.map((item) => {
                    const toneColor = item.tone === 'danger'
                        ? colors.error
                        : item.tone === 'warning'
                            ? colors.warning
                            : item.tone === 'success'
                                ? colors.success
                                : colors.primaryAction;

                    return (
                        <View
                            key={item.id}
                            style={[
                                styles.itemCard,
                                {
                                    borderColor: withAlpha(toneColor, 0.32),
                                },
                            ]}
                        >
                            <View style={styles.itemHeader}>
                                <View
                                    style={[
                                        styles.itemIconWrap,
                                        { backgroundColor: withAlpha(toneColor, 0.16) },
                                    ]}
                                >
                                    <Icon name={item.icon} size={20} color={toneColor} />
                                </View>
                                <View style={styles.itemCopy}>
                                    <Text
                                        style={[
                                            styles.itemTitle,
                                            { fontSize: scaleFont(typography.fontSize.base) },
                                        ]}
                                    >
                                        {item.title}
                                    </Text>
                                    <Text
                                        style={[
                                            styles.itemDescription,
                                            { fontSize: scaleFont(typography.fontSize.sm) },
                                        ]}
                                    >
                                        {item.description}
                                    </Text>
                                </View>
                            </View>
                            <Button
                                title={item.ctaLabel}
                                onPress={() => handleActionPress(item)}
                                containerStyle={styles.itemButton}
                            />
                        </View>
                    );
                })}
            </View>
        );
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
                        constrainedContentStyle,
                    ]}
                >
                    <View style={styles.headerRow}>
                        <ScreenBackButton onPress={handleBackPress} />
                        <View style={styles.headerCopy}>
                            <Text
                                style={[
                                    styles.headerTitle,
                                    { fontSize: scaleFont(typography.fontSize['2xl']) },
                                ]}
                            >
                                {t('notifications.title')}
                            </Text>
                            <Text
                                style={[
                                    styles.headerSubtitle,
                                    { fontSize: scaleFont(typography.fontSize.sm) },
                                ]}
                            >
                                {t('notifications.subtitle')}
                            </Text>
                        </View>
                    </View>
                </View>

                <ScrollView
                    contentContainerStyle={[
                        styles.content,
                        {
                            paddingHorizontal: horizontalPadding,
                            paddingBottom: insets.bottom + spacing['4xl'],
                        },
                        constrainedContentStyle,
                    ]}
                    refreshControl={
                        <RefreshControl
                            refreshing={isLoading}
                            onRefresh={refetch}
                            tintColor={colors.primaryAction}
                            colors={[colors.primaryAction]}
                        />
                    }
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.summaryCard}>
                        <View style={styles.summaryMetric}>
                            <Text
                                style={[
                                    styles.summaryLabel,
                                    { fontSize: scaleFont(typography.fontSize.xs) },
                                ]}
                            >
                                {t('notifications.summaryTotal')}
                            </Text>
                            <Text
                                style={[
                                    styles.summaryValue,
                                    { fontSize: scaleFont(typography.fontSize.lg) },
                                ]}
                            >
                                {summary.total}
                            </Text>
                        </View>
                        <View style={styles.summaryMetric}>
                            <Text
                                style={[
                                    styles.summaryLabel,
                                    { fontSize: scaleFont(typography.fontSize.xs) },
                                ]}
                            >
                                {t('notifications.summaryAttention')}
                            </Text>
                            <Text
                                style={[
                                    styles.summaryValue,
                                    { fontSize: scaleFont(typography.fontSize.lg) },
                                ]}
                            >
                                {summary.attentionCount}
                            </Text>
                        </View>
                        <View style={styles.summaryMetric}>
                            <Text
                                style={[
                                    styles.summaryLabel,
                                    { fontSize: scaleFont(typography.fontSize.xs) },
                                ]}
                            >
                                {t('notifications.summarySuggestions')}
                            </Text>
                            <Text
                                style={[
                                    styles.summaryValue,
                                    { fontSize: scaleFont(typography.fontSize.lg) },
                                ]}
                            >
                                {summary.suggestionCount}
                            </Text>
                        </View>
                    </View>

                    {hasError ? (
                        <TouchableOpacity
                            style={styles.errorCard}
                            activeOpacity={0.82}
                            onPress={refetch}
                        >
                            <Icon name="refresh-outline" size={18} color={colors.textPrimary} />
                            <Text
                                style={[
                                    styles.errorText,
                                    { fontSize: scaleFont(typography.fontSize.sm) },
                                ]}
                            >
                                {t('notifications.loadError')}
                            </Text>
                        </TouchableOpacity>
                    ) : null}

                    {summary.total === 0 && !isLoading ? (
                        <EmptyState
                            icon="notifications-outline"
                            title={t('notifications.emptyTitle')}
                            description={t('notifications.emptyDescription')}
                        />
                    ) : (
                        <>
                            {renderSection(
                                t('notifications.attentionSection'),
                                attentionItems,
                                t('notifications.attentionEmpty'),
                            )}
                            {renderSection(
                                t('notifications.suggestionSection'),
                                suggestionItems,
                                t('notifications.suggestionEmpty'),
                            )}
                        </>
                    )}
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
    header: {
        paddingBottom: spacing.base,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.base,
    },
    headerCopy: {
        flex: 1,
    },
    headerTitle: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.bold,
    },
    headerSubtitle: {
        color: colors.textMuted,
        marginTop: spacing.xs,
        lineHeight: 20,
    },
    content: {
        gap: spacing.base,
    },
    summaryCard: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    summaryMetric: {
        flex: 1,
        backgroundColor: colors.surfaceElevated,
        borderRadius: borderRadius.xl,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.base,
        gap: spacing.xs,
    },
    summaryLabel: {
        color: colors.textMuted,
        fontWeight: typography.fontWeight.medium,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    summaryValue: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.bold,
    },
    errorCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: colors.surfaceElevated,
        borderRadius: borderRadius.xl,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.base,
    },
    errorText: {
        color: colors.textPrimary,
        flex: 1,
    },
    section: {
        gap: spacing.sm,
    },
    sectionTitle: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.semibold,
    },
    sectionEmpty: {
        backgroundColor: colors.surfaceElevated,
        borderRadius: borderRadius.xl,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.base,
    },
    sectionEmptyText: {
        color: colors.textMuted,
    },
    itemCard: {
        backgroundColor: colors.surfaceElevated,
        borderRadius: borderRadius.xl,
        borderWidth: 1,
        padding: spacing.base,
        gap: spacing.base,
    },
    itemHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.base,
    },
    itemIconWrap: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    itemCopy: {
        flex: 1,
        gap: spacing.xs,
    },
    itemTitle: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.semibold,
    },
    itemDescription: {
        color: colors.textSecondary,
        lineHeight: 20,
    },
    itemButton: {
        minHeight: 42,
    },
});
