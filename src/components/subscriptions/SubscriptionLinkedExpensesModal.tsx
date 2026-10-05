import React from 'react';
import {
    ActivityIndicator,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { expensesApi } from '../../api/resources/expenses';
import { subscriptionsApi } from '../../api/resources/subscriptions';
import { useAppAlert } from '../alerts/AlertProvider';
import { Button } from '../ui/primitives/Button';
import { useI18n } from '../../hooks/shared/useI18n';
import { formatCurrency, formatDate } from '../../utils/core/format';
import { diffExpenseLinks } from '../../utils/domain/subscriptionLinks';
import {
    borderRadius,
    spacing,
    typography,
    useResponsive,
    useTheme,
    useThemedStyles,
    SemanticColors,
} from '../../theme/index';

type Props = {
    subscriptionId: string;
    visible: boolean;
    onClose: () => void;
};

export function SubscriptionLinkedExpensesModal({ subscriptionId, visible, onClose }: Props) {
    const styles = useThemedStyles(createStyles);
    const { colors } = useTheme();
    const { modalMaxWidth, scaleFont } = useResponsive();
    const { t } = useI18n();
    const { alert } = useAppAlert();
    const queryClient = useQueryClient();
    const [selected, setSelected] = React.useState<string[]>([]);

    const { data, isLoading } = useQuery({
        queryKey: ['expenses', 'subscription-link-picker', subscriptionId],
        queryFn: () => expensesApi.getAll({ page: 1, limit: 100 }),
        enabled: visible,
    });
    const expenses = React.useMemo(() => data?.expenses ?? [], [data]);
    const initialLinked = React.useMemo(
        () =>
            expenses
                .filter((expense) => expense.subscriptionId === subscriptionId)
                .map((expense) => expense.id),
        [expenses, subscriptionId],
    );

    React.useEffect(() => {
        setSelected(initialLinked);
    }, [initialLinked]);

    const saveMutation = useMutation({
        mutationFn: async () => {
            const { toLink, toUnlink } = diffExpenseLinks(initialLinked, selected);
            if (toLink.length) {
                await subscriptionsApi.linkExpenses(subscriptionId, toLink);
            }
            if (toUnlink.length) {
                await subscriptionsApi.unlinkExpenses(subscriptionId, toUnlink);
            }
        },
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['expenses'] }),
                queryClient.invalidateQueries({ queryKey: ['subscriptions'] }),
                queryClient.invalidateQueries({ queryKey: ['history'] }),
                queryClient.invalidateQueries({ queryKey: ['analytics'] }),
            ]);
            alert(t('common.success'), t('parity.subscription.linkSaved'));
            onClose();
        },
        onError: () => {
            alert(t('common.error'), t('parity.subscription.linkFailed'));
        },
    });

    const toggle = (id: string) =>
        setSelected((current) =>
            current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
        );
    const hasChanges =
        diffExpenseLinks(initialLinked, selected).toLink.length > 0
        || diffExpenseLinks(initialLinked, selected).toUnlink.length > 0;

    return (
        <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
            <View style={styles.backdrop}>
                <View style={[styles.card, { maxWidth: modalMaxWidth }]}>
                    <Text style={[styles.title, { fontSize: scaleFont(typography.fontSize.xl) }]}>
                        {t('parity.subscription.linkTitle')}
                    </Text>
                    <Text style={[styles.hint, { fontSize: scaleFont(typography.fontSize.sm) }]}>
                        {t('parity.subscription.linkHint')}
                    </Text>
                    {isLoading ? (
                        <ActivityIndicator />
                    ) : expenses.length === 0 ? (
                        <Text style={styles.hint}>{t('parity.subscription.linkEmpty')}</Text>
                    ) : (
                        <ScrollView style={styles.list}>
                            {expenses.map((expense) => {
                                const isSelected = selected.includes(expense.id);
                                const linkedElsewhere =
                                    !!expense.subscriptionId && expense.subscriptionId !== subscriptionId;
                                return (
                                    <TouchableOpacity
                                        key={expense.id}
                                        style={styles.row}
                                        onPress={() => toggle(expense.id)}
                                        activeOpacity={0.8}
                                    >
                                        <Icon
                                            name={isSelected ? 'checkbox' : 'square-outline'}
                                            size={22}
                                            color={colors.primaryAction}
                                        />
                                        <View style={styles.rowCopy}>
                                            <Text style={styles.rowTitle} numberOfLines={1}>
                                                {expense.title}
                                            </Text>
                                            <Text style={styles.hint} numberOfLines={1}>
                                                {formatDate(expense.date.slice(0, 10), 'MMM D, YYYY')}
                                                {linkedElsewhere ? ' *' : ''}
                                            </Text>
                                        </View>
                                        <Text style={styles.rowTitle}>
                                            {formatCurrency(expense.cost, expense.currency)}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    )}
                    <Button
                        title={t('parity.subscription.linkSave')}
                        onPress={() => saveMutation.mutate()}
                        loading={saveMutation.isPending}
                        disabled={!hasChanges}
                    />
                    <Button
                        title={t('common.cancel')}
                        variant="ghost"
                        onPress={onClose}
                        disabled={saveMutation.isPending}
                    />
                </View>
            </View>
        </Modal>
    );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.42)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    card: {
        width: '100%',
        maxHeight: '90%',
        borderRadius: borderRadius.xl,
        padding: spacing.xl,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        gap: spacing.base,
    },
    title: { color: colors.textPrimary, fontWeight: typography.fontWeight.bold },
    hint: { color: colors.textSecondary },
    list: { flexGrow: 0 },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.sm,
    },
    rowCopy: { flex: 1 },
    rowTitle: { color: colors.textPrimary, fontWeight: typography.fontWeight.semibold },
});
