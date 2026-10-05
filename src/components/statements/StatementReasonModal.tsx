import React, { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '../ui/primitives/Button';
import { Input } from '../ui/primitives/Input';
import { useI18n } from '../../hooks/shared/useI18n';
import {
    borderRadius,
    SemanticColors,
    spacing,
    typography,
    useThemedStyles,
} from '../../theme/index';

type StatementReasonModalProps = {
    visible: boolean;
    title: string;
    description: string;
    label: string;
    confirmLabel: string;
    loading: boolean;
    errorMessage: string | null;
    onClose: () => void;
    onConfirm: (reason: string) => void;
};

/** Asks for a mandatory free-text reason (void payment). */
export function StatementReasonModal(props: StatementReasonModalProps) {
    if (!props.visible) {
        return null;
    }
    return <OpenReasonModal {...props} />;
}

function OpenReasonModal({
    title,
    description,
    label,
    confirmLabel,
    loading,
    errorMessage,
    onClose,
    onConfirm,
}: StatementReasonModalProps) {
    const styles = useThemedStyles(createStyles);
    const { t } = useI18n();
    const [reason, setReason] = useState('');
    const trimmed = reason.trim();

    return (
        <Modal visible transparent animationType="fade" onRequestClose={() => !loading && onClose()}>
            <KeyboardAvoidingView
                style={styles.center}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <Pressable style={styles.backdrop} onPress={() => !loading && onClose()} />
                <View style={styles.card}>
                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.description}>{description}</Text>
                    <Input
                        label={label}
                        value={reason}
                        onChangeText={setReason}
                        maxLength={500}
                        multiline
                        autoFocus
                    />
                    {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
                    <View style={styles.actions}>
                        <Button
                            title={t('common.cancel')}
                            variant="secondary"
                            onPress={onClose}
                            disabled={loading}
                            containerStyle={styles.flex}
                        />
                        <Button
                            title={confirmLabel}
                            variant="danger"
                            onPress={() => onConfirm(trimmed)}
                            disabled={!trimmed}
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
    center: {
        flex: 1,
        justifyContent: 'center',
        padding: spacing.base,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: colors.overlay,
    },
    card: {
        backgroundColor: colors.background,
        borderRadius: borderRadius.xl,
        padding: spacing.base,
        gap: spacing.base,
    },
    title: {
        color: colors.textPrimary,
        fontSize: typography.fontSize.lg,
        fontWeight: typography.fontWeight.bold,
    },
    description: {
        color: colors.textSecondary,
        fontSize: typography.fontSize.sm,
        lineHeight: 20,
    },
    error: {
        color: colors.error,
        fontSize: typography.fontSize.sm,
    },
    actions: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
});
