import { lazy, Suspense } from 'react'
import type { FeatureModule } from '../types'

// Pagine usate di rado (con parser CSV e backup): caricate solo quando servono.
const DataPage = lazy(() => import('./DataPage').then((m) => ({ default: m.DataPage })))
const ImportPage = lazy(() => import('./ImportPage').then((m) => ({ default: m.ImportPage })))

export const dataModule: FeatureModule = {
  id: 'data',
  routes: [
    {
      path: '/impostazioni/dati',
      element: (
        <Suspense fallback={null}>
          <DataPage />
        </Suspense>
      ),
    },
    {
      path: '/impostazioni/dati/importa',
      element: (
        <Suspense fallback={null}>
          <ImportPage />
        </Suspense>
      ),
    },
  ],
}
