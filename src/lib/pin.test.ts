import { describe, expect, it } from 'vitest'
import { createPin, isValidPin, lockoutMs, verifyPin } from './pin'

describe('PIN', () => {
  it('accetta solo da 4 a 8 cifre', () => {
    expect(isValidPin('1234')).toBe(true)
    expect(isValidPin('12345678')).toBe(true)
    expect(isValidPin('123')).toBe(false)
    expect(isValidPin('123456789')).toBe(false)
    expect(isValidPin('12a4')).toBe(false)
  })

  it('salva solo hash e sale, e verifica il PIN', async () => {
    const config = await createPin('2468', 1000)
    expect(JSON.stringify(config)).not.toContain('2468')
    expect(config.length).toBe(4)
    expect(await verifyPin('2468', config)).toBe(true)
    expect(await verifyPin('2469', config)).toBe(false)
    expect(await verifyPin('24680', config)).toBe(false)
  })

  it('lo stesso PIN produce hash diversi grazie al sale', async () => {
    const a = await createPin('1111', 1000)
    const b = await createPin('1111', 1000)
    expect(a.hash).not.toBe(b.hash)
    expect(a.salt).not.toBe(b.salt)
  })

  it('rifiuta PIN non validi alla creazione', async () => {
    await expect(createPin('12', 1000)).rejects.toThrow()
  })

  it('attesa crescente dopo troppi tentativi', () => {
    expect(lockoutMs(4)).toBe(0)
    expect(lockoutMs(5)).toBe(30_000)
    expect(lockoutMs(6)).toBe(60_000)
    expect(lockoutMs(20)).toBe(15 * 60_000)
  })
})
