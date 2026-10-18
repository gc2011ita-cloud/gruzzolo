import { it, type Messages } from './it'

const catalogs: Record<string, Messages> = { it }

let current: Messages = it

export function setLanguage(lang: string): void {
  current = catalogs[lang] ?? it
}

/** Testi della lingua attiva. Uso: `t().nav.overview`. */
export function t(): Messages {
  return current
}
