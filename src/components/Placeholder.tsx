import { t } from '../i18n'
import { PageHeader } from './PageHeader'

export function Placeholder({ title }: { title: string }) {
  return (
    <>
      <PageHeader title={title} />
      <p className="rounded-2xl bg-surface p-4 text-muted">{t().common.comingSoon}</p>
    </>
  )
}
