/** Testi dell'interfaccia in italiano. Le altre lingue devono avere le stesse chiavi. */
export const it = {
  app: {
    name: 'Gruzzolo',
    tagline: 'Entrate, spese e investimenti, sul tuo dispositivo.',
  },
  nav: {
    overview: 'Panoramica',
    transactions: 'Movimenti',
    investments: 'Investimenti',
    settings: 'Impostazioni',
    main: 'Navigazione principale',
    add: 'Aggiungi movimento',
  },
  common: {
    comingSoon: 'In arrivo nelle prossime fasi.',
    loading: 'Caricamento…',
    reload: 'Ricarica',
    later: 'Più tardi',
  },
  update: {
    available: 'Nuova versione disponibile.',
    offlineReady: 'Gruzzolo è pronto per funzionare offline.',
  },
} as const

type Widen<T> = T extends string ? string : { [K in keyof T]: Widen<T[K]> }

export type Messages = Widen<typeof it>
