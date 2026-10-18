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

/** Sostituisce i segnaposto: fmt('Filtri ({n})', { n: 2 }) -> 'Filtri (2)'. */
export function fmt(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, key: string) =>
    key in values ? String(values[key]) : m,
  )
}
