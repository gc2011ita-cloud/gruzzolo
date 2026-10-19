/** true se il dispositivo è un iPhone/iPad (anche iPad che si presenta come Mac). */
export function isIOS(): boolean {
  const ua = navigator.userAgent
  return /iphone|ipad|ipod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
}

/** true se l'app è aperta dalla schermata Home (PWA installata). */
export function isStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

/** Mostrare il suggerimento d'installazione: iPhone in Safari, non già installata. */
export function shouldSuggestInstall(): boolean {
  return isIOS() && !isStandalone()
}
