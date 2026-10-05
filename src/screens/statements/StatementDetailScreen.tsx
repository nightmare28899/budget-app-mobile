import React from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { RootScreenProps } from '../../navigation/types';
import { AnimatedScreen } from '../../components/ui/primitives/AnimatedScreen';
import { HomeBackground } from '../../components/ui/layout/HomeBackground';
import { Button } from '../../components/ui/primitives/Button';
import { PremiumFeatureGate } from '../../components/premium/PremiumFeatureGate';
import { CreditCardFace } from '../../components/creditCards/CreditCardFace';
import { StatementScreenHeader } from '../../components/statements/StatementScreenHeader';
import { StatementPaymentsSection } from '../../components/statements/StatementPaymentsSection';
import { StatementStatusBadge } from '../../components/statements/StatementStatusBadge';
import { useCreditCardsCatalog } from '../../hooks/creditCards/useCreditCardsCatalog';
import { usePremiumAccess } from '../../hooks/access/usePremiumAccess';
import { useStatementDetail } from '../../hooks/statements/useStatementDetail';
import { useStatementRetry } from '../../hooks/statements/useStatementRetry';
import { useStatementActions } from '../../hooks/statements/useStatementActions';
import { useStatementErrorMessage } from '../../hooks/statements/useStatementErrorMessage';
import { useAppAlert } from '../../components/alerts/AlertProvider';
import { useI18n } from '../../hooks/shared/useI18n';
import {
    formatFileSize,
    formatStatementDate,
    formatStatementPeriod,
} from '../../modules/statements/statementFormat';
import { formatCurrency } from '../../utils/core/format';
import { getCurrencyLocale } from '../../utils/domain/currency';
import {
    borderRadius,
    spacing,
    typography,
    useResponsive,
    useTheme,
    useThemedStyles,
    SemanticColors,
} from '../../theme/index';

type Row = { key: string; label: string; value: string; color?: string };

/** Import summary with review entry point, confirm lifecycle (revert/resume/delete) and payments. */
export function StatementDetailScreen({ navigation, route }: RootScreenProps<'StatementDetail'>) {
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);
    const insets = useSafeAreaInsets();
    const { t, language } = useI18n();
    const { hasPremium } = usePremiumAccess();
    const { horizontalPadding, contentMaxWidth, scaleFont } = useResponsive();
    const locale = getCurrencyLocale(language);
    const { statement, isLoading, isError, isRefreshing, refetch } = useStatementDetail(
        route.params.id,
        hasPremium,
    );
    const { cards } = useCreditCardsCatalog({ includeInactive: true, enabled: hasPremium });
    const { retry, isRetrying } = useStatementRetry();
    const { alert } = useAppAlert();
    const describeError = useStatementErrorMessage();
    const actions = useStatementActions(route.params.id);

    if (!hasPremium) {
        return (
            <PremiumFeatureGate
                feature="statement_imports"
                onClose={() => navigation.goBack()}
                onContinueToAuth={() => navigation.navigate('Auth', { screen: 'Login' })}
            />
        );
    }

    const card = statement?.creditCardId
        ? cards.find(item => item.id === statement.creditCardId)
        : undefined;
    const currency = statement?.currency ?? statement?.creditCard?.currency ?? undefined;
    const money = (amount: number | null | undefined) =>
        amount == null ? '-' : formatCurrency(amount, currency, locale);
    const contentMaxWidthStyle = contentMaxWidth
        ? { maxWidth: contentMaxWidth, alignSelf: 'center' as const, width: '100%' as const }
        : null;

    const rows: Row[] = [];
    if (statement) {
        const noInterest =
            statement.paymentSummary.noInterestTarget
            ?? statement.paymentTargets.find(target => target.kind === 'NO_INTEREST')?.amount
            ?? null;
        const dueDate =
            statement.paymentSummary.dueDate
            ?? statement.paymentTargets.find(target => target.dueDate)?.dueDate
            ?? null;

        rows.push({
            key: 'period',
            label: t('statements.period'),
            value: formatStatementPeriod(statement.periodStart, statement.periodEnd, locale) ?? '-',
        });
        rows.push({
            key: 'closing',
            label: t('statements.closingBalance'),
            value: money(statement.closingBalance),
        });
        rows.push({
            key: 'due',
            label: t('statements.paymentDue'),
            value: dueDate ? formatStatementDate(dueDate, locale) ?? dueDate : '-',
        });
        if (noInterest != null) {
            rows.push({
                key: 'noInterest',
                label: t('creditCards.noInterestPayment'),
                value: money(noInterest),
            });
        }
        rows.push({
            key: 'rows',
            label: t('statements.rowCount'),
            value: String(statement.rowCount),
        });
        rows.push({
            key: 'warnings',
            label: t('statements.warningsLabel'),
            value: String(statement.warningCount),
            color: statement.warningCount > 0 ? colors.warning : undefined,
        });
        if (statement.reconciliation) {
            const status = statement.reconciliation.status;
            rows.push({
                key: 'reconciliation',
                label: t('statements.reconciliation'),
                value: t(`statements.reconciliation.${status}`),
                color:
                    status === 'PASSED'
                        ? colors.success
                        : status === 'FAILED'
                            ? colors.error
                            : undefined,
            });
        }
        const sizeLabel = formatFileSize(statement.sourceSizeBytes);
        if (statement.sourceFileName) {
            rows.push({
                key: 'file',
                label: t('statements.file'),
                value: sizeLabel
                    ? `${statement.sourceFileName} (${sizeLabel})`
                    : statement.sourceFileName,
            });
        }
    }

    const runAction = async (
        action: () => Promise<{ ok: true } | { ok: false; error: import('../../modules/statements/statementErrors').StatementError }>,
        failureKey: 'statements.detail.revertFailed' | 'statements.detail.resumeFailed' | 'statements.detail.deleteFailed',
        onDone?: () => void,
    ) => {
        const result = await action();
        if (!result.ok) {
            if (result.error.kind !== 'premium') {
                alert(t('common.error'), describeError(result.error, failureKey));
            }
            return;
        }
        onDone?.();
    };

    const confirmRevert = () => {
        if (!statement) return;
        alert(t('statements.detail.revertTitle'), t('statements.detail.revertMessage'), [
            { text: t('common.cancel'), style: 'cancel' },
            {
                text: t('statements.detail.revert'),
                style: 'destructive',
                onPress: () => void runAction(() => actions.revert(statement.version), 'statements.detail.revertFailed'),
            },
        ]);
    };

    const confirmDelete = () => {
        if (!statement) return;
        alert(t('statements.detail.deleteTitle'), t('statements.detail.deleteMessage'), [
            { text: t('common.cancel'), style: 'cancel' },
            {
                text: t('common.delete'),
                style: 'destructive',
                onPress: () =>
                    void runAction(() => actions.remove(), 'statements.detail.deleteFailed', () =>
                        navigation.goBack(),
                    ),
            },
        ]);
    };

    const canRetry = statement?.status === 'FAILED' || statement?.status === 'UPLOADED';

    return (
        <View style={styles.container}>
            <HomeBackground />
            <AnimatedScreen style={styles.flex1} delay={20}>
                <StatementScreenHeader
                    title={t('statements.detailTitle')}
                    onBack={() => navigation.goBack()}
                />
                <ScrollView
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefreshing}
                            onRefresh={() => refetch()}
                            tintColor={colors.primary}
                        />
                    }
                    contentContainerStyle={[
                        styles.content,
                        {
                            paddingHorizontal: horizontalPadding,
                            paddingBottom: insets.bottom + spacing['4xl'],
                        },
                        contentMaxWidthStyle,
                    ]}
                    showsVerticalScrollIndicator={false}
                >
                    {isLoading ? (
                        <View style={styles.stateCard}>
                            <ActivityIndicator color={colors.primary} />
                            <Text style={styles.stateText}>{t('common.loading')}</Text>
                        </View>
                    ) : isError || !statement ? (
                        <View style={styles.stateCard}>
                            <Icon name="cloud-offline-outline" size={26} color={colors.textMuted} />
                            <Text style={styles.stateText}>{t('statements.loadFailed')}</Text>
                            <Button
                                title={t('statements.retry')}
                                variant="secondary"
                                onPress={() => refetch()}
                            />
                        </View>
                    ) : (
                        <>
                            {card ? (
                                <CreditCardFace card={card} inactiveLabel={t('creditCards.inactive')} />
                            ) : null}

                            <View style={styles.statusRow}>
                                <StatementStatusBadge status={statement.status} />
                            </View>

                            {statement.status === 'FAILED' || statement.failureMessage ? (
                                <View style={styles.errorBox}>
                                    <Icon name="alert-circle-outline" size={18} color={colors.error} />
                                    <Text
                                        style={[styles.errorText, { fontSize: scaleFont(typography.fontSize.sm) }]}
                                    >
                                        {statement.failureMessage
                                            ? t('statements.processingFailedDetail', {
                                                detail: statement.failureMessage,
                                            })
                                            : t('statements.processingFailed')}
                                    </Text>
                                </View>
                            ) : null}

                            <View style={styles.rows}>
                                {rows.map(row => (
                                    <View key={row.key} style={styles.row}>
                                        <Text
                                            style={[styles.rowLabel, { fontSize: scaleFont(typography.fontSize.sm) }]}
                                        >
                                            {row.label}
                                        </Text>
                                        <Text
                                            style={[
                                                styles.rowValue,
                                                row.color ? { color: row.color } : null,
                                                { fontSize: scaleFont(typography.fontSize.sm) },
                                            ]}
                                        >
                                            {row.value}
                                        </Text>
                                    </View>
                                ))}
                            </View>

                            {statement.warningCodes.length ? (
                                <View style={styles.chipsWrap}>
                                    {statement.warningCodes.map(code => (
                                        <View key={code} style={styles.warningChip}>
                                            <Text
                                                style={[
                                                    styles.warningChipText,
                                                    { fontSize: scaleFont(typography.fontSize.xs) },
                                                ]}
                                            >
                                                {code}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            ) : null}

                            {canRetry ? (
                                <Button
                                    title={t('statements.retryProcessing')}
                                    onPress={() => {
                                        retry(statement.id).catch(() => undefined);
                                    }}
                                    loading={isRetrying}
                                />
                            ) : null}

                            {statement.reconciliation ? (
                                <View style={styles.rows}>
                                    {[
                                        ['opening', 'statements.recon.opening', statement.reconciliation.openingBalance],
                                        ['charges', 'statements.recon.charges', statement.reconciliation.chargesTotal],
                                        ['payments', 'statements.recon.payments', statement.reconciliation.paymentsTotal],
                                        ['credits', 'statements.recon.credits', statement.reconciliation.creditsTotal],
                                        ['difference', 'statements.recon.difference', statement.reconciliation.difference],
                                    ].map(([key, labelKey, amount]) => (
                                        <View key={key as string} style={styles.row}>
                                            <Text style={[styles.rowLabel, { fontSize: scaleFont(typography.fontSize.sm) }]}>
                                                {t(labelKey as 'statements.recon.opening')}
                                            </Text>
                                            <Text style={[styles.rowValue, { fontSize: scaleFont(typography.fontSize.sm) }]}>
                                                {money(amount as number)}
                                            </Text>
                                        </View>
                                    ))}
                                    {statement.reconciliation.status === 'FAILED' ? (
                                        <Text style={[styles.errorText, styles.reconNote]}>
                                            {statement.reconciliation.message ?? t('statements.recon.failedHint')}
                                        </Text>
                                    ) : null}
                                </View>
                            ) : null}

                            {statement.status === 'NEEDS_REVIEW' ? (
                                <Button
                                    title={t('statements.detail.reviewRows')}
                                    onPress={() => navigation.navigate('StatementReview', { id: statement.id })}
                                />
                            ) : null}
                            {statement.status === 'REVERTED' ? (
                                <Button
                                    title={t('statements.detail.resume')}
                                    onPress={() =>
                                        void runAction(() => actions.resume(statement.version), 'statements.detail.resumeFailed')
                                    }
                                    loading={actions.isResuming}
                                />
                            ) : null}
                            {statement.status === 'CONFIRMED' ? (
                                <Button
                                    title={t('statements.detail.revert')}
                                    variant="secondary"
                                    onPress={confirmRevert}
                                    loading={actions.isReverting}
                                />
                            ) : null}
                            {statement.status === 'CONFIRMED' ? (
                                <StatementPaymentsSection statement={statement} />
                            ) : null}
                            {statement.status !== 'CONFIRMED' ? (
                                <Button
                                    title={t('common.delete')}
                                    variant="danger"
                                    onPress={confirmDelete}
                                    loading={actions.isRemoving}
                                />
                            ) : null}
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
    content: {
        gap: spacing.base,
        paddingTop: spacing.sm,
    },
    stateCard: {
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: borderRadius.xl,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.xl,
        gap: spacing.sm,
    },
    stateText: {
        color: colors.textSecondary,
        textAlign: 'center',
    },
    statusRow: {
        flexDirection: 'row',
    },
    errorBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.sm,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.error,
        padding: spacing.base,
    },
    errorText: {
        flex: 1,
        color: colors.error,
        lineHeight: 20,
    },
    rows: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.xl,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: spacing.base,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: spacing.base,
        paddingVertical: spacing.sm,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
    },
    rowLabel: {
        color: colors.textSecondary,
    },
    rowValue: {
        flexShrink: 1,
        textAlign: 'right',
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.semibold,
    },
    chipsWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.xs,
    },
    warningChip: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: borderRadius.full,
        borderWidth: 1,
        borderColor: colors.warning,
    },
    warningChipText: {
        color: colors.warning,
        fontWeight: typography.fontWeight.semibold,
    },
    reconNote: {
        paddingVertical: spacing.sm,
    },
});
