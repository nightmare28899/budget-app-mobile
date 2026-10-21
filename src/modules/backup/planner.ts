import { BackupPayload, emptyPayload, entities } from './models';
export type ImportMode = 'MERGE' | 'REPLACE';
export function planImport(
  current: BackupPayload,
  incoming: BackupPayload,
  mode: ImportMode,
) {
  const replace = mode === 'REPLACE';
  const base = replace ? emptyPayload() : current;
  const upserts = emptyPayload();
  const results = {} as Record<
    (typeof entities)[number],
    { added: number; updated: number; skipped: number }
  >;
  let unlinkedReferences = 0;
  let remappedCategories = 0;
  const categoryMap = new Map<string, string>();
  const categoryIds = new Set(base.categories.map(c => c.id));
  const names = new Map(
    base.categories.map(c => [c.name.trim().toLowerCase(), c.id]),
  );
  results.categories = { added: 0, updated: 0, skipped: 0 };
  for (const c of incoming.categories) {
    const name = c.name.trim().toLowerCase();
    if (categoryIds.has(c.id)) results.categories.skipped++;
    else if (names.has(name)) {
      categoryMap.set(c.id, names.get(name)!);
      results.categories.skipped++;
      remappedCategories++;
    } else {
      upserts.categories.push(c);
      categoryIds.add(c.id);
      names.set(name, c.id);
      results.categories.added++;
    }
  }
  const ids = new Map(
    entities.map(e => [
      e,
      new Set([...base[e], ...incoming[e]].map(r => r.id)),
    ]),
  );
  ids.set('categories', categoryIds);
  const linked = (value: string | null, entity: (typeof entities)[number]) => {
    if (!value || ids.get(entity)!.has(value)) return value;
    unlinkedReferences++;
    return null;
  };
  for (const entity of entities.slice(1)) {
    const existing = new Map<string, { id: string; updatedAtMillis?: number }>(
      base[entity].map(r => [r.id, r]),
    );
    const result = { added: 0, updated: 0, skipped: 0 };
    results[entity] = result;
    for (const item of incoming[entity]) {
      const row = { ...item };
      if ('categoryId' in row)
        row.categoryId = linked(
          categoryMap.get(row.categoryId!) ?? row.categoryId,
          'categories',
        );
      if ('creditCardId' in row)
        row.creditCardId = linked(row.creditCardId, 'creditCards');
      if ('subscriptionId' in row)
        row.subscriptionId = linked(row.subscriptionId, 'subscriptions');
      const previous = existing.get(row.id);
      if (
        entity === 'savingsTransactions' &&
        'goalId' in row &&
        !ids.get('savingsGoals')!.has(row.goalId)
      ) {
        result.skipped++;
        continue;
      }
      if (!previous) result.added++;
      else if (
        entity !== 'savingsTransactions' &&
        'updatedAtMillis' in row &&
        row.updatedAtMillis > (previous.updatedAtMillis ?? 0)
      )
        result.updated++;
      else {
        result.skipped++;
        continue;
      }
      (upserts[entity] as unknown[]).push(row);
    }
  }
  return {
    replace,
    upserts,
    settings: replace ? incoming.settings : null,
    summary: { mode, results, unlinkedReferences, remappedCategories },
  };
}
