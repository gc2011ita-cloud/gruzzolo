import { createContext, useContext } from 'react'

export interface LockApi {
  /** Blocca subito l'app (se il PIN è attivo). */
  lock: () => void
}

export const LockContext = createContext<LockApi>({ lock: () => {} })

export function useLock(): LockApi {
  return useContext(LockContext)
}
