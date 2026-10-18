import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export interface FeatureRoute {
  path: string
  element: ReactNode
}

/**
 * Un modulo funzionale indipendente. Per aggiungerne uno: creare src/features/<nome>,
 * esportare un FeatureModule e registrarlo in src/features/registry.tsx.
 * Se servono nuove tabelle, aggiungere una versione in src/db/migrations.ts.
 */
export interface FeatureModule {
  id: string
  routes: FeatureRoute[]
  /** Se presente, il modulo compare nella barra di navigazione. */
  tab?: { path: string; label: string; icon: LucideIcon; order: number }
}
