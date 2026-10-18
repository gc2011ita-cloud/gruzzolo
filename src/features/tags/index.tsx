import type { FeatureModule } from '../types'
import { TagsPage } from './TagsPage'

export const tagsModule: FeatureModule = {
  id: 'tags',
  routes: [{ path: '/impostazioni/tag', element: <TagsPage /> }],
}
