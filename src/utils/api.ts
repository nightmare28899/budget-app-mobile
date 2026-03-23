function normalizeMessage(value: unknown): string | null {
    if (typeof value === 'string' && value.trim()) {
        return value;
    }

    if (Array.isArray(value)) {
        const messages = value
            .map((item) => (typeof item === 'string' ? item.trim() : ''))
            .filter(Boolean);

        return messages.length ? messages.join('\n') : null;
    }

    return null;
}

export function extractApiMessage(payload: unknown): string | null {
    if (typeof payload === 'string') {
        return payload.trim() || null;
    }

    if (!payload || typeof payload !== 'object') {
        return null;
    }

    const data = payload as Record<string, unknown>;

    return (
        normalizeMessage(data.message) ??
        normalizeMessage(data.error) ??
        normalizeMessage(data.detail) ??
        normalizeMessage(data.title)
    );
}
