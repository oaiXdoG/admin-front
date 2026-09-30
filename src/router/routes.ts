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
  { name: 'data', path: '/data', title: '数据中心', parent: '', directory: true },
  { name: 'data_query', path: '/data/query', title: '数据查询', parent: '数据中心', directory: false },
  { name: 'data_log', path: '/data/log', title: '日志查询', parent: '数据中心', directory: false },
  { name: 'data_template', path: '/data/template', title: '查询模板管理', parent: '数据中心', directory: false },
  { name: 'server', path: '/server', title: '服务器管理', parent: '', directory: true },
  { name: 'server_monitor', path: '/server/monitor', title: '性能监控', parent: '服务器管理', directory: false },
  { name: 'server_operations', path: '/server/operations', title: '运维操作', parent: '服务器管理', directory: false },
] as const satisfies readonly AppRoute[]

export type AppRouteName = (typeof appRoutes)[number]['name']
export type AppRoutePath = (typeof appRoutes)[number]['path']

export function findRouteByPath(path: string) {
  return appRoutes.find((item) => item.path === path)
}

export function findRouteByName(name: string) {
  return appRoutes.find((item) => item.name === name)
}
