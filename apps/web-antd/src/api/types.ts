/**
 * 与后端约定的数据结构，接口返回统一为 { code, message, data }，code 为 0 表示成功。
 * 后端会省略值为 null 的字段，所以可能为空的字段都写成可选。
 * 状态统一为 1 启用（项目为正常）、2 停用（项目为已关闭）；时间均为毫秒时间戳。
 */

export const STATUS_ENABLED = 1;
export const STATUS_DISABLED = 2;

/** 菜单范围 */
export const SCOPE_PLATFORM = 1;
export const SCOPE_PROJECT = 2;

/** 角色类型 */
export const ROLE_PLATFORM = 1;
export const ROLE_TEMPLATE = 2;
export const ROLE_PROJECT = 3;

export interface LoginResult {
  token: string;
  id: number;
  account: string;
  username: string;
}

/** 项目切换器里的项目；超级管理员没有 roleId */
export interface ProjectItem {
  projectId: number;
  appKey?: string;
  name: string;
  createdAt?: number;
  roleId?: number;
  roleName?: string;
}

export interface ProjectListResult {
  currentProjectId?: number;
  projects: ProjectItem[];
}

/** 项目管理列表里的项目，包含已关闭项目 */
export interface ProjectManageItem {
  projectId: number;
  appKey: string;
  name: string;
  description: string;
  status: number;
  memberCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface ProjectWrite {
  appKey: string;
  name: string;
  description?: string;
}

export interface ProjectCreateResult {
  projectId: number;
  appKey: string;
  name: string;
  description?: string;
  createdAt: number;
  currentProjectId: number;
}

export interface AccountRecord {
  id: number;
  account: string;
  username: string;
  status: number;
  remark?: string;
  lastLoginAt?: number;
  createdAt: number;
  platformRoles: { code: string; id: number; name: string }[];
  projectCount: number;
}

export interface AccountMembership {
  projectId: number;
  roleId: number;
}

export interface ProjectMember {
  accountId: number;
  account: string;
  username: string;
  status: number;
  roleId: number;
  roleName: string;
  createdAt: number;
}

export interface MenuRecord {
  id: number;
  parentId: number;
  /** 1 目录，2 菜单 */
  menuType: number;
  /** 1 平台，2 项目；子项跟随上级 */
  scope: number;
  name: string;
  icon: string;
  routeName: string;
  routePath: string;
  status: number;
  hidden: boolean;
  builtIn: boolean;
  sort: number;
}

export interface MenuWrite {
  parentId?: number;
  menuType: number;
  scope?: number;
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
  roleType: number;
  projectId?: number;
  templateId?: number;
  templateName?: string;
  name: string;
  code: string;
  description: string;
  status: number;
  builtIn: boolean;
  createdAt: number;
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
