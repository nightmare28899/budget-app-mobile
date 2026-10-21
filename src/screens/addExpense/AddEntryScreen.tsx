import { QuickAddLifecycleContext, useQuickAddLifecycle } from '../../hooks/quickAdd/useQuickAddLifecycle';
import React, { useMemo, useState } from 'react';
import {
    Animated,
    Dimensions,
    PanResponder,
    Platform,
    StyleSheet,
    TouchableOpacity,
    View,
    Text,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootScreenProps } from '../../navigation/types';
import { AddExpenseScreen } from './AddExpenseScreen';
import { AddIncomeScreen } from './AddIncomeScreen';
import { AddSubscriptionScreen } from './AddSubscriptionScreen';
import {
    typography,
    spacing,
    borderRadius,
    useTheme,
    useThemedStyles,
    SemanticColors,
} from '../../theme/index';
import { withAlpha } from '../../utils/domain/subscriptions';
import { useI18n } from '../../hooks/shared/useI18n';

type AddEntryTab = 'expense' | 'income' | 'subscription';

export function AddEntryScreen({ route, navigation }: RootScreenProps<'AddEntry'>) {
    const { t } = useI18n();
    const lifecycle = useQuickAddLifecycle(navigation);
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);
    const insets = useSafeAreaInsets();

    const initialTab = useMemo<AddEntryTab>(
        () => {
            if (route.params?.initialTab === 'subscription') {
                return 'subscription';
            }

            if (route.params?.initialTab === 'income') {
                return 'income';
            }

            return 'expense';
        },
        [route.params?.initialTab],
    );
    const [activeTab, setActiveTab] = useState<AddEntryTab>(initialTab);
    const isAndroid = Platform.OS === 'android';
    const isIos = Platform.OS === 'ios';
    const canDragSheet = isAndroid || isIos;
    const enableVisualDragFx = isIos;
    const screenHeight = Dimensions.get('window').height;
    const translateY = useMemo(() => new Animated.Value(0), []);
    const dragScale = useMemo(
        () =>
            translateY.interpolate({
                inputRange: [0, screenHeight],
                outputRange: [1, 0.97],
                extrapolate: 'clamp',
            }),
        [screenHeight, translateY],
    );
    const dragOpacity = useMemo(
        () =>
            translateY.interpolate({
                inputRange: [0, screenHeight * 0.85, screenHeight],
                outputRange: [1, 0.98, 0.9],
                extrapolate: 'clamp',
            }),
        [screenHeight, translateY],
    );
    const closeGesture = useMemo(
        () =>
            PanResponder.create({
                onMoveShouldSetPanResponder: (_evt, gestureState) =>
                    canDragSheet
                    && gestureState.dy > 10
                    && Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
                onPanResponderMove: (_evt, gestureState) => {
                    if (!canDragSheet) {
                        return;
                    }
                    const nextOffset = Math.max(0, gestureState.dy * 0.92);
                    translateY.setValue(nextOffset);
                },
                onPanResponderTerminate: () => translateY.setValue(0),
                onPanResponderRelease: (_evt, gestureState) => {
                    if (!canDragSheet) {
                        return;
                    }
                    const shouldClose = gestureState.dy > (isIos ? 72 : 88) || gestureState.vy > 1;
                    if (shouldClose) {
                        translateY.setValue(0);
                        lifecycle.request(() => navigation.goBack());
                        return;
                    }

                    Animated.spring(translateY, {
                        toValue: 0,
                        bounciness: 0,
                        speed: 18,
                        useNativeDriver: true,
                    }).start();
                },
            }),
        [canDragSheet, isIos, navigation, translateY, lifecycle],
    );
    const expenseRoute: RootScreenProps<'AddExpense'>['route'] = {
        key: 'AddExpenseEmbedded',
        name: 'AddExpense',
        params: { embedded: true },
    };
    const incomeRoute: RootScreenProps<'AddIncome'>['route'] = {
        key: 'AddIncomeEmbedded',
        name: 'AddIncome',
        params: { embedded: true },
    };
    const subscriptionRoute: RootScreenProps<'AddSubscription'>['route'] = {
        key: 'AddSubscriptionEmbedded',
        name: 'AddSubscription',
        params: { embedded: true },
    };
    const dragStyle = {
        opacity: enableVisualDragFx ? dragOpacity : 1,
        transform: [
            { translateY },
            ...(enableVisualDragFx ? [{ scale: dragScale }] : []),
        ],
    };

    return (
        <QuickAddLifecycleContext.Provider value={lifecycle.channel}>
        <Animated.View
            style={[
                styles.container,
                dragStyle,
            ]}
        >
            <View style={styles.sheetSurface}>
                <View
                    style={[
                        styles.tabHeader,
                        {
                            paddingTop:
                                Platform.OS === 'ios'
                                    ? spacing.xs
                                    : Math.max(insets.top + spacing.sm, spacing['2xl']),
                            paddingHorizontal: spacing.base,
                        },
                    ]}
                    {...closeGesture.panHandlers}
                >
                    {Platform.OS === 'ios' || Platform.OS === 'android' ? (
                        <View style={styles.sheetHandleWrap}>
                            <View style={styles.sheetHandle} />
                        </View>
                    ) : null}
                    <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('quickAdd.close')}
                        onPress={() => lifecycle.request(() => navigation.goBack())}
                        style={styles.closeButton}>
                        <Icon name="close-outline" size={24} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <View style={styles.headerRow}>
                        <View style={styles.segmentedControl}>
                            <TouchableOpacity
                                activeOpacity={0.85}
                                style={[
                                    styles.segmentButton,
                                    activeTab === 'expense' ? styles.segmentButtonActive : null,
                                ]}
                                onPress={() => { if (activeTab !== 'expense') { lifecycle.request(() => { lifecycle.startForm(); setActiveTab('expense'); }); } }}
                                accessibilityRole="button"
                                accessibilityState={{ selected: activeTab === 'expense' }}
                            >
                                <Icon
                                    name="wallet-outline"
                                    size={20}
                                    color={activeTab === 'expense' ? colors.textPrimary : colors.textSecondary}
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
                                    activeTab === 'income' ? styles.segmentButtonActive : null,
                                ]}
                                onPress={() => { if (activeTab !== 'income') { lifecycle.request(() => { lifecycle.startForm(); setActiveTab('income'); }); } }}
                                accessibilityRole="button"
                                accessibilityState={{ selected: activeTab === 'income' }}
                            >
                                <Icon
                                    name="trending-up-outline"
                                    size={20}
                                    color={activeTab === 'income' ? colors.textPrimary : colors.textSecondary}
                                />
                                <Text
                                    style={[
                                        styles.segmentLabel,
                                        activeTab === 'income' ? styles.segmentLabelActive : null,
                                    ]}
                                >
                                    {t('addEntry.incomeTab')}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                activeOpacity={0.85}
                                style={[
                                    styles.segmentButton,
                                    activeTab === 'subscription' ? styles.segmentButtonActive : null,
                                ]}
                                onPress={() => { if (activeTab !== 'subscription') { lifecycle.request(() => { lifecycle.startForm(); setActiveTab('subscription'); }); } }}
                                accessibilityRole="button"
                                accessibilityState={{ selected: activeTab === 'subscription' }}
                            >
                                <Icon
                                    name="card-outline"
                                    size={20}
                                    color={
                                        activeTab === 'subscription'
                                            ? colors.textPrimary
                                            : colors.textSecondary
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
                </View>

                <View style={styles.formContainer}>
                    {activeTab === 'expense' ? (
                        <AddExpenseScreen key="AddExpenseScreen"
                            navigation={navigation as RootScreenProps<'AddExpense'>['navigation']}
                            route={expenseRoute}
                        />
                    ) : activeTab === 'income' ? (
                        <AddIncomeScreen key="AddIncomeScreen"
                            navigation={navigation as RootScreenProps<'AddIncome'>['navigation']}
                            route={incomeRoute}
                        />
                    ) : (
                        <AddSubscriptionScreen key="AddSubscriptionScreen"
                            navigation={navigation as RootScreenProps<'AddSubscription'>['navigation']}
                            route={subscriptionRoute}
                        />
                    )}
                </View>
            </View>
        </Animated.View>
        </QuickAddLifecycleContext.Provider>
    );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Platform.OS === 'android' ? 'transparent' : colors.background,
    },
    sheetSurface: {
        flex: 1,
        backgroundColor: colors.background,
    },
    closeButton: { alignSelf: 'flex-end', minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
    tabHeader: {
        paddingBottom: spacing.md,
    },
    sheetHandleWrap: {
        alignItems: 'center',
        marginBottom: Platform.OS === 'ios' ? spacing.base : spacing.sm,
    },
    sheetHandle: {
        width: 32,
        height: 4,
        borderRadius: borderRadius.full,
        backgroundColor: withAlpha(colors.textMuted, 0.75),
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    segmentedControl: {
        minHeight: 56,
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: borderRadius.full,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: withAlpha(colors.surfaceElevated, 0.72),
        padding: 4,
    },
    segmentButton: {
        minHeight: 48,
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
        color: colors.textSecondary,
        fontSize: typography.fontSize.md,
        fontWeight: typography.fontWeight.semibold,
    },
    segmentLabelActive: {
        color: colors.textPrimary,
    },
    formContainer: {
        flex: 1,
        paddingTop: 0,
    },
});
