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
import { StatementDateField } from './StatementDateField';
import { useI18n } from '../../hooks/shared/useI18n';
import { formatStatementDate } from '../../modules/statements/statementFormat';
import { parseDateOnly } from '../../modules/creditCards/cardPaymentSchedule';
import { parseMoneyInput } from '../../modules/statements/statementReview';
import { isPaymentFormValid, toPaidAtIso } from '../../modules/statements/statementPayments';
import { formatCurrency } from '../../utils/core/format';
import { getCurrencyLocale } from '../../utils/domain/currency';
import {
    borderRadius,
    SemanticColors,
    spacing,
    typography,
    useThemedStyles,
} from '../../theme/index';

export type PaymentQuickChip = { key: string; label: string; amount: number };

export type PaymentModalSubmit = {
    amount: number;
    currency: string;
    paidAt: string;
    note?: string;
    reason?: string;
};

type StatementPaymentModalProps = {
    visible: boolean;
    currency: string;
    /** Prefill; for corrections these come from the payment being corrected. */
    initialAmount: number | null;
    initialPaidAt: string | null;
    initialNote: string | null;
    correction: boolean;
    loading: boolean;
    errorMessage: string | null;
    /** Optional one-tap amounts (remaining / minimum / no-interest). */
    quickAmounts?: PaymentQuickChip[];
    onClose: () => void;
    onSubmit: (value: PaymentModalSubmit) => void;
};

export function StatementPaymentModal(props: StatementPaymentModalProps) {
    if (!props.visible) {
        return null;
    }
    return <OpenModal {...props} />;
}

function OpenModal({
    currency,
    initialAmount,
    initialPaidAt,
    initialNote,
    correction,
    loading,
    errorMessage,
    quickAmounts,
    onClose,
    onSubmit,
}: StatementPaymentModalProps) {
    const styles = useThemedStyles(createStyles);
    const insets = useSafeAreaInsets();
    const { t, language } = useI18n();
    const locale = getCurrencyLocale(language);
    const [amountText, setAmountText] = useState(
        initialAmount != null ? initialAmount.toFixed(2) : '',
    );
    const [paidDay, setPaidDay] = useState<Date>(
        (initialPaidAt ? parseDateOnly(initialPaidAt) : null) ?? new Date(),
    );
    const [note, setNote] = useState(initialNote ?? '');
    const [reason, setReason] = useState('');

    const amount = parseMoneyInput(amountText);
    const valid = isPaymentFormValid(
        { amountText, currency, note, reason, requireReason: correction },
        amount,
    );

    const submit = () => {
        if (!valid || amount == null) {
            return;
        }
        onSubmit({
            amount,
            currency,
            paidAt: toPaidAtIso(paidDay),
            note: note.trim() || undefined,
            reason: correction ? reason.trim() : undefined,
        });
    };

    const dayText = formatStatementDate(
        `${paidDay.getFullYear()}-${String(paidDay.getMonth() + 1).padStart(2, '0')}-${String(
            paidDay.getDate(),
        ).padStart(2, '0')}`,
        locale,
    );

    return (
        <Modal visible transparent animationType="slide" onRequestClose={() => !loading && onClose()}>
            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <Pressable style={styles.backdrop} onPress={() => !loading && onClose()} />
                <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.base }]}>
                    <Text style={styles.title}>
                        {correction ? t('statements.payments.correct') : t('statements.payments.add')}
                    </Text>
                    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.form}>
                        <Input
                            label={`${t('statements.payments.amount')} (${currency})`}
                            value={amountText}
                            onChangeText={setAmountText}
                            keyboardType="decimal-pad"
                            placeholder="0.00"
                        />
                        {quickAmounts?.length ? (
                            <View style={styles.chips}>
                                {quickAmounts.map(chip => (
                                    <TouchableOpacity
                                        key={chip.key}
                                        style={styles.chip}
                                        onPress={() => setAmountText(chip.amount.toFixed(2))}
                                        accessibilityRole="button"
                                    >
                                        <Text style={styles.chipText}>
                                            {`${chip.label}: ${formatCurrency(chip.amount, currency || undefined, locale)}`}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        ) : null}
                        <StatementDateField
                            label={t('statements.payments.date')}
                            value={paidDay}
                            displayText={dayText}
                            placeholder={t('statements.payments.date')}
                            maximumDate={new Date()}
                            onChange={setPaidDay}
                        />
                        <Input
                            label={t('statements.payments.note')}
                            value={note}
                            onChangeText={setNote}
                            maxLength={500}
                            multiline
                        />
                        {correction ? (
                            <Input
                                label={t('statements.payments.reason')}
                                value={reason}
                                onChangeText={setReason}
                                maxLength={500}
                                multiline
                            />
                        ) : null}
                        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
                    </ScrollView>
                    <View style={styles.actions}>
                        <Button
                            title={t('common.cancel')}
                            variant="secondary"
                            onPress={onClose}
                            disabled={loading}
                            containerStyle={styles.flex}
                        />
                        <Button
                            title={correction ? t('statements.payments.correct') : t('statements.payments.add')}
                            onPress={submit}
                            disabled={!valid}
                            loading={loading}
                            containerStyle={styles.flex}
                        />
                    </View>
                </View>
            </KeyboardAvoidingView>
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
        maxHeight: '90%',
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
    error: {
        color: colors.error,
        fontSize: typography.fontSize.sm,
    },
    chips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    chip: {
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.full,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
    },
    chipText: {
        color: colors.textPrimary,
        fontSize: typography.fontSize.sm,
    },
    actions: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
});
