// 与菜单管理同一套规则：目录名 manage、路径 /manage；子页面是 manage_页面名、/manage/页面名。
// 新页面必须先注册在这里，再在菜单管理里写到服务器，角色看到什么只看分配结果。

export type AppRoute = {
  name: string
  path: string
  title: string
  parent: string
  directory?: boolean
}

export const appRoutes = [
  { name: 'manage', path: '/manage', title: '系统管理', parent: '', directory: true },
  { name: 'manage_user', path: '/manage/user', title: '用户管理', parent: '系统管理', directory: false },
  { name: 'manage_role', path: '/manage/role', title: '角色管理', parent: '系统管理', directory: false },
  { name: 'manage_menu', path: '/manage/menu', title: '菜单管理', parent: '系统管理', directory: false },
  { name: 'manage_project', path: '/manage/project', title: '项目管理', parent: '系统管理', directory: false },
] as const satisfies readonly AppRoute[]

export type AppRouteName = (typeof appRoutes)[number]['name']
export type AppRoutePath = (typeof appRoutes)[number]['path']

export function findRouteByPath(path: string) {
  return appRoutes.find((item) => item.path === path)
}

export function findRouteByName(name: string) {
  return appRoutes.find((item) => item.name === name)
}
