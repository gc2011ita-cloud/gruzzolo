import { PieChart } from 'lucide-react'
import { t } from '../../i18n'
import type { FeatureModule } from '../types'
import { OverviewPage } from './OverviewPage'

export const overviewModule: FeatureModule = {
  id: 'overview',
  tab: { path: '/', label: t().nav.overview, icon: PieChart, order: 10 },
  routes: [{ path: '/', element: <OverviewPage /> }],
}
