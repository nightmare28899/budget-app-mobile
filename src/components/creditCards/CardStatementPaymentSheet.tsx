import React, { useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppAlert } from '../alerts/AlertProvider';
import { Button } from '../ui/primitives/Button';
import { StatementPaymentModal, PaymentModalSubmit } from '../statements/StatementPaymentModal';
import { useI18n } from '../../hooks/shared/useI18n';
import { useStatementDetail } from '../../hooks/statements/useStatementDetail';
import { useStatementErrorMessage } from '../../hooks/statements/useStatementErrorMessage';
import { useStatementPayments } from '../../hooks/statements/useStatementPayments';
import {
    isPaymentDateInRange,
    overpaidBy,
    paymentQuickAmounts,
} from '../../modules/creditCards/cardStatementPayments';
import { suggestedPaymentAmount } from '../../modules/statements/statementPayments';
import type { StatementImportDetail } from '../../types/statementImports';
import { formatCurrency } from '../../utils/core/format';
import { getCurrencyLocale } from '../../utils/domain/currency';
import { clearPaymentDue } from '../../utils/platform/androidLiveUpdates';
import {
    borderRadius,
    SemanticColors,
    spacing,
    typography,
    useThemedStyles,
} from '../../theme/index';

type CardStatementPaymentSheetProps = {
    /** Latest statement of the tapped card; null keeps the sheet closed. */
    target: { statementId: string; cardId: string } | null;
    onClose: () => void;
    onReviewStatement: (statement: Pick<StatementImportDetail, 'id' | 'status'>) => void;
};

/** Fetches the statement lazily and wraps the existing payment modal for it. */
export function CardStatementPaymentSheet({
    target,
    onClose,
    onReviewStatement,
}: CardStatementPaymentSheetProps) {
    if (!target) {
        return null;
    }
    return (
        <OpenSheet
            key={target.statementId}
            statementId={target.statementId}
            cardId={target.cardId}
            onClose={onClose}
            onReviewStatement={onReviewStatement}
        />
    );
}

type OpenSheetProps = {
    statementId: string;
    cardId: string;
    onClose: () => void;
    onReviewStatement: CardStatementPaymentSheetProps['onReviewStatement'];
};

function OpenSheet({ statementId, cardId, onClose, onReviewStatement }: OpenSheetProps) {
    const { statement, isLoading, isError, refetch } = useStatementDetail(statementId);

    if (statement && statement.status === 'CONFIRMED' && !statement.paymentSummary.isPaid) {
        return <PaymentStep statement={statement} cardId={cardId} onClose={onClose} />;
    }
    return (
        <InfoSheet
            loading={isLoading}
            failed={isError || (!isLoading && !statement)}
            paid={statement?.paymentSummary.isPaid === true}
            needsReview={statement != null && statement.status !== 'CONFIRMED'}
            onRetry={() => refetch()}
            onClose={onClose}
            onReview={() => statement && onReviewStatement(statement)}
        />
    );
}

type PaymentStepProps = {
    statement: StatementImportDetail;
    cardId: string;
    onClose: () => void;
};

function PaymentStep({ statement, cardId, onClose }: PaymentStepProps) {
    const { t, language } = useI18n();
    const { alert } = useAppAlert();
    const locale = getCurrencyLocale(language);
    const describeError = useStatementErrorMessage();
    const { addPayment, isWorking } = useStatementPayments(statement.id, statement.paymentVersion);
    const [error, setError] = useState<string | null>(null);

    const summary = statement.paymentSummary;
    const currency = summary.currency ?? statement.currency ?? '';
    const money = (amount: number) => formatCurrency(amount, currency || undefined, locale);
    const chips = paymentQuickAmounts(summary, statement.paymentTargets).map(chip => ({
        key: chip.key,
        label: t(`cardPayments.chip.${chip.key}`),
        amount: chip.amount,
    }));

    const save = async (value: PaymentModalSubmit) => {
        setError(null);
        const result = await addPayment({
            amount: value.amount,
            currency: value.currency,
            paidAt: value.paidAt,
            note: value.note,
        });
        if (!result.ok) {
            setError(describeError(result.error, 'statements.payments.failed'));
            return;
        }
        const next = result.data.summary;
        if (next.isPaid) {
            clearPaymentDue(cardId);
        }
        onClose();
        alert(
            t('cardPayments.successTitle'),
            t('cardPayments.success', {
                amount: money(value.amount),
                remaining: money(next.currentPaymentDue ?? next.remainingStatement ?? 0),
            }),
        );
    };

    const submit = (value: PaymentModalSubmit) => {
        if (value.currency !== currency) {
            setError(t('cardPayments.currencyMismatch'));
            return;
        }
        if (!isPaymentDateInRange(value.paidAt)) {
            setError(t('cardPayments.dateInvalid'));
            return;
        }
        const excess = overpaidBy(value.amount, summary);
        if (excess > 0) {
            alert(
                t('cardPayments.overpayTitle'),
                t('cardPayments.overpayMessage', { amount: money(excess) }),
                [
                    { text: t('common.cancel'), style: 'cancel' },
                    { text: t('cardPayments.overpayConfirm'), onPress: () => void save(value) },
                ],
            );
            return;
        }
        void save(value);
    };

    return (
        <StatementPaymentModal
            visible
            currency={currency}
            initialAmount={suggestedPaymentAmount(summary)}
            initialPaidAt={null}
            initialNote={null}
            correction={false}
            loading={isWorking}
            errorMessage={error}
            quickAmounts={chips}
            onClose={onClose}
            onSubmit={submit}
        />
    );
}

type InfoSheetProps = {
    loading: boolean;
    failed: boolean;
    paid: boolean;
    needsReview: boolean;
    onRetry: () => void;
    onClose: () => void;
    onReview: () => void;
};

function InfoSheet({ loading, failed, paid, needsReview, onRetry, onClose, onReview }: InfoSheetProps) {
    const styles = useThemedStyles(createStyles);
    const insets = useSafeAreaInsets();
    const { t } = useI18n();

    return (
        <Modal visible transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.flex}>
                <Pressable style={styles.backdrop} onPress={onClose} />
                <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.base }]}>
                    {loading ? (
                        <ActivityIndicator />
                    ) : needsReview ? (
                        <>
                            <Text style={styles.text}>{t('cardPayments.notConfirmed')}</Text>
                            <Button title={t('cardPayments.reviewStatement')} onPress={onReview} />
                        </>
                    ) : paid ? (
                        <Text style={styles.text}>{t('cardPayments.fullyPaid')}</Text>
                    ) : failed ? (
                        <>
                            <Text style={styles.text}>{t('cardPayments.loadFailed')}</Text>
                            <Button title={t('common.retry')} onPress={onRetry} />
                        </>
                    ) : null}
                    <Button title={t('common.cancel')} variant="secondary" onPress={onClose} />
                </View>
            </View>
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
        backgroundColor: colors.background,
        borderTopLeftRadius: borderRadius.xl,
        borderTopRightRadius: borderRadius.xl,
        padding: spacing.base,
        gap: spacing.base,
    },
    text: {
        color: colors.textPrimary,
        fontSize: typography.fontSize.base,
        lineHeight: 22,
    },
});
