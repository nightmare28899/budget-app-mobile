export type LinkExpensesPayload = { expenseIds: string[] };

/** Body for POST /subscriptions/:id/(un)link-expenses: unique, non-empty ids only. */
export function buildLinkExpensesPayload(expenseIds: string[]): LinkExpensesPayload {
    const unique = Array.from(
        new Set(expenseIds.map((id) => id.trim()).filter((id) => id.length > 0)),
    );

    if (unique.length === 0) {
        throw new Error('At least one expense id is required');
    }

    return { expenseIds: unique };
}

export function diffExpenseLinks(initial: string[], selected: string[]) {
    const initialSet = new Set(initial);
    const selectedSet = new Set(selected);

    return {
        toLink: selected.filter((id) => !initialSet.has(id)),
        toUnlink: initial.filter((id) => !selectedSet.has(id)),
    };
}
