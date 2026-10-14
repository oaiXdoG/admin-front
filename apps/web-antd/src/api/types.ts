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

/** 菜单类型 */
export const MENU_DIRECTORY = 1;
export const MENU_ITEM = 2;
export const MENU_BUTTON = 3;

export interface MenuRecord {
  id: number;
  parentId: number;
  /** 1 目录，2 菜单，3 按钮（routeName 是权限标识） */
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

export interface Profile {
  id: number;
  account: string;
  username: string;
  /** 图片 data URL，未设置为空字符串 */
  avatar: string;
  remark?: string;
  lastLoginAt?: number;
  createdAt: number;
  superAdmin: boolean;
  platformRoles: string[];
  projects: { projectId: number; projectName: string; roleName: string }[];
}

/** 全局品牌信息；copyright 是版权方名称，页脚显示为「Copyright © 当年 版权方」 */
export interface SystemSetting {
  appName: string;
  logo: string;
  favicon: string;
  loginTitle: string;
  loginDescription: string;
  copyright: string;
}

/** 日志存储（ClickHouse）连接配置，密码不返回，只返回是否已设置 */
export interface LogStorage {
  url: string;
  database: string;
  readUser: string;
  readPasswordSet: boolean;
  adminUser: string;
  adminPasswordSet: boolean;
}

/** 密码留空表示沿用已保存的密码 */
export interface LogStorageWrite {
  url: string;
  database: string;
  readUser: string;
  readPassword?: string;
  adminUser?: string;
  adminPassword?: string;
}

export interface LogStorageTestResult {
  readOk: boolean;
  readMessage?: string;
  /** 未配置管理账号时为空 */
  adminOk?: boolean;
  adminMessage?: string;
  version?: string;
  retentionDays?: number;
}

/** 查询模板；fields 是字段映射 JSON 文本 */
export interface QueryTemplateRecord {
  id: number;
  category: 'data' | 'log';
  name: string;
  event: string;
  fields: string;
  createdAt: number;
  updatedAt: number;
}

export interface QueryTemplateWrite {
  category: 'data' | 'log';
  name: string;
  event: string;
  fields: string;
}

export interface DataQueryCondition {
  field: string;
  operator: string;
  value?: string;
  value2?: string;
}

export interface DataQueryParams {
  templateId: number;
  startTime: number;
  endTime: number;
  relation: string;
  conditions: DataQueryCondition[];
  page: number;
  pageSize: number;
}

export interface LogRow {
  logId: string;
  time: number;
  server: string;
  actor: string;
  event: string;
  retention: string;
  data: Record<string, unknown>;
}

export interface DataQueryResult {
  database: string;
  total: number;
  list: LogRow[];
}

/** 后台操作日志的一行；params 是请求参数，密码和图片已脱敏 */
export interface OperationLogRow {
  id: number;
  time: number;
  accountId?: number;
  account: string;
  action: string;
  route: string;
  success: boolean;
  code: number;
  params: Record<string, unknown>;
}

export interface OperationLogParams {
  startTime: number;
  endTime: number;
  account?: string;
  action?: string;
  success?: boolean;
  page: number;
  pageSize: number;
}

/** 数据库备份设置、最近一次结果和已有备份；lastSuccess 为空表示还没有备份过 */
export interface BackupInfo {
  enabled: boolean;
  /** 每天备份的时间，HH:mm */
  time: string;
  keep: number;
  dir: string;
  running: boolean;
  lastTime?: number;
  lastSuccess?: boolean;
  lastMessage: string;
  files: { createdAt: number; name: string; size: number }[];
}
