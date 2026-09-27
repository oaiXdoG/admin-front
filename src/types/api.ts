export type ApiResponse<T> = {
  code: number
  message: string
  data: T | null
}

export type LoginData = {
  token: string
  id: number
  account: string
  username: string
}

export type ProjectItem = {
  projectId: number
  name: string
  roleId: number | null
  roleName: string
}

export type ProjectListData = {
  currentProjectId: number | null
  projects: ProjectItem[]
}

export type ProjectCreateData = {
  projectId: number
  name: string
  roleId: number | null
  roleName: string | null
  currentProjectId: number
}

export type ProjectSwitchData = {
  currentProjectId: number
}

export type AccountCreateData = {
  id: number
  account: string
  username: string
}

export type AccountRecord = AccountCreateData

export type MenuRecord = {
  id: number
  parentId: number
  menuType: number
  name: string
  icon: string
  routeName: string
  routePath: string
  status: number
  hidden: boolean
  builtIn: boolean
  sort: number
}

export type MenuWrite = {
  parentId?: number
  menuType: number
  name: string
  icon?: string
  routeName?: string
  routePath?: string
  status: number
  hidden?: boolean
  sort?: number
}

export type RoleRecord = {
  id: number
  name: string
  code: string
  description: string
  status: number
  globalRole: boolean
  builtIn: boolean
}

export type RoleMenuData = {
  menus: MenuRecord[]
  menuIds: number[]
}
