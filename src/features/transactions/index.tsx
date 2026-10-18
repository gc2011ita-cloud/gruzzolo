import { ReceiptText } from 'lucide-react'
import { Placeholder } from '../../components/Placeholder'
import { t } from '../../i18n'
import type { FeatureModule } from '../types'

export const transactionsModule: FeatureModule = {
  id: 'transactions',
  tab: { path: '/movimenti', label: t().nav.transactions, icon: ReceiptText, order: 20 },
  routes: [
    { path: '/movimenti', element: <Placeholder title={t().nav.transactions} /> },
    { path: '/movimenti/nuovo', element: <Placeholder title={t().nav.add} /> },
  ],
}
