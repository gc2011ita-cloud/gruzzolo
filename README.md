# Gruzzolo

Web app installabile (PWA) per registrare **entrate e spese**, organizzarle per **categorie e tag**
e seguire l'andamento degli **investimenti**. Funziona offline e non ha backend né account:
**tutti i dati restano sul dispositivo** (IndexedDB). Pensata per iPhone (Safari → "Aggiungi alla
schermata Home"), funziona anche su computer.

## Funzionalità

- **Movimenti**: entrate e uscite con importo, categoria, data (anche passata o futura), tag, nota
  e foto dello scontrino. Inserimento in 3 tocchi dal pulsante "+".
- **Elenco** raggruppato per giorno, ricerca senza accenti, filtri per periodo, tipo, categorie, tag
  e importo; eliminazione con "Annulla".
- **Categorie** personalizzabili (nome, icona, colore, ordine, archivio) e **tag** come
  sottocategorie personali (rinomina, unione, eliminazione).
- **Panoramica**: saldo attuale e previsto, totali del periodo con confronto con il periodo
  precedente, spesa per categoria, andamento entrate/uscite e saldo nel tempo, prossimi movimenti.
- **Investimenti**: versamenti, prelievi e aggiornamenti di valore; capitale investito, valore,
  guadagno e rendimento; grafico e ripartizione del portafoglio.
- **Dati**: export CSV (compatibile con Excel in italiano) e report PDF, import da CSV con
  mappatura delle colonne, backup e ripristino JSON, promemoria del backup.
- **Sicurezza**: blocco con PIN (hash PBKDF2, mai salvato in chiaro) e blocco automatico.
- **Aspetto**: tema automatico/chiaro/scuro e colore d'accento.

## Requisiti

- Node.js 20 o superiore (consigliato 22 o 24 LTS)
- Git

## Sviluppo locale

```bash
npm install
npm run dev
```

Apri l'indirizzo mostrato nel terminale (di solito `http://localhost:5173`).

| Comando           | Cosa fa                                                            |
| ----------------- | ------------------------------------------------------------------ |
| `npm run dev`     | Server di sviluppo, visibile anche dagli altri dispositivi in rete |
| `npm run build`   | Controllo dei tipi e build di produzione in `dist/`                |
| `npm run preview` | Serve la build di produzione (service worker attivo)               |
| `npm test`        | Test con Vitest                                                    |
| `npm run lint`    | ESLint                                                             |
| `npm run format`  | Prettier                                                           |
| `npm run icons`   | Rigenera le icone PWA da `public/logo.svg`                         |

## Provare l'app da iPhone sulla rete locale

1. PC e iPhone sulla stessa rete Wi-Fi.
2. Avvia `npm run dev` (oppure `npm run build` e poi `npm run preview`).
3. Nel terminale compare un indirizzo `Network`, per esempio `http://192.168.1.20:5173`: aprilo in
   Safari sull'iPhone.
4. Se non si apre, consenti Node.js nel firewall di Windows per le reti private.

In HTTP sulla rete locale il service worker non si attiva (serve HTTPS): offline, installazione e
aggiornamenti vanno provati sulla versione pubblicata.

## Pubblicazione su GitHub Pages

Il workflow `.github/workflows/deploy.yml` esegue lint, test e build a ogni push su `main` e
pubblica `dist/` su GitHub Pages. Il percorso base (`/<nome-repository>/`) viene impostato da
solo, quindi il repository può avere qualsiasi nome.

1. Su GitHub crea un repository vuoto (senza README), per esempio `gruzzolo`.
2. Collega la cartella del progetto e invia il codice:

   ```bash
   git remote add origin https://github.com/<utente>/<repository>.git
   ```

   ```bash
   git push -u origin main
   ```

   Al primo push Git chiede l'accesso a GitHub dal browser.

3. Nel repository vai in **Settings → Pages** e in **Source** scegli **GitHub Actions**.
4. Nella scheda **Actions** attendi la fine del workflow "Deploy su GitHub Pages" (se il primo
   tentativo è partito prima del passo 3, rilancialo con **Run workflow**).
5. L'app è online in HTTPS su `https://<utente>.github.io/<repository>/`.

Ogni nuovo push su `main` pubblica una nuova versione; chi ha l'app aperta vede l'avviso
"Nuova versione disponibile" con il pulsante Ricarica.

### Alternative: Netlify o Cloudflare Pages

- **Netlify**: importa il repository; `netlify.toml` contiene già comando di build e cartella
  `dist`.
- **Cloudflare Pages**: comando di build `npm run build`, cartella di output `dist`, variabile
  d'ambiente `BASE_PATH=/`.

Su entrambe vengono applicate le intestazioni di `public/_headers` (cache del service worker,
Content-Security-Policy e altre protezioni). GitHub Pages non supporta intestazioni personalizzate.

### Verifica PWA

In Chrome sul computer apri l'app pubblicata, poi **DevTools → Application**: in **Manifest**
non devono esserci errori, in **Service workers** deve risultare attivo `sw.js`. Spuntando
**Offline** l'app deve continuare a funzionare. Lighthouse controlla prestazioni e accessibilità
(le versioni recenti non hanno più una sezione PWA separata).

## Installazione su iPhone

1. Apri l'indirizzo dell'app in **Safari**.
2. Tocca **Condividi** (il quadrato con la freccia verso l'alto).
3. Scegli **Aggiungi alla schermata Home** e conferma.

**Attenzione: l'app installata ha un archivio separato da Safari.** I dati inseriti in una scheda
di Safari non compaiono nell'app installata. Per spostarli: in Safari vai in Impostazioni → Dati e
backup → Crea e salva il backup (su File/iCloud Drive), poi nell'app installata usa
"Ripristina da un backup".

Installata nella schermata Home, l'app ottiene l'archiviazione persistente: iOS non cancella i dati
per liberare spazio. Il backup periodico resta comunque la protezione principale.

## Struttura del codice

```
src/
  db/          database Dexie, migrazioni versionate, seed, impostazioni
  models/      tipi TypeScript dei dati
  lib/         logica pura e testata: importi, date, saldi, statistiche, investimenti,
               CSV, backup, PDF, PIN
  features/    un modulo per sezione: overview, transactions, categories, tags,
               investments, data, security, settings
  components/  componenti UI riutilizzabili
  i18n/        testi dell'interfaccia (it.ts)
```

### Aggiungere un modulo

1. Crea `src/features/<nome>/index.tsx` che esporta un `FeatureModule` (rotte ed eventuale tab).
2. Registralo in `src/features/registry.ts`.
3. Se servono nuove tabelle, aggiungi **in fondo** a `src/db/migrations.ts` una nuova
   `db.version(n + 1)`. Non modificare le versioni già pubblicate: i dati esistenti vengono
   migrati senza perdite.

### Scelte tecniche

- Importi salvati come **interi in centesimi**, sempre positivi; il tipo (entrata/uscita) dà il
  segno. Nei campi si possono usare virgola o punto.
- Date come stringhe `aaaa-mm-gg` locali; settimana che inizia di lunedì.
- Il PIN protegge l'accesso all'interfaccia ma **non cifra** i dati sul dispositivo.
- Nessuna richiesta di rete: niente server, account o tracciamento.
