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
    name: 'manage_role_template',
    path: '/manage/role-template',
    title: '角色模板',
    component: '/system/role-template/index',
  },
  {
    name: 'manage_menu',
    path: '/manage/menu',
    title: '菜单管理',
    component: '/system/menu/index',
  },
  {
    name: 'manage_setting',
    path: '/manage/setting',
    title: '系统设置',
    component: '/system/setting/index',
  },
  {
    name: 'manage_operation_log',
    path: '/manage/operation-log',
    title: '操作日志',
    component: '/system/operation-log/index',
  },
  {
    name: 'manage_project',
    path: '/manage/project',
    title: '项目管理',
    component: '/system/project/index',
  },
  { name: 'project', path: '/project', title: '项目设置', directory: true },
  {
    name: 'project_member',
    path: '/project/member',
    title: '成员管理',
    component: '/project/member/index',
  },
  {
    name: 'project_role',
    path: '/project/role',
    title: '角色管理',
    component: '/project/role/index',
  },
  { name: 'log', path: '/log', title: '日志中心', directory: true },
  {
    name: 'log_query',
    path: '/log/query',
    title: '日志查询',
    component: '/log-center/query',
  },
  {
    name: 'log_event',
    path: '/log/event',
    title: '事件管理',
    component: '/log-center/event',
  },
  {
    name: 'log_source',
    path: '/log/source',
    title: '日志源',
    component: '/log-center/source',
  },
  { name: 'data', path: '/data', title: '数据中心', directory: true },
  {
    name: 'data_query',
    path: '/data/query',
    title: '数据查询',
    component: '/data-center/query',
  },
  {
    name: 'data_template',
    path: '/data/template',
    title: '查询模板',
    component: '/data-center/template',
  },
  {
    name: 'data_source',
    path: '/data/source',
    title: '数据源',
    component: '/data-center/source',
  },
  { name: 'server', path: '/server', title: '服务器管理', directory: true },
  {
    name: 'server_host',
    path: '/server/host',
    title: '服务器列表',
    component: '/server/host',
  },
  {
    name: 'server_process',
    path: '/server/process',
    title: '进程管理',
    component: '/server/process',
  },
  {
    name: 'server_monitor',
    path: '/server/monitor',
    title: '监控详情',
    component: '/server/monitor',
  },
];

export function findRegisteredRoute(name: string, path?: string) {
  return (
    registeredRoutes.find((item) => item.name === name) ??
    registeredRoutes.find((item) => !!path && item.path === path)
  );
}
