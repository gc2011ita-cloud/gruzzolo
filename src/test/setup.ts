import { Blob as NodeBlob } from 'node:buffer'
import 'fake-indexeddb/auto'

// Il Blob di happy-dom non sopravvive alla copia strutturata del finto IndexedDB;
// quello di Node sì, come accade con i Blob veri nei browser.
globalThis.Blob = NodeBlob as unknown as typeof Blob
