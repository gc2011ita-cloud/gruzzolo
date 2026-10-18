import { TrendingUp } from 'lucide-react'
import { t } from '../../i18n'
import type { FeatureModule } from '../types'
import { EntryForm } from './EntryForm'
import { InvestmentDetail } from './InvestmentDetail'
import { InvestmentForm } from './InvestmentForm'
import { PortfolioPage } from './PortfolioPage'

export const investmentsModule: FeatureModule = {
  id: 'investments',
  tab: { path: '/investimenti', label: t().nav.investments, icon: TrendingUp, order: 30 },
  routes: [
    { path: '/investimenti', element: <PortfolioPage /> },
    { path: '/investimenti/nuovo', element: <InvestmentForm key="new" /> },
    { path: '/investimenti/:id', element: <InvestmentDetail /> },
    { path: '/investimenti/:id/modifica', element: <InvestmentForm key="edit" /> },
    { path: '/investimenti/:id/operazione', element: <EntryForm key="new" /> },
    { path: '/investimenti/:id/operazione/:entryId', element: <EntryForm key="edit" /> },
  ],
}
