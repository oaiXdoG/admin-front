/** 与后端约定的数据结构，接口返回统一为 { code, message, data }，code 为 0 表示成功 */

export interface LoginResult {
  token: string;
  id: number;
  account: string;
  username: string;
}

/** 早期创建的项目没有 App Key 和创建时间，超级管理员的项目没有 roleId，这些字段可能缺失 */
export interface ProjectItem {
  projectId: number;
  appKey?: string;
  name: string;
  createdAt?: null | number;
  roleId?: null | number;
  roleName?: string;
}

export interface ProjectListResult {
  currentProjectId: null | number;
  projects: ProjectItem[];
}

export interface ProjectCreateResult {
  projectId: number;
  appKey: string;
  name: string;
  createdAt: number;
  roleId: null | number;
  roleName: null | string;
  currentProjectId: number;
}

export interface AccountRecord {
  id: number;
  account: string;
  username: string;
}

export interface AccountMembership {
  projectId: number;
  roleId: number;
}

export interface MenuRecord {
  id: number;
  parentId: number;
  /** 1 目录，2 菜单 */
  menuType: number;
  name: string;
  icon: string;
  routeName: string;
  routePath: string;
  /** 1 启用，2 停用 */
  status: number;
  hidden: boolean;
  builtIn: boolean;
  sort: number;
}

export interface MenuWrite {
  parentId?: number;
  menuType: number;
  name: string;
  icon?: string;
  routeName?: string;
  routePath?: string;
  status: number;
  hidden?: boolean;
  sort?: number;
}

export interface RoleRecord {
  id: number;
  name: string;
  code: string;
  description: string;
  /** 1 启用，2 停用 */
  status: number;
  globalRole: boolean;
  builtIn: boolean;
}

export interface RoleWrite {
  name: string;
  code: string;
  description: string;
  status: number;
}

export interface RoleMenuResult {
  menus: MenuRecord[];
  menuIds: number[];
}
