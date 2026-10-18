import { TrendingUp } from 'lucide-react'
import { Placeholder } from '../../components/Placeholder'
import { t } from '../../i18n'
import type { FeatureModule } from '../types'

export const investmentsModule: FeatureModule = {
  id: 'investments',
  tab: { path: '/investimenti', label: t().nav.investments, icon: TrendingUp, order: 30 },
  routes: [{ path: '/investimenti', element: <Placeholder title={t().nav.investments} /> }],
}
