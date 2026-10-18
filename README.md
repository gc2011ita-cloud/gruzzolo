# Gruzzolo

Web app installabile (PWA) per registrare entrate e spese, organizzarle per categorie e tag e
seguire l'andamento degli investimenti. Funziona offline e non ha backend né account: **tutti
i dati restano sul dispositivo** (IndexedDB).

## Requisiti

- Node.js 20 o superiore (consigliato 24 LTS)
- Git

## Sviluppo locale

```bash
npm install
npm run dev
```

Apri l'indirizzo mostrato nel terminale (di solito `http://localhost:5173`).

| Comando           | Cosa fa                                                                   |
| ----------------- | ------------------------------------------------------------------------- |
| `npm run dev`     | Server di sviluppo con ricarica automatica, visibile anche in rete locale |
| `npm run build`   | Controllo dei tipi e build di produzione in `dist/`                       |
| `npm run preview` | Serve la build di produzione (service worker attivo)                      |
| `npm test`        | Esegue i test con Vitest                                                  |
| `npm run lint`    | ESLint                                                                    |
| `npm run format`  | Prettier                                                                  |
| `npm run icons`   | Rigenera le icone PWA da `public/logo.svg`                                |

## Provare l'app da iPhone sulla rete locale

1. PC e iPhone devono essere sulla stessa rete Wi-Fi.
2. Avvia `npm run dev` (oppure `npm run build` seguito da `npm run preview`).
3. Nel terminale compare un indirizzo `Network`, per esempio `http://192.168.1.20:5173`:
   aprilo in Safari sull'iPhone.
4. Se non si apre, consenti Node.js nel firewall di Windows per le reti private.

Nota: in HTTP sulla rete locale il service worker non si attiva (serve HTTPS), quindi offline e
installazione completa vanno provati sulla versione pubblicata.

## Struttura

```
src/
  db/          database Dexie, migrazioni versionate, seed, impostazioni
  models/      tipi TypeScript dei dati
  lib/         logica pura e testata (importi, date, saldi, …)
  features/    un modulo per sezione (overview, transactions, investments, settings, …)
  components/  componenti UI riutilizzabili
  i18n/        testi dell'interfaccia
```

### Aggiungere un modulo

1. Crea `src/features/<nome>/index.tsx` che esporta un `FeatureModule` (rotte ed eventuale tab).
2. Registralo in `src/features/registry.ts`.
3. Se servono nuove tabelle, aggiungi **in fondo** a `src/db/migrations.ts` una nuova
   `db.version(n + 1)`. Non modificare mai le versioni già rilasciate: così i dati esistenti
   vengono migrati senza perdite.

### Importi

Gli importi sono salvati come **interi in centesimi** e sempre positivi; il tipo (entrata/uscita)
ne determina il segno. Nei campi si può usare sia la virgola sia il punto come separatore decimale.
