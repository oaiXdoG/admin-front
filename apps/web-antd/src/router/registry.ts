// 与菜单管理同一套规则：目录名 manage、路径 /manage；子页面是 manage_页面名、/manage/页面名。
// 新页面必须先注册在这里（component 指向 src/views 下的页面），再在菜单管理里写到服务器，
// 角色看到什么只看分配结果。

export interface RegisteredRoute {
  name: string;
  path: string;
  title: string;
  /** 页面组件，相对 src/views，目录不需要 */
  component?: string;
  directory?: boolean;
}

export const registeredRoutes: RegisteredRoute[] = [
  { name: 'manage', path: '/manage', title: '系统管理', directory: true },
  {
    name: 'manage_user',
    path: '/manage/user',
    title: '用户管理',
    component: '/system/account/index',
  },
  {
    name: 'manage_role',
    path: '/manage/role',
    title: '角色管理',
    component: '/system/role/index',
  },
  {
    name: 'manage_menu',
    path: '/manage/menu',
    title: '菜单管理',
    component: '/system/menu/index',
  },
  {
    name: 'manage_project',
    path: '/manage/project',
    title: '项目管理',
    component: '/system/project/index',
  },
  { name: 'data', path: '/data', title: '数据中心', directory: true },
  {
    name: 'data_query',
    path: '/data/query',
    title: '数据查询',
    component: '/data-center/query',
  },
  {
    name: 'data_log',
    path: '/data/log',
    title: '日志查询',
    component: '/data-center/log',
  },
  {
    name: 'data_template',
    path: '/data/template',
    title: '查询模板管理',
    component: '/data-center/template',
  },
  { name: 'server', path: '/server', title: '服务器管理', directory: true },
  {
    name: 'server_monitor',
    path: '/server/monitor',
    title: '性能监控',
    component: '/server/monitor',
  },
  {
    name: 'server_operations',
    path: '/server/operations',
    title: '运维操作',
    component: '/server/operations',
  },
];

export function findRegisteredRoute(name: string, path?: string) {
  return (
    registeredRoutes.find((item) => item.name === name) ??
    registeredRoutes.find((item) => !!path && item.path === path)
  );
}
