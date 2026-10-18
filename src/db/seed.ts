import type { Category, CategoryKind } from '../models'

type SeedRow = [id: string, name: string, icon: string, color: string]

const expense: SeedRow[] = [
  ['exp-groceries', 'Spesa alimentare', 'shopping-cart', '#16a34a'],
  ['exp-home', 'Casa', 'home', '#0d9488'],
  ['exp-utilities', 'Bollette', 'zap', '#ca8a04'],
  ['exp-transport', 'Trasporti', 'bus', '#2563eb'],
  ['exp-car', 'Auto', 'car', '#4f46e5'],
  ['exp-dining', 'Ristoranti e bar', 'utensils', '#ea580c'],
  ['exp-health', 'Salute', 'heart-pulse', '#dc2626'],
  ['exp-leisure', 'Svago', 'gamepad', '#9333ea'],
  ['exp-shopping', 'Shopping', 'shopping-bag', '#db2777'],
  ['exp-travel', 'Viaggi', 'plane', '#0284c7'],
  ['exp-education', 'Istruzione', 'graduation-cap', '#7c3aed'],
  ['exp-gifts', 'Regali', 'gift', '#e11d48'],
  ['exp-pets', 'Animali', 'paw-print', '#a16207'],
  ['exp-subscriptions', 'Abbonamenti', 'tv', '#0891b2'],
  ['exp-taxes', 'Tasse', 'landmark', '#475569'],
  ['exp-other', 'Altro', 'more', '#6b7280'],
]

const income: SeedRow[] = [
  ['inc-salary', 'Stipendio', 'briefcase', '#15803d'],
  ['inc-freelance', 'Lavoro autonomo', 'laptop', '#0f766e'],
  ['inc-refunds', 'Rimborsi', 'undo', '#2563eb'],
  ['inc-gifts', 'Regali ricevuti', 'gift', '#e11d48'],
  ['inc-interest', 'Interessi e dividendi', 'percent', '#7c3aed'],
  ['inc-sales', 'Vendite', 'tag', '#ea580c'],
  ['inc-other', 'Altro', 'more', '#6b7280'],
]

function toCategories(rows: SeedRow[], kind: CategoryKind): Category[] {
  return rows.map(([id, name, icon, color], order) => ({
    id,
    name,
    kind,
    icon,
    color,
    order,
    archived: false,
  }))
}

/** Categorie predefinite. Gli id sono stabili, così il seed è idempotente. */
export function defaultCategories(): Category[] {
  return [...toCategories(expense, 'expense'), ...toCategories(income, 'income')]
}
