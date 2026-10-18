import { useLiveQuery } from 'dexie-react-hooks'
import { Hash, LayoutGrid } from 'lucide-react'
import type { ReactNode } from 'react'
import { LinkRow, ListGroup } from '../../components/ListGroup'
import { PageHeader } from '../../components/PageHeader'
import { db } from '../../db/db'
import { t } from '../../i18n'

function RowIcon({ color, children }: { color: string; children: ReactNode }) {
  return (
    <span
      aria-hidden="true"
      className="flex size-8 items-center justify-center rounded-lg text-white [&>svg]:size-[18px]"
      style={{ backgroundColor: color }}
    >
      {children}
    </span>
  )
}

export function SettingsPage() {
  const categoryCount = useLiveQuery(
    async () => (await db.categories.toArray()).filter((c) => !c.archived).length,
    [],
  )
  const tagCount = useLiveQuery(
    async () => (await db.transactions.orderBy('tags').uniqueKeys()).length,
    [],
  )

  return (
    <>
      <PageHeader title={t().settings.title} />
      <ListGroup title={t().settings.organize}>
        <LinkRow
          to="/impostazioni/categorie"
          label={t().settings.categories}
          detail={categoryCount?.toString()}
          icon={
            <RowIcon color="#0f766e">
              <LayoutGrid />
            </RowIcon>
          }
        />
        <LinkRow
          to="/impostazioni/tag"
          label={t().settings.tags}
          detail={tagCount?.toString()}
          icon={
            <RowIcon color="#7c3aed">
              <Hash />
            </RowIcon>
          }
        />
      </ListGroup>
    </>
  )
}
