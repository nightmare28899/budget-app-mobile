import React, { useMemo, useState } from 'react';
import { StyleSheet, TouchableOpacity, View, Text } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootScreenProps } from '../../navigation/types';
import { AddExpenseScreen } from './AddExpenseScreen';
import { AddSubscriptionScreen } from './AddSubscriptionScreen';
import {
    typography,
    spacing,
    borderRadius,
    useTheme,
    useThemedStyles,
} from '../../theme';
import { withAlpha } from '../../utils/subscriptions';
import { useI18n } from '../../hooks/useI18n';

type AddEntryTab = 'expense' | 'subscription';

export function AddEntryScreen({ route, navigation }: RootScreenProps<'AddEntry'>) {
    const { t } = useI18n();
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);
    const insets = useSafeAreaInsets();

    const initialTab = useMemo<AddEntryTab>(
        () => (route.params?.initialTab === 'subscription' ? 'subscription' : 'expense'),
        [route.params?.initialTab],
    );
    const [activeTab, setActiveTab] = useState<AddEntryTab>(initialTab);

    return (
        <View style={styles.container}>
            <View
                style={[
                    styles.tabHeader,
                    {
                        paddingTop: insets.top + spacing.sm,
                        paddingHorizontal: spacing.base,
                    },
                ]}
            >
                <View style={styles.segmentedControl}>
                    <TouchableOpacity
                        activeOpacity={0.85}
                        style={[
                            styles.segmentButton,
                            activeTab === 'expense' ? styles.segmentButtonActive : null,
                        ]}
                        onPress={() => setActiveTab('expense')}
                    >
                        <Icon
                            name="wallet-outline"
                            size={16}
                            color={activeTab === 'expense' ? colors.textPrimary : colors.textMuted}
                        />
                        <Text
                            style={[
                                styles.segmentLabel,
                                activeTab === 'expense' ? styles.segmentLabelActive : null,
                            ]}
                        >
                            {t('addEntry.expenseTab')}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        activeOpacity={0.85}
                        style={[
                            styles.segmentButton,
                            activeTab === 'subscription' ? styles.segmentButtonActive : null,
                        ]}
                        onPress={() => setActiveTab('subscription')}
                    >
                        <Icon
                            name="card-outline"
                            size={16}
                            color={
                                activeTab === 'subscription'
                                    ? colors.textPrimary
                                    : colors.textMuted
                            }
                        />
                        <Text
                            style={[
                                styles.segmentLabel,
                                activeTab === 'subscription' ? styles.segmentLabelActive : null,
                            ]}
                        >
                            {t('addEntry.subscriptionTab')}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.formContainer}>
                {activeTab === 'expense' ? (
                    <AddExpenseScreen
                        navigation={navigation as any}
                        route={{
                            key: 'AddExpense',
                            name: 'AddExpense',
                            params: { embedded: true },
                        } as any}
                    />
                ) : (
                    <AddSubscriptionScreen
                        navigation={navigation as any}
                        route={{
                            key: 'AddSubscription',
                            name: 'AddSubscription',
                            params: { embedded: true },
                        } as any}
                    />
                )}
            </View>
        </View>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    tabHeader: {
        paddingBottom: spacing.xs,
    },
    segmentedControl: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: borderRadius.full,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: withAlpha(colors.surfaceElevated, 0.72),
        padding: 4,
    },
    segmentButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: borderRadius.full,
        paddingVertical: spacing.sm,
    },
    segmentButtonActive: {
        backgroundColor: withAlpha(colors.primary, 0.26),
        borderWidth: 1,
        borderColor: withAlpha(colors.primary, 0.5),
    },
    segmentLabel: {
        marginLeft: spacing.xs,
        color: colors.textMuted,
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.semibold,
    },
    segmentLabelActive: {
        color: colors.textPrimary,
    },
    formContainer: {
        flex: 1,
    },
});
