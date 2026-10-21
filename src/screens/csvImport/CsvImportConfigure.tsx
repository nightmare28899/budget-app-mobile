import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useI18n } from '../../hooks/shared/useI18n';
import type { TranslationKey } from '../../i18n/index';
import type { CsvImportController } from '../../hooks/csvImport/useCsvImport';
import { IMPORT_PAYMENT_METHODS } from '../../hooks/csvImport/useCsvImport';
import { getCurrencyLocale } from '../../utils/domain/currency';
import { formatCurrency, formatDate } from '../../utils/core/format';
import { PAYMENT_METHOD_OPTIONS } from '../../utils/domain/paymentMethod';
import { CSV_FIELDS, CSV_IMPORT_LIMITS } from '../../modules/csvImport/csvTypes';
import type {
    CsvField,
    DateOrder,
    ImportRow,
    RowIssue,
    RowStatus,
} from '../../modules/csvImport/csvTypes';
import { typography, useResponsive, useTheme, useThemedStyles } from '../../theme/index';
import { createCsvImportStyles } from './csvImportStyles';

type Props = { vm: CsvImportController };

const FIELD_LABELS: Record<CsvField, TranslationKey> = {
    date: 'csvImport.fieldDate',
    title: 'csvImport.fieldTitle',
    amount: 'csvImport.fieldAmount',
    debit: 'csvImport.fieldDebit',
    credit: 'csvImport.fieldCredit',
    currency: 'csvImport.fieldCurrency',
    category: 'csvImport.fieldCategory',
    note: 'csvImport.fieldNote',
    merchant: 'csvImport.fieldMerchant',
};

const ISSUE_LABELS: Record<RowIssue, TranslationKey> = {
    MISSING_DATE: 'csvImport.issue.missingDate',
    INVALID_DATE: 'csvImport.issue.invalidDate',
    MISSING_AMOUNT: 'csvImport.issue.missingAmount',
    INVALID_AMOUNT: 'csvImport.issue.invalidAmount',
    ZERO_AMOUNT: 'csvImport.issue.zeroAmount',
    AMOUNT_TOO_LARGE: 'csvImport.issue.amountTooLarge',
    MISSING_TITLE: 'csvImport.issue.missingTitle',
    FUTURE_DATE: 'csvImport.issue.futureDate',
    INVALID_CURRENCY: 'csvImport.issue.invalidCurrency',
    UNKNOWN_CATEGORY: 'csvImport.issue.unknownCategory',
    TEXT_TRUNCATED: 'csvImport.issue.textTruncated',
};

const STATUS_LABELS: Record<RowStatus, TranslationKey> = {
    VALID: 'csvImport.statusValid',
    WARNING: 'csvImport.statusWarning',
    ERROR: 'csvImport.statusError',
    SKIPPED_INCOME: 'csvImport.statusSkipped',
};

const DATE_ORDER_LABELS: Record<DateOrder, TranslationKey> = {
    DMY: 'csvImport.dateDmy',
    MDY: 'csvImport.dateMdy',
    YMD: 'csvImport.dateYmd',
};

const DELIMITER_LABELS: Record<string, TranslationKey> = {
    '\t': 'csvImport.delimTab',
    ';': 'csvImport.delimSemicolon',
    '|': 'csvImport.delimPipe',
    ',': 'csvImport.delimComma',
};

const ENCODING_LABELS = {
    UTF8: 'UTF-8',
    UTF8_BOM: 'UTF-8 (BOM)',
    UTF16: 'UTF-16',
    LATIN1: 'Windows-1252 / Latin-1',
} as const;

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
    const styles = useThemedStyles(createCsvImportStyles);
    const { scaleFont } = useResponsive();
    return (
        <TouchableOpacity
            style={[styles.chip, active ? styles.chipActive : null]}
            onPress={onPress}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
        >
            <Text
                style={[
                    styles.chipText,
                    active ? styles.chipTextActive : null,
                    { fontSize: scaleFont(typography.fontSize.sm) },
                ]}
            >
                {label}
            </Text>
        </TouchableOpacity>
    );
}

function RadioRow({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
    const styles = useThemedStyles(createCsvImportStyles);
    const { scaleFont } = useResponsive();
    return (
        <TouchableOpacity
            style={styles.radioRow}
            onPress={onPress}
            activeOpacity={0.8}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
        >
            <View style={[styles.radioDot, active ? styles.radioDotActive : null]}>
                {active ? <View style={styles.radioInner} /> : null}
            </View>
            <Text style={[styles.radioText, { fontSize: scaleFont(typography.fontSize.base) }]}>
                {label}
            </Text>
        </TouchableOpacity>
    );
}

function MappingRow({
    label,
    options,
    selected,
    onSelect,
}: {
    label: string;
    options: string[];
    selected: number | undefined;
    onSelect: (column: number | null) => void;
}) {
    const { t } = useI18n();
    const { colors } = useTheme();
    const styles = useThemedStyles(createCsvImportStyles);
    const { scaleFont } = useResponsive();
    const [open, setOpen] = useState(false);
    const labels = options.map((header, i) =>
        t('csvImport.columnOption', { index: i + 1, header: header.trim() || '-' }),
    );
    const notMapped = t('csvImport.notMapped');
    const current = selected !== undefined && selected < labels.length ? labels[selected] : notMapped;
    const choose = (column: number | null) => {
        setOpen(false);
        onSelect(column);
    };

    return (
        <View style={styles.mappingRow}>
            <Text style={[styles.label, { fontSize: scaleFont(typography.fontSize.sm) }]}>{label}</Text>
            <TouchableOpacity
                style={styles.mappingValue}
                onPress={() => setOpen(true)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={t('csvImport.mappingCd', { label, value: current })}
            >
                <Text
                    style={[
                        styles.mappingValueText,
                        selected === undefined ? styles.mappingValueEmpty : null,
                        { fontSize: scaleFont(typography.fontSize.base) },
                    ]}
                    numberOfLines={1}
                >
                    {current}
                </Text>
                <Icon name="chevron-down" size={18} color={colors.textMuted} />
            </TouchableOpacity>
            <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
                <Pressable style={styles.modalBackdrop} onPress={() => setOpen(false)}>
                    <View style={styles.modalCard}>
                        <ScrollView>
                            <TouchableOpacity style={styles.modalItem} onPress={() => choose(null)}>
                                <Text style={[styles.modalItemText, styles.mappingValueEmpty]}>{notMapped}</Text>
                            </TouchableOpacity>
                            {labels.map((text, i) => (
                                <TouchableOpacity key={text + i} style={styles.modalItem} onPress={() => choose(i)}>
                                    <Text style={styles.modalItemText} numberOfLines={1}>{text}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </Pressable>
            </Modal>
        </View>
    );
}

function Card({ title, children }: { title?: string; children: React.ReactNode }) {
    const styles = useThemedStyles(createCsvImportStyles);
    const { scaleFont } = useResponsive();
    return (
        <View style={styles.card}>
            {title ? (
                <Text
                    style={[styles.cardTitle, { fontSize: scaleFont(typography.fontSize.md) }]}
                    accessibilityRole="header"
                >
                    {title}
                </Text>
            ) : null}
            {children}
        </View>
    );
}

export function CsvImportSetup({ vm }: Props) {
    const { t } = useI18n();
    const styles = useThemedStyles(createCsvImportStyles);
    const { scaleFont } = useResponsive();
    const small = { fontSize: scaleFont(typography.fontSize.sm) };

    return (
        <>
            <Card>
                <Text style={[styles.fileName, { fontSize: scaleFont(typography.fontSize.base) }]} numberOfLines={2}>
                    {vm.fileName ?? ''}
                </Text>
                {vm.encoding ? (
                    <Text style={[styles.hint, small]}>
                        {t('csvImport.detectedFile', {
                            encoding: ENCODING_LABELS[vm.encoding],
                            delimiter: t(DELIMITER_LABELS[vm.delimiter] ?? 'csvImport.delimComma'),
                        })}
                    </Text>
                ) : null}
                {vm.unterminatedQuote ? (
                    <Text style={[styles.errorText, small]}>{t('csvImport.warningUnterminated')}</Text>
                ) : null}
                {vm.error ? <Text style={[styles.errorText, small]}>{errorText(vm, t)}</Text> : null}
                <Chip label={t('csvImport.changeFile')} active={false} onPress={vm.pickFile} />
            </Card>

            <Card title={t('csvImport.mappingTitle')}>
                <View style={styles.switchRow}>
                    <Text style={[styles.switchLabel, { fontSize: scaleFont(typography.fontSize.base) }]}>
                        {t('csvImport.firstRowHeader')}
                    </Text>
                    <Switch value={vm.hasHeader} onValueChange={vm.setHasHeader} />
                </View>
                {CSV_FIELDS.map((field) => (
                    <MappingRow
                        key={field}
                        label={t(FIELD_LABELS[field])}
                        options={vm.headers}
                        selected={vm.mapping[field]}
                        onSelect={(column) => vm.setMapping(field, column)}
                    />
                ))}
            </Card>

            {vm.mappingUsable ? (
                <>
                    <Card title={t('csvImport.formatTitle')}>
                        {vm.dateAmbiguous || vm.decimalAmbiguous ? (
                            <Text style={[styles.errorText, small]}>{t('csvImport.ambiguousHint')}</Text>
                        ) : null}
                        <Text style={[styles.label, small]}>{t('csvImport.dateOrder')}</Text>
                        <View style={styles.chipRow}>
                            {(['DMY', 'MDY', 'YMD'] as DateOrder[]).map((order) => (
                                <Chip
                                    key={order}
                                    label={t(DATE_ORDER_LABELS[order])}
                                    active={vm.dateOrder === order}
                                    onPress={() => vm.setDateOrder(order)}
                                />
                            ))}
                        </View>
                        <Text style={[styles.label, small]}>{t('csvImport.decimal')}</Text>
                        <View style={styles.chipRow}>
                            <Chip
                                label={t('csvImport.decimalDot')}
                                active={vm.decimal === 'DOT'}
                                onPress={() => vm.setDecimal('DOT')}
                            />
                            <Chip
                                label={t('csvImport.decimalComma')}
                                active={vm.decimal === 'COMMA'}
                                onPress={() => vm.setDecimal('COMMA')}
                            />
                        </View>
                        {vm.hasAmountMapping ? (
                            <>
                                <Text style={[styles.label, small]}>{t('csvImport.signTitle')}</Text>
                                <View style={styles.chipRow}>
                                    <Chip
                                        label={t('csvImport.signPositive')}
                                        active={vm.sign === 'POSITIVE_IS_EXPENSE'}
                                        onPress={() => vm.setSign('POSITIVE_IS_EXPENSE')}
                                    />
                                    <Chip
                                        label={t('csvImport.signNegative')}
                                        active={vm.sign === 'NEGATIVE_IS_EXPENSE'}
                                        onPress={() => vm.setSign('NEGATIVE_IS_EXPENSE')}
                                    />
                                </View>
                                <Text style={[styles.hint, small]}>{t('csvImport.signHint')}</Text>
                            </>
                        ) : vm.splitColumns ? (
                            <Text style={[styles.hint, small]}>{t('csvImport.splitHint')}</Text>
                        ) : null}
                    </Card>

                    <Card title={t('csvImport.defaultsTitle')}>
                        <Text style={[styles.label, small]}>{t('csvImport.defaultCurrency')}</Text>
                        <View style={styles.chipRow}>
                            {vm.currencies.map((code) => (
                                <Chip
                                    key={code}
                                    label={code}
                                    active={vm.defaultCurrency === code}
                                    onPress={() => vm.setDefaultCurrency(code)}
                                />
                            ))}
                        </View>
                        <Text style={[styles.label, small]}>{t('csvImport.defaultCategory')}</Text>
                        <View style={styles.chipRow}>
                            <Chip
                                label={t('csvImport.none')}
                                active={vm.defaultCategoryId === null}
                                onPress={() => vm.setDefaultCategory(null)}
                            />
                            {vm.categories.map((category) => (
                                <Chip
                                    key={category.id}
                                    label={category.name}
                                    active={vm.defaultCategoryId === category.id}
                                    onPress={() => vm.setDefaultCategory(category.id)}
                                />
                            ))}
                        </View>
                        <Text style={[styles.label, small]}>{t('csvImport.defaultPayment')}</Text>
                        <View style={styles.chipRow}>
                            <Chip
                                label={t('csvImport.none')}
                                active={vm.defaultPayment === null}
                                onPress={() => vm.setDefaultPayment(null)}
                            />
                            {PAYMENT_METHOD_OPTIONS.filter((o) => IMPORT_PAYMENT_METHODS.includes(o.id)).map(
                                (option) => (
                                    <Chip
                                        key={option.id}
                                        label={t(option.labelKey)}
                                        active={vm.defaultPayment === option.id}
                                        onPress={() => vm.setDefaultPayment(option.id)}
                                    />
                                ),
                            )}
                        </View>
                    </Card>
                </>
            ) : null}
        </>
    );
}

export function errorText(
    vm: Pick<CsvImportController, 'error' | 'errorRows'>,
    t: ReturnType<typeof useI18n>['t'],
): string {
    switch (vm.error) {
        case 'TOO_LARGE':
            return t('csvImport.errorTooLarge');
        case 'EMPTY':
            return t('csvImport.errorEmpty');
        case 'TOO_MANY_ROWS':
            return t('csvImport.errorTooManyRows', { rows: vm.errorRows });
        default:
            return t('csvImport.errorUnreadable');
    }
}

function PreviewRow({ row }: { row: ImportRow }) {
    const { t, language } = useI18n();
    const { colors } = useTheme();
    const styles = useThemedStyles(createCsvImportStyles);
    const { scaleFont } = useResponsive();
    const locale = getCurrencyLocale(language);
    const draft = row.draft;
    const visual = {
        VALID: { icon: 'checkmark-circle-outline', color: colors.success },
        WARNING: { icon: 'warning-outline', color: colors.warning },
        ERROR: { icon: 'alert-circle-outline', color: colors.error },
        SKIPPED_INCOME: { icon: 'remove-circle-outline', color: colors.textMuted },
    }[row.status];
    const title = draft?.title ?? t('csvImport.rowLine', { line: row.line });
    const detail = draft
        ? [formatDate(draft.date, 'MMM D, YYYY'), formatCurrency(draft.cost, draft.currency, locale)].join(' · ')
        : '';
    const issues = row.issues.map((issue) => t(ISSUE_LABELS[issue]));
    const duplicate = row.duplicate && draft ? t('csvImport.rowDuplicate') : null;
    const notes = [t('csvImport.rowLine', { line: row.line }), ...issues, ...(duplicate ? [duplicate] : [])];
    const description = t('csvImport.rowCd', {
        line: row.line,
        title,
        detail,
        status: t(STATUS_LABELS[row.status]),
        issues: [...issues, ...(duplicate ? [duplicate] : [])].join('. '),
    });

    return (
        <View style={styles.previewRow} accessible accessibilityLabel={description}>
            <Icon name={visual.icon} size={24} color={visual.color} />
            <View style={styles.previewBody}>
                <Text style={[styles.previewTitle, { fontSize: scaleFont(typography.fontSize.base) }]} numberOfLines={2}>
                    {title}
                </Text>
                {detail ? (
                    <Text style={[styles.previewDetail, { fontSize: scaleFont(typography.fontSize.md) }]}>{detail}</Text>
                ) : null}
                <Text
                    style={[
                        styles.previewNotes,
                        row.status === 'ERROR' ? styles.errorText : null,
                        { fontSize: scaleFont(typography.fontSize.sm) },
                    ]}
                >
                    {notes.join(' · ')}
                </Text>
            </View>
        </View>
    );
}

export function CsvImportPreview({ vm }: Props) {
    const { t } = useI18n();
    const styles = useThemedStyles(createCsvImportStyles);
    const { scaleFont } = useResponsive();
    const small = { fontSize: scaleFont(typography.fontSize.sm) };
    const counts = vm.analysis?.counts;
    const rows = vm.analysis?.rows.slice(0, CSV_IMPORT_LIMITS.PREVIEW_ROWS) ?? [];
    const duplicates = counts?.duplicates ?? 0;
    const lines = counts
        ? [
            t('csvImport.countTotal', { count: counts.total }),
            t('csvImport.countReady', { count: counts.valid }),
            t('csvImport.countWarning', { count: counts.warning }),
            t('csvImport.countError', { count: counts.error }),
            t('csvImport.countSkipped', { count: counts.skippedIncome }),
            t('csvImport.countDuplicates', { count: counts.duplicates }),
        ]
        : [];

    return (
        <>
            <Card title={t('csvImport.summaryTitle')}>
                {counts ? (
                    <View accessible accessibilityLabel={lines.join('. ')}>
                        {lines.map((line, i) => (
                            <Text
                                key={line}
                                style={[
                                    styles.body,
                                    i === 3 && counts.error > 0 ? styles.errorText : null,
                                    { fontSize: scaleFont(typography.fontSize.md) },
                                ]}
                            >
                                {line}
                            </Text>
                        ))}
                    </View>
                ) : (
                    <Text style={[styles.body, { fontSize: scaleFont(typography.fontSize.md) }]}>
                        {t('csvImport.previewEmpty')}
                    </Text>
                )}
            </Card>

            {duplicates > 0 || vm.duplicatesCheckFailed || vm.duplicatesCheckTruncated ? (
                <Card title={t('csvImport.dupTitle')}>
                    {vm.duplicatesCheckFailed ? (
                        <Text style={[styles.errorText, small]}>{t('csvImport.dupCheckFailed')}</Text>
                    ) : null}
                    {vm.duplicatesCheckTruncated ? (
                        <Text style={[styles.hint, small]}>{t('csvImport.dupTruncated')}</Text>
                    ) : null}
                    {duplicates > 0 ? (
                        <>
                            <Text style={[styles.body, { fontSize: scaleFont(typography.fontSize.md) }]}>
                                {t('csvImport.dupBody', { count: duplicates })}
                            </Text>
                            <RadioRow
                                label={t('csvImport.dupSkip')}
                                active={vm.skipDuplicates}
                                onPress={() => vm.setSkipDuplicates(true)}
                            />
                            <RadioRow
                                label={t('csvImport.dupKeep')}
                                active={!vm.skipDuplicates}
                                onPress={() => vm.setSkipDuplicates(false)}
                            />
                        </>
                    ) : null}
                </Card>
            ) : null}

            {rows.length > 0 ? (
                <Card>
                    {(vm.analysis?.rows.length ?? 0) > rows.length ? (
                        <Text style={[styles.hint, small]}>
                            {t('csvImport.previewShowing', {
                                shown: rows.length,
                                total: vm.analysis?.rows.length ?? rows.length,
                            })}
                        </Text>
                    ) : null}
                    {rows.map((row) => (
                        <PreviewRow key={row.line} row={row} />
                    ))}
                </Card>
            ) : null}
        </>
    );
}
