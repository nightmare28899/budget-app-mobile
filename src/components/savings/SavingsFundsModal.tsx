import React, { useEffect, useMemo, useState } from 'react';
import {
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { AddSavingsFundsPayload } from '../../types/index';
import { useI18n } from '../../hooks/useI18n';
import { formatCurrency } from '../../utils/core/format';
import {
    borderRadius,
    spacing,
    typography,
    useResponsive,
    useTheme,
    useThemedStyles,
    SemanticColors,
} from '../../theme/index';
import {
    MAX_COST_LABEL,
    MAX_COST_VALUE,
    sanitizeMoneyInput,
} from '../../utils/platform/moneyInput';
import { Button } from '../ui/primitives/Button';
import { Input } from '../ui/primitives/Input';
import { resolveSavingsGoalColor, withSavingsAlpha } from '../../utils/domain/savings';

interface SavingsFundsModalProps {
    visible: boolean;
    goalTitle: string;
    currentAmount: number;
    remainingAmount: number;
    loading: boolean;
    errorMessage?: string | null;
    mode?: 'deposit' | 'withdraw';
    maxAmount?: number;
    accentColor?: string | null;
    onClose: () => void;
    onSubmit: (payload: AddSavingsFundsPayload) => void | Promise<void>;
}

export function SavingsFundsModal({
    visible,
    goalTitle,
    currentAmount,
    remainingAmount,
    loading,
    errorMessage,
    mode = 'deposit',
    maxAmount,
    accentColor,
    onClose,
    onSubmit,
}: SavingsFundsModalProps) {
    const styles = useThemedStyles(createStyles);
    const { colors } = useTheme();
    const { scaleFont } = useResponsive();
    const { t } = useI18n();
    const [amount, setAmount] = useState('');
    const [amountError, setAmountError] = useState<string | undefined>();
    const isDeposit = mode === 'deposit';
    const resolvedAccentColor = resolveSavingsGoalColor(
        accentColor,
        isDeposit ? colors.success : colors.error,
    );
    const title = isDeposit ? t('savings.addFundsTitle') : t('savings.withdrawFundsTitle');
    const actionLabel = isDeposit
        ? t('savings.addFundsAction')
        : t('savings.withdrawFundsAction');
    const amountLabel = isDeposit
        ? t('savings.formDepositAmount')
        : t('savings.formWithdrawAmount');
    const primaryStatLabel = isDeposit
        ? t('savings.savedAmountLabel')
        : t('savings.availableAmountLabel');

    useEffect(() => {
        if (!visible) {
            return;
        }

        setAmount('');
        setAmountError(undefined);
    }, [visible]);

    const helperText = useMemo(() => {
        if (isDeposit) {
            return t('savings.depositHelperText');
        }

        return t('savings.withdrawHelperText');
    }, [isDeposit, t]);

    const handleClose = () => {
        if (loading) {
            return;
        }

        onClose();
    };

    const handleSubmit = () => {
        const parsedAmount = Number(amount);
        if (!amount || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
            setAmountError(
                isDeposit
                    ? t('savings.validationDepositAmount')
                    : t('savings.validationWithdrawAmount'),
            );
            return;
        }

        if (parsedAmount > MAX_COST_VALUE) {
            setAmountError(t('common.maxAmountExceeded', { max: MAX_COST_LABEL }));
            return;
        }

        if (!isDeposit && typeof maxAmount === 'number' && parsedAmount > maxAmount) {
            setAmountError(
                t('savings.validationWithdrawExceeded', {
                    amount: formatCurrency(maxAmount, 'MXN'),
                }),
            );
            return;
        }

        setAmountError(undefined);
        onSubmit({ amount: parsedAmount });
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={handleClose}
            statusBarTranslucent
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.overlay}
            >
                <Pressable style={styles.backdrop} onPress={handleClose} />
                <View style={styles.card}>
                    <View style={styles.heroRow}>
                        <View
                            style={[
                                styles.heroIconWrap,
                                {
                                    backgroundColor: withSavingsAlpha(resolvedAccentColor, 0.14),
                                    borderColor: withSavingsAlpha(resolvedAccentColor, 0.26),
                                },
                            ]}
                        >
                            <Icon
                                name={isDeposit ? 'add-circle-outline' : 'remove-circle-outline'}
                                size={20}
                                color={resolvedAccentColor}
                            />
                        </View>
                        <View style={styles.heroCopy}>
                            <Text
                                style={[
                                    styles.title,
                                    { fontSize: scaleFont(typography.fontSize.xl) },
                                ]}
                            >
                                {title}
                            </Text>
                            <Text
                                style={[
                                    styles.subtitle,
                                    { fontSize: scaleFont(typography.fontSize.sm) },
                                ]}
                            >
                                {goalTitle}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.statsRow}>
                        <View style={styles.statCard}>
                            <Text
                                style={[
                                    styles.statLabel,
                                    { fontSize: scaleFont(typography.fontSize.xs) },
                                ]}
                            >
                                {primaryStatLabel}
                            </Text>
                            <Text
                                style={[
                                    styles.statValue,
                                    { fontSize: scaleFont(typography.fontSize.base) },
                                ]}
                            >
                                {formatCurrency(currentAmount, 'MXN')}
                            </Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text
                                style={[
                                    styles.statLabel,
                                    { fontSize: scaleFont(typography.fontSize.xs) },
                                ]}
                            >
                                {t('savings.remainingAmountLabel')}
                            </Text>
                            <Text
                                style={[
                                    styles.statValue,
                                    { fontSize: scaleFont(typography.fontSize.base) },
                                ]}
                            >
                                {formatCurrency(remainingAmount, 'MXN')}
                            </Text>
                        </View>
                    </View>

                    <Input
                        label={amountLabel}
                        placeholder={t('common.amountPlaceholder')}
                        value={amount}
                        onChangeText={(value) => setAmount(sanitizeMoneyInput(value))}
                        error={amountError}
                        keyboardType="decimal-pad"
                        containerStyle={styles.field}
                        leftContent={<Text style={styles.currencySign}>$</Text>}
                    />

                    <Text
                        style={[
                            styles.helperText,
                            { fontSize: scaleFont(typography.fontSize.xs) },
                        ]}
                    >
                        {helperText}
                    </Text>

                    {errorMessage ? (
                        <View style={styles.errorCard}>
                            <Text
                                style={[
                                    styles.serverError,
                                    { fontSize: scaleFont(typography.fontSize.sm) },
                                ]}
                            >
                                {errorMessage}
                            </Text>
                        </View>
                    ) : null}

                    <View style={styles.actionsRow}>
                        <Button
                            title={t('common.cancel')}
                            variant="secondary"
                            onPress={handleClose}
                            disabled={loading}
                            containerStyle={styles.actionButton}
                        />
                        <Button
                            title={actionLabel}
                            onPress={handleSubmit}
                            loading={loading}
                            variant={isDeposit ? 'primary' : 'danger'}
                            containerStyle={styles.actionButton}
                        />
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const createStyles = (colors: SemanticColors) =>
    StyleSheet.create({
        overlay: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: spacing.xl,
        },
        backdrop: {
            ...StyleSheet.absoluteFillObject,
            backgroundColor: colors.overlay,
        },
        card: {
            width: '100%',
            maxWidth: 420,
            borderRadius: borderRadius.xl,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surfaceCard,
            padding: spacing.xl,
        },
        heroRow: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            marginBottom: spacing.lg,
        },
        heroIconWrap: {
            width: 46,
            height: 46,
            borderRadius: 23,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            marginRight: spacing.base,
        },
        heroCopy: {
            flex: 1,
        },
        title: {
            color: colors.textPrimary,
            fontWeight: typography.fontWeight.bold,
        },
        subtitle: {
            color: colors.textSecondary,
            marginTop: spacing.xs,
        },
        statsRow: {
            flexDirection: 'row',
            gap: spacing.sm,
            marginBottom: spacing.base,
        },
        statCard: {
            flex: 1,
            padding: spacing.base,
            borderRadius: borderRadius.lg,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surfaceElevated,
        },
        statLabel: {
            color: colors.textMuted,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            fontWeight: typography.fontWeight.medium,
            marginBottom: spacing.xs,
        },
        statValue: {
            color: colors.textPrimary,
            fontWeight: typography.fontWeight.bold,
        },
        field: {
            marginBottom: spacing.xs,
        },
        currencySign: {
            color: colors.textPrimary,
            fontSize: typography.fontSize.base,
            fontWeight: typography.fontWeight.semibold,
        },
        helperText: {
            color: colors.textMuted,
        },
        errorCard: {
            borderRadius: borderRadius.lg,
            borderWidth: 1,
            borderColor: 'rgba(239, 68, 68, 0.24)',
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            paddingHorizontal: spacing.base,
            paddingVertical: spacing.sm,
            marginTop: spacing.base,
        },
        serverError: {
            color: colors.error,
        },
        actionsRow: {
            flexDirection: 'row',
            gap: spacing.sm,
            marginTop: spacing.lg,
        },
        actionButton: {
            flex: 1,
        },
    });
