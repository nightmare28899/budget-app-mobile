const MAX_DRAWER_BADGE = 99;

/** Drawer row badge text: hidden for null/zero, capped at "99+". */
export function formatDrawerBadge(count: number | null | undefined): string | null {
    if (count == null || count <= 0) {
        return null;
    }
    return count > MAX_DRAWER_BADGE ? `${MAX_DRAWER_BADGE}+` : String(count);
}
