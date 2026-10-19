import { useEffect } from 'react'
import type { ThemePreference } from '../models'

const darkQuery = '(prefers-color-scheme: dark)'

export function resolveTheme(pref: ThemePreference): 'light' | 'dark' {
  if (pref !== 'auto') return pref
  return window.matchMedia?.(darkQuery).matches ? 'dark' : 'light'
}

/** Applica tema e colore d'accento a <html>, seguendo il sistema quando il tema è "auto". */
export function useApplyTheme(pref: ThemePreference, accent: string): void {
  useEffect(() => {
    const root = document.documentElement
    const apply = () => {
      const theme = resolveTheme(pref)
      root.dataset.theme = theme
      root.style.colorScheme = theme
      // Colore della barra di stato/indirizzi coerente con il tema scelto.
      for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
        meta.content = theme === 'dark' ? '#000000' : '#f2f2f7'
        meta.removeAttribute('media')
      }
    }
    apply()
    if (pref !== 'auto' || !window.matchMedia) return
    const mq = window.matchMedia(darkQuery)
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [pref])

  useEffect(() => {
    document.documentElement.style.setProperty('--accent', accent)
  }, [accent])
}
