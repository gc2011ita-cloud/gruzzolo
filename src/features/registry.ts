import { categoriesModule } from './categories'
import { dataModule } from './data'
import { investmentsModule } from './investments'
import { overviewModule } from './overview'
import { securityModule } from './security'
import { settingsModule } from './settings'
import { tagsModule } from './tags'
import { transactionsModule } from './transactions'
import type { FeatureModule } from './types'

/** Tutti i moduli attivi dell'app. Un nuovo modulo si aggiunge qui. */
export const features: FeatureModule[] = [
  overviewModule,
  transactionsModule,
  investmentsModule,
  settingsModule,
  categoriesModule,
  tagsModule,
  dataModule,
  securityModule,
]

export const tabs = features
  .flatMap((f) => (f.tab ? [f.tab] : []))
  .sort((a, b) => a.order - b.order)

export const routes = features.flatMap((f) => f.routes)
