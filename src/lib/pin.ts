import type { PinConfig } from '../models'

/**
 * Il PIN non viene mai salvato: si conserva solo un hash PBKDF2-SHA256 con sale casuale.
 * Nota: protegge l'accesso all'interfaccia, non cifra i dati in IndexedDB.
 */
export const PIN_ITERATIONS = 310_000
export const PIN_MIN = 4
export const PIN_MAX = 8

export function isValidPin(pin: string): boolean {
  return new RegExp(`^\\d{${PIN_MIN},${PIN_MAX}}$`).test(pin)
}

const toBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes))
const fromBase64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))

async function derive(pin: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, [
    'deriveBits',
  ])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    key,
    256,
  )
  return new Uint8Array(bits)
}

export async function createPin(pin: string, iterations = PIN_ITERATIONS): Promise<PinConfig> {
  if (!isValidPin(pin)) throw new Error('PIN non valido')
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const hash = await derive(pin, salt, iterations)
  return { hash: toBase64(hash), salt: toBase64(salt), iterations, length: pin.length }
}

/** Confronto a tempo costante, per non rivelare quante cifre sono corrette. */
export async function verifyPin(pin: string, config: PinConfig): Promise<boolean> {
  const expected = fromBase64(config.hash)
  const actual = await derive(pin, fromBase64(config.salt), config.iterations)
  if (actual.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < actual.length; i++) diff |= actual[i]! ^ expected[i]!
  return diff === 0
}

/** Attesa dopo tentativi sbagliati: nessuna fino a 4, poi 30 s, 1 min, 2 min… (max 15 min). */
export function lockoutMs(failedAttempts: number): number {
  if (failedAttempts < 5) return 0
  return Math.min(30_000 * 2 ** (failedAttempts - 5), 15 * 60_000)
}
