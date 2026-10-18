import { ReceiptText } from 'lucide-react'
import { t } from '../../i18n'
import type { FeatureModule } from '../types'
import { TransactionForm } from './TransactionForm'
import { TransactionsPage } from './TransactionsPage'

export const transactionsModule: FeatureModule = {
  id: 'transactions',
  tab: { path: '/movimenti', label: t().nav.transactions, icon: ReceiptText, order: 20 },
  routes: [
    { path: '/movimenti', element: <TransactionsPage /> },
    { path: '/movimenti/nuovo', element: <TransactionForm key="new" /> },
    { path: '/movimenti/:id', element: <TransactionForm key="edit" /> },
  ],
}
