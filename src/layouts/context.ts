import type { ProjectListData } from '@/types/api.ts'

export type ProjectCreateValues = {
  appKey: string
  name: string
}

export type LayoutOutletContext = {
  projects: ProjectListData | null
  loading: boolean
  creating: boolean
  createOpen: boolean
  mustCreate: boolean
  canManage: boolean
  onOpenCreate: () => void
  onCloseCreate: () => void
  onCreate: (values: ProjectCreateValues) => void
  onRefreshProjects: () => Promise<void>
}
