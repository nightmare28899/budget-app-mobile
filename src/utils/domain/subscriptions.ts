export type QuickSubscriptionPresetGroup =
    | 'streaming'
    | 'cloud'
    | 'work'
    | 'gaming'
    | 'lifestyle'
    | 'other';

export type QuickSubscriptionPreset = {
    id: string;
    name: string;
    color: string;
    icon: string;
    group: QuickSubscriptionPresetGroup;
    defaultPrice?: number;
};

export const QUICK_SUBSCRIPTION_PRESET_GROUPS: QuickSubscriptionPresetGroup[] = [
    'streaming',
    'cloud',
    'work',
    'gaming',
    'lifestyle',
    'other',
];

export const QUICK_SUBSCRIPTION_PRESETS: QuickSubscriptionPreset[] = [
    { id: 'netflix', name: 'Netflix', color: '#E50914', icon: 'tv-outline', group: 'streaming', defaultPrice: 219 },
    { id: 'youtube', name: 'YouTube', color: '#FF0000', icon: 'logo-youtube', group: 'streaming', defaultPrice: 139 },
    { id: 'spotify', name: 'Spotify', color: '#1DB954', icon: 'musical-notes', group: 'streaming', defaultPrice: 129 },
    { id: 'apple-music', name: 'Apple Music', color: '#FA2A55', icon: 'logo-apple', group: 'streaming', defaultPrice: 129 },
    { id: 'disney', name: 'Disney+', color: '#113CCF', icon: 'film-outline', group: 'streaming', defaultPrice: 179 },
    { id: 'amazon', name: 'Amazon Prime', color: '#00A8E1', icon: 'logo-amazon', group: 'streaming', defaultPrice: 99 },
    { id: 'hbo', name: 'HBO Max', color: '#5B31D6', icon: 'film-outline', group: 'streaming', defaultPrice: 149 },
    { id: 'apple-tv', name: 'Apple TV+', color: '#111827', icon: 'tv-outline', group: 'streaming' },
    { id: 'paramount', name: 'Paramount+', color: '#2563EB', icon: 'play-circle-outline', group: 'streaming' },
    { id: 'crunchyroll', name: 'Crunchyroll', color: '#F97316', icon: 'sparkles-outline', group: 'streaming' },
    { id: 'icloud', name: 'iCloud', color: '#5AC8FA', icon: 'cloud-outline', group: 'cloud', defaultPrice: 17 },
    { id: 'google-one', name: 'Google One', color: '#4285F4', icon: 'logo-google', group: 'cloud', defaultPrice: 34 },
    { id: 'dropbox', name: 'Dropbox', color: '#0061FF', icon: 'logo-dropbox', group: 'cloud', defaultPrice: 199 },
    { id: 'cloud-backup', name: 'Cloud Backup', color: '#38BDF8', icon: 'cloud-upload-outline', group: 'cloud' },
    { id: 'vpn', name: 'VPN', color: '#0F766E', icon: 'shield-checkmark-outline', group: 'cloud' },
    { id: 'internet', name: 'Internet', color: '#3B82F6', icon: 'wifi-outline', group: 'cloud' },
    { id: 'phone-plan', name: 'Phone Plan', color: '#14B8A6', icon: 'call-outline', group: 'cloud' },
    { id: 'microsoft-365', name: 'Microsoft 365', color: '#F25022', icon: 'logo-microsoft', group: 'work', defaultPrice: 129 },
    { id: 'chatgpt', name: 'ChatGPT Plus', color: '#10A37F', icon: 'sparkles-outline', group: 'work' },
    { id: 'notion', name: 'Notion', color: '#111111', icon: 'reader-outline', group: 'work' },
    { id: 'github', name: 'GitHub', color: '#24292F', icon: 'code-slash-outline', group: 'work' },
    { id: 'adobe-cc', name: 'Adobe Creative Cloud', color: '#EF4444', icon: 'brush-outline', group: 'work' },
    { id: 'canva', name: 'Canva', color: '#06B6D4', icon: 'color-palette-outline', group: 'work' },
    { id: 'playstation', name: 'PlayStation Plus', color: '#0070D1', icon: 'logo-playstation', group: 'gaming', defaultPrice: 169 },
    { id: 'xbox', name: 'Xbox Game Pass', color: '#107C10', icon: 'logo-xbox', group: 'gaming', defaultPrice: 149 },
    { id: 'discord-nitro', name: 'Discord Nitro', color: '#5865F2', icon: 'chatbubbles-outline', group: 'gaming' },
    { id: 'duolingo', name: 'Duolingo', color: '#58CC02', icon: 'school-outline', group: 'lifestyle' },
    { id: 'delivery-plus', name: 'Delivery Plus', color: '#F97316', icon: 'bicycle-outline', group: 'lifestyle' },
    { id: 'news', name: 'News', color: '#475569', icon: 'newspaper-outline', group: 'lifestyle' },
    { id: 'gym', name: 'Gym', color: '#22C55E', icon: 'barbell-outline', group: 'lifestyle', defaultPrice: 500 },
    { id: 'other', name: 'Other', color: '#8C9BB8', icon: 'help-circle-outline', group: 'other' },
];

const FALLBACK_SUBSCRIPTION_COLOR = '#6C5CE7';
const FALLBACK_SUBSCRIPTION_ICON = 'sparkles-outline';

function normalizeName(value: string): string {
    return value.trim().toLowerCase();
}

export function getPresetByName(name: string): QuickSubscriptionPreset | undefined {
    const normalized = normalizeName(name);
    return QUICK_SUBSCRIPTION_PRESETS.find(
        (preset) => normalizeName(preset.name) === normalized,
    );
}

export function inferSubscriptionIcon(name: string): string {
    return getPresetByName(name)?.icon ?? FALLBACK_SUBSCRIPTION_ICON;
}

export function inferSubscriptionColor(name: string): string {
    return getPresetByName(name)?.color ?? FALLBACK_SUBSCRIPTION_COLOR;
}

export function withAlpha(hex: string, alpha: number): string {
    const normalized = hex.replace('#', '').trim();
    const full = normalized.length === 3
        ? normalized.split('').map((char) => `${char}${char}`).join('')
        : normalized;

    const r = Number.parseInt(full.slice(0, 2), 16);
    const g = Number.parseInt(full.slice(2, 4), 16);
    const b = Number.parseInt(full.slice(4, 6), 16);

    if (
        Number.isNaN(r) ||
        Number.isNaN(g) ||
        Number.isNaN(b)
    ) {
        return `rgba(255,255,255,${alpha})`;
    }
    return `rgba(${r},${g},${b},${alpha})`;
}

export function formatDateISO(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
