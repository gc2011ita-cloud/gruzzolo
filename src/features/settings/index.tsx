import { Settings } from 'lucide-react'
import { Placeholder } from '../../components/Placeholder'
import { t } from '../../i18n'
import type { FeatureModule } from '../types'

export const settingsModule: FeatureModule = {
  id: 'settings',
  tab: { path: '/impostazioni', label: t().nav.settings, icon: Settings, order: 90 },
  routes: [{ path: '/impostazioni', element: <Placeholder title={t().nav.settings} /> }],
}
