import { investmentsModule } from './investments'
import { overviewModule } from './overview'
import { settingsModule } from './settings'
import { transactionsModule } from './transactions'
import type { FeatureModule } from './types'

/** Tutti i moduli attivi dell'app. Un nuovo modulo si aggiunge qui. */
export const features: FeatureModule[] = [
  overviewModule,
  transactionsModule,
  investmentsModule,
  settingsModule,
]

export const tabs = features
  .flatMap((f) => (f.tab ? [f.tab] : []))
  .sort((a, b) => a.order - b.order)

export const routes = features.flatMap((f) => f.routes)
