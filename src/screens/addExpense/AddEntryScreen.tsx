import React, { useMemo, useState } from 'react';
import {
    Animated,
    Dimensions,
    Easing,
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
import { useI18n } from '../../hooks/useI18n';

type AddEntryTab = 'expense' | 'income' | 'subscription';

export function AddEntryScreen({ route, navigation }: RootScreenProps<'AddEntry'>) {
    const { t } = useI18n();
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
                onPanResponderRelease: (_evt, gestureState) => {
                    if (!canDragSheet) {
                        return;
                    }
                    const shouldClose = gestureState.dy > (isIos ? 72 : 88) || gestureState.vy > 1;
                    if (shouldClose) {
                        Animated.timing(translateY, {
                            toValue: screenHeight,
                            duration: 220,
                            easing: Easing.out(Easing.cubic),
                            useNativeDriver: true,
                        }).start(() => navigation.goBack());
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
        [canDragSheet, isIos, navigation, screenHeight, translateY],
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

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    opacity: enableVisualDragFx ? dragOpacity : 1,
                    transform: [
                        { translateY },
                        ...(enableVisualDragFx ? [{ scale: dragScale }] : []),
                    ],
                },
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
                    <View style={styles.headerRow}>
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
                                    activeTab === 'income' ? styles.segmentButtonActive : null,
                                ]}
                                onPress={() => setActiveTab('income')}
                            >
                                <Icon
                                    name="trending-up-outline"
                                    size={16}
                                    color={activeTab === 'income' ? colors.textPrimary : colors.textMuted}
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
                </View>

                <View style={styles.formContainer}>
                    {activeTab === 'expense' ? (
                        <AddExpenseScreen
                            navigation={navigation as RootScreenProps<'AddExpense'>['navigation']}
                            route={expenseRoute}
                        />
                    ) : activeTab === 'income' ? (
                        <AddIncomeScreen
                            navigation={navigation as RootScreenProps<'AddIncome'>['navigation']}
                            route={incomeRoute}
                        />
                    ) : (
                        <AddSubscriptionScreen
                            navigation={navigation as RootScreenProps<'AddSubscription'>['navigation']}
                            route={subscriptionRoute}
                        />
                    )}
                </View>
            </View>
        </Animated.View>
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
    tabHeader: {
        paddingBottom: 0,
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
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: borderRadius.full,
        paddingVertical: spacing.xs,
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
        paddingTop: spacing.xs,
    },
});
