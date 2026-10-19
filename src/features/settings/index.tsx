import { Settings } from 'lucide-react'
import { t } from '../../i18n'
import type { FeatureModule } from '../types'
import { AppearancePage } from './AppearancePage'
import { InfoPage } from './InfoPage'
import { InitialBalancePage } from './InitialBalancePage'
import { InstallPage } from './InstallPage'
import { SettingsPage } from './SettingsPage'

export const settingsModule: FeatureModule = {
  id: 'settings',
  tab: { path: '/impostazioni', label: t().nav.settings, icon: Settings, order: 90 },
  routes: [
    { path: '/impostazioni', element: <SettingsPage /> },
    { path: '/impostazioni/saldo-iniziale', element: <InitialBalancePage /> },
    { path: '/impostazioni/aspetto', element: <AppearancePage /> },
    { path: '/impostazioni/info', element: <InfoPage /> },
    { path: '/impostazioni/installa', element: <InstallPage /> },
  ],
}
