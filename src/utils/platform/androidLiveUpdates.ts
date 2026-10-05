import { NativeModules, PermissionsAndroid, Platform } from 'react-native';

export type StatementImportStage = 'uploading' | 'parsing' | 'review' | 'done' | 'failed';

type LiveUpdatesNativeModule = {
    isPromotedSupported: () => Promise<boolean>;
    startStatementImport: (importId: string, label: string) => void;
    updateStatementImport: (
        importId: string,
        stage: StatementImportStage,
        progress: number,
        statementId: string | null,
    ) => void;
    endStatementImport: (importId: string) => void;
    showPaymentDue: (
        cardId: string,
        cardName: string,
        amount: number,
        dueDate: string,
        currency: string | null,
    ) => void;
    clearPaymentDue: (cardId: string) => void;
};

/** Payment-due live updates only make sense within this many days. */
export const PAYMENT_DUE_MAX_DAYS = 1;

function getModule(): LiveUpdatesNativeModule | undefined {
    if (Platform.OS !== 'android') {
        return undefined;
    }
    return NativeModules.BudgetLiveUpdates as LiveUpdatesNativeModule | undefined;
}

let permissionRequested = false;

/** Asks for POST_NOTIFICATIONS at use time (API 33+); once per session when denied. */
export async function ensureNotificationPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') {
        return false;
    }
    if (Number(Platform.Version) < 33) {
        return true;
    }
    try {
        const permission = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
        if (await PermissionsAndroid.check(permission)) {
            return true;
        }
        if (permissionRequested) {
            return false;
        }
        permissionRequested = true;
        return (await PermissionsAndroid.request(permission)) === PermissionsAndroid.RESULTS.GRANTED;
    } catch {
        return false;
    }
}

/** Native expects a number; NaN means "no progress value". */
export function normalizeProgress(progress?: number): number {
    if (progress === undefined || !Number.isFinite(progress)) {
        return Number.NaN;
    }
    return Math.min(1, Math.max(0, progress));
}

export async function isPromotedSupported(): Promise<boolean> {
    const module = getModule();
    if (!module) {
        return false;
    }
    try {
        return await module.isPromotedSupported();
    } catch {
        return false;
    }
}

export async function startStatementImport(importId: string, label: string): Promise<void> {
    const module = getModule();
    if (!module || !(await ensureNotificationPermission())) {
        return;
    }
    module.startStatementImport(importId, label);
}

/** `statementId` is the server id once known, so the tap opens the statement detail. */
export function updateStatementImport(
    importId: string,
    stage: StatementImportStage,
    progress?: number,
    statementId?: string,
): void {
    getModule()?.updateStatementImport(importId, stage, normalizeProgress(progress), statementId ?? null);
}

export function endStatementImport(importId: string): void {
    getModule()?.endStatementImport(importId);
}

export function shouldShowPaymentDue(daysUntilDue: number | null): daysUntilDue is number {
    return daysUntilDue !== null && daysUntilDue >= 0 && daysUntilDue <= PAYMENT_DUE_MAX_DAYS;
}

export async function showPaymentDue(
    cardId: string,
    cardName: string,
    amount: number,
    dueDate: string,
    currency?: string,
): Promise<void> {
    const module = getModule();
    if (!module || !(await ensureNotificationPermission())) {
        return;
    }
    module.showPaymentDue(cardId, cardName, amount, dueDate, currency ?? null);
}

export function clearPaymentDue(cardId: string): void {
    getModule()?.clearPaymentDue(cardId);
}

/** Maps the backend import status (and optional status) to the notification stage. */
export function stageForImportStatus(status: string): StatementImportStage {
    switch (status) {
        case 'NEEDS_REVIEW':
            return 'review';
        case 'FAILED':
            return 'failed';
        case 'UPLOADED':
        case 'PARSED':
            return 'parsing';
        default:
            return 'done';
    }
}
