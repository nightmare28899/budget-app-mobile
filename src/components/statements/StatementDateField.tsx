import React, { useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DateTimePicker, {
    DateTimePickerAndroid,
    DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/Ionicons';
import {
    borderRadius,
    SemanticColors,
    spacing,
    typography,
    useResponsive,
    useTheme,
    useThemedStyles,
} from '../../theme/index';

type StatementDateFieldProps = {
    label: string;
    /** Local calendar day; null shows the placeholder. */
    value: Date | null;
    displayText: string | null;
    placeholder: string;
    maximumDate?: Date;
    onChange: (date: Date) => void;
};

export function StatementDateField({
    label,
    value,
    displayText,
    placeholder,
    maximumDate,
    onChange,
}: StatementDateFieldProps) {
    const { colors } = useTheme();
    const styles = useThemedStyles(createStyles);
    const { scaleFont } = useResponsive();
    const [showIos, setShowIos] = useState(false);
    const pickerValue = value ?? new Date();

    const handleChange = (event: DateTimePickerEvent, selected?: Date) => {
        if (Platform.OS === 'android' && event.type !== 'set') {
            return;
        }
        if (selected) {
            onChange(selected);
        }
    };

    const open = () => {
        if (Platform.OS === 'android') {
            DateTimePickerAndroid.open({
                mode: 'date',
                value: pickerValue,
                maximumDate,
                onChange: handleChange,
            });
            return;
        }
        setShowIos(previous => !previous);
    };

    return (
        <View style={styles.wrap}>
            <Text style={[styles.label, { fontSize: scaleFont(typography.fontSize.sm) }]}>{label}</Text>
            <TouchableOpacity style={styles.field} onPress={open} accessibilityRole="button">
                <Icon name="calendar-outline" size={18} color={colors.textMuted} />
                <Text
                    style={[
                        styles.value,
                        !displayText ? { color: colors.textMuted } : null,
                        { fontSize: scaleFont(typography.fontSize.base) },
                    ]}
                >
                    {displayText ?? placeholder}
                </Text>
            </TouchableOpacity>
            {Platform.OS === 'ios' && showIos ? (
                <DateTimePicker
                    mode="date"
                    display="inline"
                    value={pickerValue}
                    maximumDate={maximumDate}
                    onChange={handleChange}
                />
            ) : null}
        </View>
    );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
    wrap: {
        gap: spacing.xs,
    },
    label: {
        color: colors.textSecondary,
        fontWeight: typography.fontWeight.medium,
    },
    field: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.lg,
        backgroundColor: colors.surface,
        paddingHorizontal: spacing.base,
        paddingVertical: spacing.sm + 2,
    },
    value: {
        color: colors.textPrimary,
    },
});
