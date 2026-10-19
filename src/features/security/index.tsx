import type { FeatureModule } from '../types'
import { SecurityPage } from './SecurityPage'

export const securityModule: FeatureModule = {
  id: 'security',
  routes: [{ path: '/impostazioni/sicurezza', element: <SecurityPage /> }],
}
