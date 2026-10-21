import React, { useEffect } from 'react';
import {
    BackHandler,
    PixelRatio,
    ScrollView,
    Text,
    View,
    useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootScreenProps } from '../../navigation/types';
import { AnimatedScreen } from '../../components/ui/primitives/AnimatedScreen';
import { Button } from '../../components/ui/primitives/Button';
import { HomeBackground } from '../../components/ui/layout/HomeBackground';
import { ScreenHeader } from '../../components/ui/layout/ScreenHeader';
import { useAppAlert } from '../../components/alerts/AlertProvider';
import { useCsvImport } from '../../hooks/csvImport/useCsvImport';
import type { CsvImportController } from '../../hooks/csvImport/useCsvImport';
import { useI18n } from '../../hooks/shared/useI18n';
import { csvImportTwoPane } from '../../modules/csvImport/csvImportLayout';
import { spacing, typography, useResponsive, useThemedStyles } from '../../theme/index';
import { CsvImportPreview, CsvImportSetup, errorText } from './CsvImportConfigure';
import { createCsvImportStyles } from './csvImportStyles';

const MAX_FAILURES_SHOWN = 20;

export function CsvImportScreen({ navigation }: RootScreenProps<'CsvImport'>) {
    const styles = useThemedStyles(createCsvImportStyles);
    const insets = useSafeAreaInsets();
    const { t } = useI18n();
    const { alert } = useAppAlert();
    const { horizontalPadding, contentMaxWidth, scaleFont } = useResponsive();
    const { width } = useWindowDimensions();
    const vm = useCsvImport();
    const importing = vm.stage === 'IMPORTING';

    // The import cannot be interrupted safely: every way back is swallowed until it ends.
    useEffect(() => {
        if (!importing) {
            return undefined;
        }
        const hardware = BackHandler.addEventListener('hardwareBackPress', () => true);
        const gesture = navigation.addListener('beforeRemove', (event) => event.preventDefault());
        return () => {
            hardware.remove();
            gesture();
        };
    }, [importing, navigation]);

    const confirmImport = () => {
        const skipped = vm.skipDuplicates ? vm.analysis?.counts.duplicates ?? 0 : 0;
        const message = [
            t(vm.isAccountMode ? 'csvImport.confirmAccount' : 'csvImport.confirmGuest'),
            skipped > 0 ? t('csvImport.confirmSkippedDups', { count: skipped }) : null,
            t('csvImport.confirmCurrencies'),
        ].filter(Boolean).join('\n\n');
        alert(t('csvImport.confirmTitle', { count: vm.rowsToImport }), message, [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('csvImport.confirmButton'), onPress: vm.startImport },
        ]);
    };

    const fontScale = PixelRatio.getFontScale();
    const twoPane = vm.stage === 'CONFIGURE' && csvImportTwoPane(width, fontScale);
    const contentMaxWidthStyle = contentMaxWidth
        ? { maxWidth: contentMaxWidth, alignSelf: 'center' as const, width: '100%' as const }
        : null;
    const bodyStyle = {
        paddingHorizontal: horizontalPadding,
        paddingBottom: spacing.base,
    };

    const renderFooter = () => {
        const needsMapping = !vm.mappingUsable;
        return (
            <View
                style={[
                    styles.footer,
                    { paddingHorizontal: horizontalPadding, paddingBottom: insets.bottom + spacing.base },
                    contentMaxWidthStyle,
                ]}
            >
                {needsMapping ? (
                    <Text style={[styles.errorText, { fontSize: scaleFont(typography.fontSize.sm) }]}>
                        {t(vm.mapping.date === undefined ? 'csvImport.mappingNeedsDate' : 'csvImport.mappingNeedsAmount')}
                    </Text>
                ) : null}
                <Button
                    title={t('csvImport.action', { count: vm.rowsToImport })}
                    onPress={confirmImport}
                    disabled={!vm.canImport}
                />
            </View>
        );
    };

    const renderPick = () => (
        <ScrollView
            contentContainerStyle={[styles.content, bodyStyle, contentMaxWidthStyle]}
            showsVerticalScrollIndicator={false}
        >
            <View style={styles.card}>
                <Text style={[styles.cardTitle, { fontSize: scaleFont(typography.fontSize.md) }]} accessibilityRole="header">
                    {t('csvImport.pickTitle')}
                </Text>
                <Text style={[styles.body, { fontSize: scaleFont(typography.fontSize.md) }]}>
                    {t('csvImport.pickBody')}
                </Text>
                <Button
                    title={t('csvImport.chooseFile')}
                    variant="secondary"
                    onPress={vm.pickFile}
                    disabled={vm.busy}
                    loading={vm.busy}
                />
                {vm.error ? (
                    <Text style={[styles.errorText, { fontSize: scaleFont(typography.fontSize.sm) }]}>
                        {errorText(vm, t)}
                    </Text>
                ) : null}
            </View>
        </ScrollView>
    );

    const renderConfigure = () => (
        <>
            {twoPane ? (
                <View style={[styles.twoPane, bodyStyle]}>
                    <ScrollView style={styles.pane} contentContainerStyle={styles.paneContent}>
                        <CsvImportSetup vm={vm} />
                    </ScrollView>
                    <ScrollView style={styles.pane} contentContainerStyle={styles.paneContent}>
                        <CsvImportPreview vm={vm} />
                    </ScrollView>
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={[styles.content, bodyStyle, contentMaxWidthStyle]}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <CsvImportSetup vm={vm} />
                    <CsvImportPreview vm={vm} />
                </ScrollView>
            )}
            {renderFooter()}
        </>
    );

    const renderProgress = () => {
        const done = vm.progress?.done ?? 0;
        const total = vm.progress?.total ?? 0;
        const settling = vm.progress?.settling === true;
        return (
            <View style={[bodyStyle, contentMaxWidthStyle]}>
                <View style={styles.card}>
                    <Text
                        style={[styles.cardTitle, { fontSize: scaleFont(typography.fontSize.md) }]}
                        accessibilityLiveRegion="polite"
                    >
                        {settling ? t('csvImport.syncing') : t('csvImport.progress', { done, total })}
                    </Text>
                    <View style={styles.progressTrack}>
                        <View
                            style={[
                                styles.progressFill,
                                { width: `${total > 0 && !settling ? Math.round((done / total) * 100) : 100}%` },
                            ]}
                        />
                    </View>
                    <Text style={[styles.hint, { fontSize: scaleFont(typography.fontSize.sm) }]}>
                        {t('csvImport.backBlocked')}
                    </Text>
                </View>
            </View>
        );
    };

    const renderResult = (current: CsvImportController) => {
        const report = current.report;
        const job = current.job;
        const incomplete = !!report && (report.hasUnfinished || report.failed > 0 || current.abort !== null);
        const leftOut = report ? (current.analysis?.counts.total ?? report.total) - report.total : 0;
        const needsResume = !!report && (report.notAttempted > 0 || report.queued > 0);
        const retryable = !!job && job.rows.some((r) => r.state === 'FAILED' && r.handle === null);
        const body = { fontSize: scaleFont(typography.fontSize.md) };
        const small = { fontSize: scaleFont(typography.fontSize.sm) };

        return (
            <ScrollView
                contentContainerStyle={[styles.content, bodyStyle, contentMaxWidthStyle]}
                showsVerticalScrollIndicator={false}
            >
                {report ? (
                    <View style={styles.card}>
                        <Text
                            style={[styles.cardTitle, { fontSize: scaleFont(typography.fontSize.md) }]}
                            accessibilityRole="header"
                            accessibilityLiveRegion="polite"
                        >
                            {t(incomplete ? 'csvImport.partialTitle' : 'csvImport.doneTitle')}
                        </Text>
                        {current.abort ? (
                            <Text style={[styles.errorText, small]}>
                                {t(current.abort === 'SESSION_CHANGED' ? 'csvImport.abortSession' : 'csvImport.abortFailures')}
                            </Text>
                        ) : null}
                        <Text style={[styles.body, body]}>{t('csvImport.resultConfirmed', { count: report.confirmed })}</Text>
                        {report.failed > 0 ? (
                            <Text style={[styles.errorText, body]}>{t('csvImport.resultFailed', { count: report.failed })}</Text>
                        ) : null}
                        {report.notAttempted > 0 ? (
                            <Text style={[styles.body, body]}>{t('csvImport.resultPending', { count: report.notAttempted })}</Text>
                        ) : null}
                        {leftOut > 0 ? (
                            <Text style={[styles.hint, small]}>{t('csvImport.resultLeftOut', { count: leftOut })}</Text>
                        ) : null}
                    </View>
                ) : null}
                {report && report.failures.length > 0 ? (
                    <View style={styles.card}>
                        <Text style={[styles.cardTitle, small]} accessibilityRole="header">
                            {t('csvImport.failuresTitle')}
                        </Text>
                        {report.failures.slice(0, MAX_FAILURES_SHOWN).map((failure) => (
                            <Text key={failure.line} style={[styles.hint, small]}>
                                {t('csvImport.failureRow', {
                                    line: failure.line,
                                    title: failure.title,
                                    error: failure.error ?? t('csvImport.failureUnknown'),
                                })}
                            </Text>
                        ))}
                    </View>
                ) : null}
                {needsResume ? (
                    <Button title={t('csvImport.resume')} onPress={current.resume} />
                ) : null}
                {retryable ? (
                    <Button title={t('csvImport.retryFailed')} variant="secondary" onPress={current.retryFailed} />
                ) : null}
                <Button
                    title={t('csvImport.finish')}
                    variant={needsResume ? 'secondary' : 'primary'}
                    onPress={() => navigation.goBack()}
                />
            </ScrollView>
        );
    };

    return (
        <View style={styles.container}>
            <HomeBackground />
            <AnimatedScreen style={styles.flex1} delay={20}>
                <View style={{ paddingTop: insets.top, paddingHorizontal: horizontalPadding }}>
                    <ScreenHeader
                        title={t('csvImport.title')}
                        onBack={() => {
                            if (!importing) {
                                navigation.goBack();
                            }
                        }}
                    />
                </View>
                {vm.stage === 'PICK' ? renderPick() : null}
                {vm.stage === 'CONFIGURE' ? renderConfigure() : null}
                {vm.stage === 'IMPORTING' ? renderProgress() : null}
                {vm.stage === 'DONE' ? renderResult(vm) : null}
            </AnimatedScreen>
        </View>
    );
}
