import { StyleSheet } from 'react-native';
import { SemanticColors, borderRadius, spacing, typography } from '../../theme/index';

export const createCsvImportStyles = (colors: SemanticColors) => StyleSheet.create({
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
    card: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.xl,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.base,
        gap: spacing.sm,
    },
    cardTitle: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.bold,
    },
    label: {
        color: colors.textSecondary,
        fontWeight: typography.fontWeight.semibold,
        marginTop: spacing.xs,
    },
    body: {
        color: colors.textSecondary,
    },
    hint: {
        color: colors.textMuted,
    },
    errorText: {
        color: colors.error,
    },
    fileName: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.semibold,
    },
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    chip: {
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surfaceElevated,
        borderRadius: borderRadius.full,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        minHeight: 40,
        justifyContent: 'center',
    },
    chipActive: {
        borderColor: colors.primaryAction,
        backgroundColor: colors.primaryAction + '20',
    },
    chipText: {
        color: colors.textSecondary,
    },
    chipTextActive: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.semibold,
    },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.md,
        minHeight: 48,
    },
    switchLabel: {
        flex: 1,
        color: colors.textPrimary,
    },
    mappingRow: {
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        paddingBottom: spacing.xs,
    },
    mappingValue: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: 44,
        gap: spacing.sm,
    },
    mappingValueText: {
        flex: 1,
        color: colors.textPrimary,
    },
    mappingValueEmpty: {
        color: colors.textMuted,
    },
    radioRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        minHeight: 44,
    },
    radioDot: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioDotActive: {
        borderColor: colors.primaryAction,
    },
    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: colors.primaryAction,
    },
    radioText: {
        flex: 1,
        color: colors.textPrimary,
    },
    previewRow: {
        flexDirection: 'row',
        gap: spacing.md,
        paddingVertical: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    previewBody: {
        flex: 1,
    },
    previewTitle: {
        color: colors.textPrimary,
        fontWeight: typography.fontWeight.semibold,
    },
    previewDetail: {
        color: colors.textSecondary,
    },
    previewNotes: {
        color: colors.textMuted,
    },
    footer: {
        gap: spacing.sm,
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    progressTrack: {
        height: 8,
        borderRadius: borderRadius.full,
        backgroundColor: colors.surfaceElevated,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: colors.primaryAction,
    },
    twoPane: {
        flex: 1,
        flexDirection: 'row',
        gap: spacing.base,
    },
    pane: {
        flex: 1,
    },
    paneContent: {
        gap: spacing.base,
        paddingBottom: spacing.base,
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: colors.overlay,
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
    },
    modalCard: {
        maxHeight: '70%',
        backgroundColor: colors.surface,
        borderRadius: borderRadius.xl,
        borderWidth: 1,
        borderColor: colors.border,
        paddingVertical: spacing.sm,
    },
    modalItem: {
        paddingHorizontal: spacing.base,
        paddingVertical: spacing.md,
        minHeight: 48,
        justifyContent: 'center',
    },
    modalItemText: {
        color: colors.textPrimary,
    },
});
