import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { db } from '../../db/db'
import type { Category, CategoryKind } from '../../models'

/** Categorie non archiviate di un tipo, nell'ordine scelto dall'utente. */
export function useCategories(kind: CategoryKind): Category[] | undefined {
  return useLiveQuery(
    async () =>
      (await db.categories.where('kind').equals(kind).sortBy('order')).filter((c) => !c.archived),
    [kind],
  )
}

/** Tutte le categorie (anche archiviate) indicizzate per id, per mostrare i movimenti. */
export function useCategoryMap(): Map<string, Category> {
  const all = useLiveQuery(() => db.categories.toArray(), [])
  return useMemo(() => new Map((all ?? []).map((c) => [c.id, c])), [all])
}

/** Tag già usati, in ordine alfabetico. */
export function useAllTags(): string[] {
  const tags = useLiveQuery(() => db.transactions.orderBy('tags').uniqueKeys(), [])
  return (tags as string[] | undefined) ?? NO_TAGS
}

const NO_TAGS: string[] = []
