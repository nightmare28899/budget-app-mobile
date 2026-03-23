import React from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { SavingsGoal } from '../../types';
import { useI18n } from '../../hooks/useI18n';
import {
    borderRadius,
    spacing,
    typography,
    useResponsive,
    useTheme,
    useThemedStyles,
} from '../../theme';
import { formatCurrency } from '../../utils/format';
import { resolveSavingsGoalIconName } from '../../utils/icons';
import {
    formatSavingsDate,
    getRemainingSavings,
    getSavingsProgress,
    resolveSavingsGoalColor,
    withSavingsAlpha,
} from '../../utils/savings';

interface SavingsGoalCardProps {
    goal: SavingsGoal;
    onPress: () => void;
    onAddFunds: () => void;
    disabled?: boolean;
}

export function SavingsGoalCard({
    goal,
    onPress,
    onAddFunds,
    disabled = false,
}: SavingsGoalCardProps) {
    const styles = useThemedStyles(createStyles);
    const { colors } = useTheme();
    const { scaleFont } = useResponsive();
    const { t, language } = useI18n();
    const locale: 'es-MX' | 'en-US' = language === 'es' ? 'es-MX' : 'en-US';
    const progress = getSavingsProgress(goal);
    const remainingAmount = getRemainingSavings(goal);
    const isComplete = remainingAmount <= 0;
    const progressWidth: `${number}%` = `${Math.min(Math.round(progress), 100)}%`;
    const accentColor = resolveSavingsGoalColor(goal.color, colors.success);
    const iconName = isComplete
        ? 'checkmark-done-outline'
        : resolveSavingsGoalIconName(goal.icon);
    const targetDateLabel = goal.targetDate
        ? formatSavingsDate(goal.targetDate, locale)
        : null;

    return (
        <View style={styles.card}>
            <View style={styles.headerRow}>
                <TouchableOpacity
                    activeOpacity={0.88}
                    onPress={onPress}
                    style={styles.identityPressArea}
                >
                    <View
                        style={[
                            styles.iconWrap,
                            {
                                backgroundColor: withSavingsAlpha(accentColor, 0.14),
                                borderColor: withSavingsAlpha(accentColor, 0.28),
                            },
                        ]}
                    >
                        <Icon
                            name={iconName}
                            size={18}
                            color={isComplete ? colors.success : accentColor}
                        />
                    </View>
                    <View style={styles.headerCopy}>
                        <Text
                            style={[
                                styles.title,
                                { fontSize: scaleFont(typography.fontSize.base) },
                            ]}
                            numberOfLines={1}
                        >
                            {goal.title}
                        </Text>
                        {targetDateLabel ? (
                            <View
                                style={[
                                    styles.datePill,
                                    {
                                        backgroundColor: withSavingsAlpha(accentColor, 0.1),
                                        borderColor: withSavingsAlpha(accentColor, 0.18),
                                    },
                                ]}
                            >
                                <Icon
                                    name="calendar-outline"
                                    size={12}
                                    color={colors.textMuted}
                                />
                                <Text
                                    style={[
                                        styles.dateText,
                                        { fontSize: scaleFont(typography.fontSize.xs) },
                                    ]}
                                    numberOfLines={1}
                                >
                                    {t('savings.targetDateShort', { date: targetDateLabel })}
                                </Text>
                            </View>
                        ) : null}
                    </View>
                </TouchableOpacity>

                <TouchableOpacity
                    activeOpacity={0.82}
                    onPress={onAddFunds}
                    disabled={disabled}
                    style={[
                        styles.quickActionButton,
                        disabled ? styles.quickActionButtonDisabled : null,
                    ]}
                >
                    <Icon name="add" size={15} color={colors.primaryAction} />
                    <Text
                        style={[
                            styles.quickActionText,
                            { fontSize: scaleFont(typography.fontSize.sm) },
                        ]}
                    >
                        {t('savings.quickAddAction')}
                    </Text>
                </TouchableOpacity>
            </View>

            <TouchableOpacity
                activeOpacity={0.88}
                onPress={onPress}
                style={styles.bodyPressArea}
            >
                <View style={styles.amountBlock}>
                    <Text
                        style={[
                            styles.amountLabel,
                            { fontSize: scaleFont(typography.fontSize.xs) },
                        ]}
                    >
                        {t('savings.savedAmountLabel')}
                    </Text>
                    <View style={styles.amountRow}>
                        <Text
                            style={[
                                styles.savedAmountValue,
                                { fontSize: scaleFont(typography.fontSize.xl) },
                            ]}
                            numberOfLines={1}
                        >
                            {formatCurrency(goal.currentAmount, 'MXN')}
                        </Text>
                        <Text
                            style={[
                                styles.targetAmountText,
                                { fontSize: scaleFont(typography.fontSize.sm) },
                            ]}
                            numberOfLines={1}
                        >
                            {t('savings.targetAmountPreview', {
                                amount: formatCurrency(goal.targetAmount, 'MXN'),
                            })}
                        </Text>
                    </View>
                </View>

                <View style={styles.progressRow}>
                    <Text
                        style={[
                            styles.remainingText,
                            { fontSize: scaleFont(typography.fontSize.xs) },
                        ]}
                        numberOfLines={1}
                    >
                        {isComplete
                            ? t('savings.goalReached')
                            : t('savings.remainingAmount', {
                                amount: formatCurrency(remainingAmount, 'MXN'),
                            })}
                    </Text>
                    <Text
                        style={[
                            styles.progressText,
                            {
                                fontSize: scaleFont(typography.fontSize.sm),
                                color: isComplete ? colors.success : accentColor,
                            },
                        ]}
                    >
                        {`${Math.round(progress)}%`}
                    </Text>
                </View>

                <View style={styles.progressTrack}>
                    <View
                        style={[
                            styles.progressFill,
                            {
                                width: progressWidth,
                                backgroundColor: isComplete ? colors.success : accentColor,
                            },
                        ]}
                    />
                </View>
            </TouchableOpacity>
        </View>
    );
}

const createStyles = (colors: any) =>
    StyleSheet.create({
        card: {
            backgroundColor: colors.surfaceCard,
            borderRadius: borderRadius.xl,
            borderWidth: 1,
            borderColor: colors.border,
            padding: spacing.base,
            gap: spacing.base,
        },
        headerRow: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: spacing.base,
        },
        identityPressArea: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            minWidth: 0,
        },
        bodyPressArea: {
            gap: spacing.sm,
        },
        iconWrap: {
            width: 42,
            height: 42,
            borderRadius: 21,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
        },
        headerCopy: {
            flex: 1,
            marginLeft: spacing.base,
            minWidth: 0,
        },
        title: {
            color: colors.textPrimary,
            fontWeight: typography.fontWeight.semibold,
        },
        datePill: {
            flexDirection: 'row',
            alignItems: 'center',
            alignSelf: 'flex-start',
            gap: spacing.xs,
            marginTop: spacing.xs,
            borderRadius: borderRadius.full,
            borderWidth: 1,
            paddingHorizontal: spacing.sm,
            paddingVertical: spacing.xs,
        },
        dateText: {
            color: colors.textMuted,
            flexShrink: 1,
        },
        quickActionButton: {
            minHeight: 40,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.xs,
            paddingHorizontal: spacing.base,
            paddingVertical: spacing.sm,
            borderRadius: borderRadius.full,
            borderWidth: 1,
            borderColor: withSavingsAlpha(colors.primaryAction, 0.22),
            backgroundColor: withSavingsAlpha(colors.primaryAction, 0.12),
        },
        quickActionButtonDisabled: {
            opacity: 0.5,
        },
        quickActionText: {
            color: colors.primaryAction,
            fontWeight: typography.fontWeight.semibold,
        },
        amountBlock: {
            gap: spacing.xs,
        },
        amountLabel: {
            color: colors.textMuted,
            textTransform: 'uppercase',
            letterSpacing: 0.4,
            fontWeight: typography.fontWeight.medium,
        },
        amountRow: {
            flexDirection: 'row',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: spacing.base,
        },
        savedAmountValue: {
            flex: 1,
            color: colors.textPrimary,
            fontWeight: typography.fontWeight.bold,
        },
        targetAmountText: {
            color: colors.textSecondary,
            fontWeight: typography.fontWeight.medium,
        },
        progressRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: spacing.base,
        },
        remainingText: {
            flex: 1,
            color: colors.textSecondary,
        },
        progressText: {
            fontWeight: typography.fontWeight.semibold,
        },
        progressTrack: {
            height: 7,
            borderRadius: borderRadius.full,
            backgroundColor: colors.surfaceElevated,
            overflow: 'hidden',
        },
        progressFill: {
            height: '100%',
            borderRadius: borderRadius.full,
        },
    });
