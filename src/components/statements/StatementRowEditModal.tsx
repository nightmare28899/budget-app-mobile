import React, { useState } from 'react';
import {
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../ui/primitives/Button';
import { Input } from '../ui/primitives/Input';
import { CategoryPickerSheet } from '../ui/domain/CategoryPickerSheet';
import { CreditCardSelector } from '../ui/domain/CreditCardSelector';
import { StatementDateField } from './StatementDateField';
import { useI18n } from '../../hooks/shared/useI18n';
import { formatStatementDate } from '../../modules/statements/statementFormat';
import {
    StatementRowDraft,
    parseMoneyInput,
    rowDateToLocal,
    toRowDateIso,
} from '../../modules/statements/statementReview';
import type { Category, CreditCard } from '../../types/index';
import type { StatementRow } from '../../types/statementImports';
import { getCurrencyLocale } from '../../utils/domain/currency';
import {
    borderRadius,
    SemanticColors,
    spacing,
    typography,
    useTheme,
    useThemedStyles,
} from '../../theme/index';

type StatementRowEditModalProps = {
    /** Row with unsaved drafts applied; null closes the modal. */
    row: StatementRow | null;
    categories: Category[];
    cards: CreditCard[];
    onClose: () => void;
    onApply: (draft: StatementRowDraft) => void;
};

export function StatementRowEditModal(props: StatementRowEditModalProps) {
    if (!props.row) {
        return null;
    }
    return <OpenEditModal {...props} row={props.row} />;
}

function OpenEditModal({
    row,
    categories,
    cards,
    onClose,
    onApply,
}: Omit<StatementRowEditModalProps, 'row'> & { row: StatementRow }) {
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);
    const insets = useSafeAreaInsets();
    const { t, language } = useI18n();
    const locale = getCurrencyLocale(language);
    const [description, setDescription] = useState(row.description);
    const [merchant, setMerchant] = useState(row.merchantName ?? '');
    const [amountText, setAmountText] = useState(row.amount.toFixed(2));
    const [day, setDay] = useState<Date | null>(rowDateToLocal(row.transactionDate));
    const [categoryId, setCategoryId] = useState<string | null>(row.categoryId);
    const [cardId, setCardId] = useState<string | null>(row.linkedCreditCardId);
    const [note, setNote] = useState(row.decisionNote ?? '');
    const [pickerOpen, setPickerOpen] = useState(false);

    const amount = parseMoneyInput(amountText);
    const descriptionValid = description.trim().length > 0;
    const amountChanged = amount != null && Math.round(amount * 100) !== Math.round(row.parsedAmount * 100);
    const dayChanged =
        day != null
        && (row.parsedTransactionDate == null
            || toRowDateIso(day).slice(0, 10) !== row.parsedTransactionDate.slice(0, 10));
    const needsNote = (amountChanged || dayChanged) && !note.trim();
    const valid = amount != null && descriptionValid && !needsNote;
    const categoryName = categories.find(item => item.id === categoryId)?.name ?? null;

    const apply = () => {
        if (!valid || amount == null) {
            return;
        }
        const draft: StatementRowDraft = {
            description: description.trim(),
            merchantName: merchant.trim() || null,
            amount,
            categoryId,
            linkedCreditCardId: cardId,
            decisionNote: note.trim() || null,
        };
        if (day) {
            draft.transactionDate = toRowDateIso(day);
        }
        onApply(draft);
    };

    const dayText = day
        ? formatStatementDate(
            `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(
                day.getDate(),
            ).padStart(2, '0')}`,
            locale,
        )
        : null;

    return (
        <Modal visible transparent animationType="slide" onRequestClose={onClose}>
            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <Pressable style={styles.backdrop} onPress={onClose} />
                <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.base }]}>
                    <Text style={styles.title}>{t('statements.row.editTitle')}</Text>
                    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.form}>
                        <Input
                            label={t('statements.row.description')}
                            value={description}
                            onChangeText={setDescription}
                            maxLength={240}
                        />
                        <Input
                            label={t('statements.row.merchant')}
                            value={merchant}
                            onChangeText={setMerchant}
                            maxLength={120}
                        />
                        <Input
                            label={`${t('statements.row.amount')} (${row.currency})`}
                            value={amountText}
                            onChangeText={setAmountText}
                            keyboardType="decimal-pad"
                            error={amountText && amount == null ? t('statements.row.amountInvalid') : undefined}
                        />
                        <StatementDateField
                            label={t('statements.row.date')}
                            value={day}
                            displayText={dayText}
                            placeholder={t('statements.row.date')}
                            onChange={setDay}
                        />
                        <View style={styles.field}>
                            <Text style={styles.label}>{t('statements.row.category')}</Text>
                            <TouchableOpacity
                                style={styles.select}
                                onPress={() => setPickerOpen(true)}
                                accessibilityRole="button"
                            >
                                <Text
                                    style={[
                                        styles.selectText,
                                        !categoryName ? { color: colors.textMuted } : null,
                                    ]}
                                >
                                    {categoryName ?? t('statements.row.noCategory')}
                                </Text>
                            </TouchableOpacity>
                        </View>
                        <CreditCardSelector
                            label={t('statements.row.linkedCard')}
                            value={cardId ?? undefined}
                            cards={cards}
                            onChange={value => setCardId(value ?? null)}
                        />
                        <Input
                            label={t('statements.row.note')}
                            value={note}
                            onChangeText={setNote}
                            maxLength={500}
                            multiline
                            error={needsNote ? t('statements.row.needsNote') : undefined}
                        />
                    </ScrollView>
                    <View style={styles.actions}>
                        <Button
                            title={t('common.cancel')}
                            variant="secondary"
                            onPress={onClose}
                            containerStyle={styles.flex}
                        />
                        <Button
                            title={t('statements.row.apply')}
                            onPress={apply}
                            disabled={!valid}
                            containerStyle={styles.flex}
                        />
                    </View>
                </View>
            </KeyboardAvoidingView>
            <CategoryPickerSheet
                categories={categories}
                selectedCategory={categoryId ?? undefined}
                visible={pickerOpen}
                onClose={() => setPickerOpen(false)}
                onSelectCategory={setCategoryId}
            />
        </Modal>
    );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
    flex: { flex: 1 },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: colors.overlay,
    },
    sheet: {
        marginTop: 'auto',
        maxHeight: '92%',
        backgroundColor: colors.background,
        borderTopLeftRadius: borderRadius.xl,
        borderTopRightRadius: borderRadius.xl,
        padding: spacing.base,
        gap: spacing.base,
    },
    title: {
        color: colors.textPrimary,
        fontSize: typography.fontSize.lg,
        fontWeight: typography.fontWeight.bold,
    },
    form: {
        gap: spacing.base,
    },
    field: {
        gap: spacing.xs,
    },
    label: {
        color: colors.textSecondary,
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.medium,
    },
    select: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.lg,
        backgroundColor: colors.surface,
        paddingHorizontal: spacing.base,
        paddingVertical: spacing.sm + 2,
    },
    selectText: {
        color: colors.textPrimary,
        fontSize: typography.fontSize.base,
    },
    actions: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
});
