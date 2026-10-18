/**
 * Condivide un file con la Web Share API (su iPhone: "Salva su File", iCloud Drive, AirDrop…);
 * su computer, o dove non è disponibile, lo scarica. Restituisce false se l'utente annulla.
 */
export async function shareOrDownload(file: File): Promise<boolean> {
  // Su desktop la condivisione apre il pannello di sistema: meglio un download diretto.
  const touch = window.matchMedia?.('(pointer: coarse)').matches ?? false
  if (touch && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: file.name })
      return true
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return false
      // Altri errori (es. permesso negato): ripiega sul download.
    }
  }
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return true
}

/** Legge un file scelto dall'utente come testo. */
export function readFileText(file: File): Promise<string> {
  return file.text()
}
