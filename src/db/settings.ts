import { useLiveQuery } from 'dexie-react-hooks'
import type { Settings, SettingRow } from '../models'
import { db, type GruzzoloDB } from './db'

export const DEFAULT_ACCENT = '#0f766e'

export const defaultSettings: Settings = {
  theme: 'auto',
  accent: DEFAULT_ACCENT,
  initialBalanceCents: 0,
  backupReminderDays: 14,
  lastBackupAt: null,
  autoLockMinutes: 5,
  pin: null,
  installHintDismissedAt: null,
}

export function mergeSettings(rows: SettingRow[]): Settings {
  const merged: Settings = { ...defaultSettings }
  for (const row of rows) {
    if (row.key in defaultSettings) {
      ;(merged as unknown as Record<string, unknown>)[row.key] = row.value
    }
  }
  return merged
}

export async function getSettings(database: GruzzoloDB = db): Promise<Settings> {
  return mergeSettings(await database.settings.toArray())
}

export async function setSetting<K extends keyof Settings>(
  key: K,
  value: Settings[K],
  database: GruzzoloDB = db,
): Promise<void> {
  await database.settings.put({ key, value } as SettingRow)
}

/** Impostazioni reattive: `undefined` finché IndexedDB non ha risposto. */
export function useSettings(): Settings | undefined {
  return useLiveQuery(async () => mergeSettings(await db.settings.toArray()), [])
}
