import { Settings } from 'lucide-react'
import { t } from '../../i18n'
import type { FeatureModule } from '../types'
import { SettingsPage } from './SettingsPage'

export const settingsModule: FeatureModule = {
  id: 'settings',
  tab: { path: '/impostazioni', label: t().nav.settings, icon: Settings, order: 90 },
  routes: [{ path: '/impostazioni', element: <SettingsPage /> }],
}
