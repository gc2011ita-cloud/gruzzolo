import type { FeatureModule } from '../types'
import { CategoriesPage } from './CategoriesPage'
import { CategoryForm } from './CategoryForm'

export const categoriesModule: FeatureModule = {
  id: 'categories',
  routes: [
    { path: '/impostazioni/categorie', element: <CategoriesPage /> },
    { path: '/impostazioni/categorie/nuova', element: <CategoryForm key="new" /> },
    { path: '/impostazioni/categorie/:id', element: <CategoryForm key="edit" /> },
  ],
}
