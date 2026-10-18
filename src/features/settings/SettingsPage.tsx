import { useLiveQuery } from 'dexie-react-hooks'
import { DatabaseBackup, Hash, LayoutGrid, Wallet } from 'lucide-react'
import type { ReactNode } from 'react'
import { LinkRow, ListGroup } from '../../components/ListGroup'
import { PageHeader } from '../../components/PageHeader'
import { db } from '../../db/db'
import { useSettings } from '../../db/settings'
import { t } from '../../i18n'
import { formatCents } from '../../lib/money'

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
  const settings = useSettings()
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
      <ListGroup title={t().settings.money}>
        <LinkRow
          to="/impostazioni/saldo-iniziale"
          label={t().settings.initialBalance}
          detail={settings ? formatCents(settings.initialBalanceCents) : undefined}
          icon={
            <RowIcon color="#2563eb">
              <Wallet />
            </RowIcon>
          }
        />
      </ListGroup>
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
      <ListGroup title={t().settings.data}>
        <LinkRow
          to="/impostazioni/dati"
          label={t().settings.dataBackup}
          icon={
            <RowIcon color="#ea580c">
              <DatabaseBackup />
            </RowIcon>
          }
        />
      </ListGroup>
    </>
  )
}
