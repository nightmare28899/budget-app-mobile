import React, { useState } from 'react';
import {
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { Button } from '../ui/primitives/Button';
import { Input } from '../ui/primitives/Input';
import { useI18n } from '../../hooks/shared/useI18n';
import {
    borderRadius,
    spacing,
    typography,
    useResponsive,
    useThemedStyles,
    SemanticColors,
} from '../../theme/index';

const CONFIRMATION_TEXT = 'ELIMINAR';

type DeleteAccountConfirmationModalProps = {
    visible: boolean;
    isDeleting: boolean;
    onCancel: () => void;
    onConfirm: () => void;
};

export function DeleteAccountConfirmationModal({
    visible,
    isDeleting,
    onCancel,
    onConfirm,
}: DeleteAccountConfirmationModalProps) {
    const styles = useThemedStyles(createStyles);
    const { t } = useI18n();
    const { scaleFont } = useResponsive();
    const [confirmation, setConfirmation] = useState('');
    const canConfirm = confirmation.trim().toUpperCase() === CONFIRMATION_TEXT;

    const handleCancel = () => {
        setConfirmation('');
        onCancel();
    };

    const handleConfirm = () => {
        if (canConfirm) {
            onConfirm();
        }
    };

    return (
        <Modal
            transparent
            animationType="fade"
            visible={visible}
            onRequestClose={handleCancel}
            statusBarTranslucent
            accessibilityViewIsModal
        >
            <KeyboardAvoidingView
                style={styles.overlay}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <Pressable style={styles.backdrop} onPress={handleCancel} />
                <View style={styles.card} accessible accessibilityViewIsModal>
                    <Text style={[styles.title, { fontSize: scaleFont(typography.fontSize.xl) }]}>
                        {t('settings.deleteAccountTitle')}
                    </Text>
                    <Text style={[styles.message, { fontSize: scaleFont(typography.fontSize.sm) }]}>
                        {t('settings.deleteAccountMessage')}
                    </Text>
                    <Input
                        label={t('settings.deleteAccountConfirmationLabel')}
                        value={confirmation}
                        onChangeText={setConfirmation}
                        autoCapitalize="characters"
                        autoCorrect={false}
                        editable={!isDeleting}
                        placeholder={CONFIRMATION_TEXT}
                        accessibilityLabel={t('settings.deleteAccountConfirmationLabel')}
                    />
                    <View style={styles.actions}>
                        <Button
                            title={t('common.cancel')}
                            variant="ghost"
                            onPress={handleCancel}
                            disabled={isDeleting}
                            containerStyle={styles.cancelButton}
                        />
                        <Button
                            title={t('settings.deleteAccountButton')}
                            variant="danger"
                            onPress={handleConfirm}
                            loading={isDeleting}
                            disabled={!canConfirm}
                            containerStyle={styles.deleteButton}
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
            backgroundColor: 'rgba(0, 0, 0, 0.68)',
        },
        card: {
            width: '100%',
            maxWidth: 460,
            borderRadius: borderRadius.xl,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surfaceCard,
            padding: spacing.xl,
            gap: spacing.base,
        },
        title: {
            color: colors.error,
            fontWeight: typography.fontWeight.bold,
        },
        message: {
            color: colors.textSecondary,
            lineHeight: 21,
        },
        actions: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: spacing.base,
            marginTop: spacing.sm,
        },
        cancelButton: {
            minWidth: 90,
            alignItems: 'center',
        },
        deleteButton: {
            minWidth: 130,
            alignItems: 'center',
        },
    });
