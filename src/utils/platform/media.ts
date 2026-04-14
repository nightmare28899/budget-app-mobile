import { API_BASE_URL } from '../core/constants';

const ABSOLUTE_URI_REGEX = /^[a-z][a-z0-9+.-]*:\/\//i;

const AVATAR_FIELD_CANDIDATES = [
    'avatarUrl',
    'avatar',
    'profileImageUrl',
    'profileImage',
    'imageUrl',
    'avatarUri',
] as const;

export function isRemoteHttpUri(uri: string): boolean {
    return /^https?:\/\//i.test(uri.trim());
}

function isPrivateIpv4(host: string): boolean {
    const parts = host.split('.');
    if (parts.length !== 4 || parts.some((p) => !/^\d+$/.test(p))) {
        return false;
    }

    const [a, b] = parts.map((p) => Number(p));
    if (a === 10) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 127) return true;
    return false;
}

export function isLikelyInternalRemoteUri(uri: string): boolean {
    if (!isRemoteHttpUri(uri)) {
        return false;
    }

    try {
        const { hostname } = new URL(uri);
        const host = hostname.trim().toLowerCase();

        if (!host || host === 'localhost') {
            return true;
        }
        if (host.includes('minio')) {
            return true;
        }
        if (host.endsWith('.local') || host.endsWith('.internal')) {
            return true;
        }
        if (isPrivateIpv4(host)) {
            return true;
        }
        if (!host.includes('.')) {
            return true;
        }

        return false;
    } catch {
        return false;
    }
}

export function normalizeImageUri(value?: string | null): string | null {
    if (typeof value !== 'string') {
        return value ?? null;
    }

    const trimmed = value.trim();
    if (!trimmed.length) {
        return null;
    }

    if (
        trimmed.startsWith('file://') ||
        trimmed.startsWith('content://') ||
        trimmed.startsWith('data:')
    ) {
        return trimmed;
    }

    if (ABSOLUTE_URI_REGEX.test(trimmed)) {
        return trimmed;
    }

    try {
        const apiOrigin = new URL(API_BASE_URL).origin;
        const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
        return new URL(path, apiOrigin).toString();
    } catch {
        return trimmed;
    }
}

export function extractAvatarUri(payload: unknown): string | null | undefined {
    if (!payload || typeof payload !== 'object') {
        return undefined;
    }

    const record = payload as Record<string, unknown>;
    let explicitNull = false;

    for (const key of AVATAR_FIELD_CANDIDATES) {
        const value = record[key];

        if (typeof value === 'string') {
            const normalized = normalizeImageUri(value);
            if (normalized) {
                return normalized;
            }
        } else if (value === null) {
            explicitNull = true;
        }
    }

    return explicitNull ? null : undefined;
}
