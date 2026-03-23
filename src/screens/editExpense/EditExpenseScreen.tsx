import React, { useCallback, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';
import { RootScreenProps } from '../../navigation/types';
import { useExpenseForm } from '../../hooks/useExpenseForm';
import { CategorySelector } from '../../components/ui/CategorySelector';
import { PaymentMethodSelector } from '../../components/ui/PaymentMethodSelector';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { AnimatedScreen } from '../../components/ui/AnimatedScreen';
import { Skeleton } from '../../components/ui/Skeleton';
import {
    spacing,
    typography,
    useResponsive,
    useTheme,
    useThemedStyles,
} from '../../theme';
import { useI18n } from '../../hooks/useI18n';

export function EditExpenseScreen({
    route,
    navigation,
}: RootScreenProps<'EditExpense'>) {
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);
    const { id } = route.params;
    const insets = useSafeAreaInsets();
    const headerHeight = useHeaderHeight();
    const scrollRef = useRef<ScrollView>(null);
    const {
        horizontalPadding,
        contentMaxWidth,
        isSmallPhone,
        scaleFont,
    } = useResponsive();
    const { t } = useI18n();

    const {
        title, setTitle,
        cost, setCost,
        note, setNote,
        paymentMethod, setPaymentMethod,
        selectedCategory, setSelectedCategory,
        categories, categoriesLoading,
        hasLoaded, setHasLoaded,
        expense, expenseLoading,
        saveExpense,
        isPending: isUpdatingExpense,
    } = useExpenseForm(id);

    // Pre-fill form with existing expense data
    useEffect(() => {
        if (expense && !hasLoaded && categories.length > 0) {
            setTitle(expense.title);
            setCost(String(expense.cost));
            setNote(expense.note ?? '');
            setPaymentMethod(expense.paymentMethod || undefined);
            setSelectedCategory(expense.categoryId ?? expense.category?.id);
            setHasLoaded(true);
        }
    }, [expense, hasLoaded, categories, setTitle, setCost, setNote, setPaymentMethod, setSelectedCategory, setHasLoaded]);

    const onSave = async () => {
        await saveExpense(() => {
            navigation.navigate('Main', {
                screen: 'Tabs',
                params: {
                    screen: 'History',
                    params: {
                        screen: 'HistoryHome',
                        params: { successMessage: t('editExpense.updatedSuccess') },
                    },
                },
            });
        });
    };

    const scrollToFocusedField = useCallback(() => {
        requestAnimationFrame(() => {
            scrollRef.current?.scrollToEnd({ animated: true });
        });
    }, []);

    if (expenseLoading || !hasLoaded) {
        return (
            <View style={styles.loadingContainer}>
                <View
                    style={[
                        styles.loadingSkeleton,
                        contentMaxWidth ? { maxWidth: contentMaxWidth, width: '100%' } : null,
                    ]}
                >
                    <Skeleton width="40%" height={18} />
                    <Skeleton width="100%" height={58} style={{ marginTop: spacing.base }} />
                    <Skeleton width="100%" height={54} style={{ marginTop: spacing.base }} />
                    <Skeleton width="100%" height={44} style={{ marginTop: spacing.base }} />
                </View>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
        >
            <AnimatedScreen style={styles.flex1} delay={65}>
                <ScrollView
                    ref={scrollRef}
                    contentContainerStyle={[
                        styles.scrollContent,
                        {
                            paddingTop: spacing.base,
                            paddingBottom: insets.bottom + spacing['4xl'],
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
                    {/* Amount Input */}
                    <View style={styles.amountContainer}>
                        <Text style={[styles.currencySign, { fontSize: scaleFont(typography.fontSize['3xl']) }]}>$</Text>
                        <TextInput
                            style={[
                                styles.amountInput,
                                {
                                    fontSize: scaleFont(typography.fontSize['5xl']),
                                    lineHeight: scaleFont(typography.fontSize['5xl']),
                                    minWidth: isSmallPhone ? 100 : 120,
                                },
                            ]}
                            placeholder={t('common.amountPlaceholder')}
                            placeholderTextColor={colors.textMuted}
                            keyboardType="decimal-pad"
                            value={cost}
                            onChangeText={setCost}
                            onFocus={scrollToFocusedField}
                        />
                    </View>

                    {/* Title */}
                    <Input
                        label={t('addExpense.titleLabel')}
                        placeholder={t('addExpense.titlePlaceholder')}
                        value={title}
                        onChangeText={setTitle}
                        onFocus={scrollToFocusedField}
                        containerStyle={styles.fieldContainer}
                    />

                    {/* Category */}
                    <View style={[styles.fieldContainer, styles.categorySection]}>
                        <Text style={[styles.label, { fontSize: scaleFont(typography.fontSize.sm) }]}>
                            {t('editExpense.category')}
                        </Text>

                        <CategorySelector
                            categories={categories}
                            isLoading={categoriesLoading}
                            selectedCategory={selectedCategory}
                            onSelectCategory={setSelectedCategory}
                        />
                    </View>

                    <PaymentMethodSelector
                        value={paymentMethod}
                        onChange={setPaymentMethod}
                    />

                    {/* Note */}
                    <Input
                        label={t('addExpense.noteOptional')}
                        placeholder={t('addExpense.notePlaceholder')}
                        multiline
                        value={note}
                        onChangeText={setNote}
                        onFocus={scrollToFocusedField}
                        inputStyle={styles.noteInput}
                        containerStyle={styles.fieldContainer}
                    />

                    {/* Save button */}
                    <Button
                        title={t('editExpense.updateExpense')}
                        onPress={onSave}
                        loading={isUpdatingExpense}
                        containerStyle={styles.saveButton}
                    />
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
    scrollContent: {
        flexGrow: 1,
        paddingBottom: spacing['4xl'],
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
    },
    loadingSkeleton: {
        paddingHorizontal: spacing.xl,
        width: '100%',
    },
    // Amount
    amountContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing['2xl'],
        paddingVertical: spacing.xl,
    },
    currencySign: {
        fontSize: typography.fontSize['3xl'],
        fontWeight: typography.fontWeight.bold,
        color: colors.textMuted,
        marginRight: spacing.sm,
    },
    amountInput: {
        fontSize: typography.fontSize['5xl'],
        fontWeight: typography.fontWeight.extrabold,
        color: colors.textPrimary,
        minWidth: 120,
        textAlign: 'center',
        textAlignVertical: 'center',
        includeFontPadding: false,
        paddingVertical: 0,
    },
    // Fields
    fieldContainer: {
        marginBottom: spacing.lg,
    },
    categorySection: {
        marginBottom: spacing.lg,
    },
    label: {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.medium,
        color: colors.textSecondary,
        marginBottom: spacing.sm,
        marginLeft: spacing.xs,
    },
    noteInput: {
        height: 80,
    },
    // Save button
    saveButton: {
        marginTop: spacing.xl,
    },
});
