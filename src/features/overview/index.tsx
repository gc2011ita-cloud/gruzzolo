import { PieChart } from 'lucide-react'
import { Placeholder } from '../../components/Placeholder'
import { t } from '../../i18n'
import type { FeatureModule } from '../types'

export const overviewModule: FeatureModule = {
  id: 'overview',
  tab: { path: '/', label: t().nav.overview, icon: PieChart, order: 10 },
  routes: [{ path: '/', element: <Placeholder title={t().nav.overview} /> }],
}
