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

/** 平台日志存储：只用于管理普通日志的保留期（管理账号），密码不返回 */
export interface LogStorage {
  url: string;
  database: string;
  adminUser: string;
  adminPasswordSet: boolean;
}

/** 管理密码留空表示沿用已保存的密码 */
export interface LogStorageWrite {
  url: string;
  database: string;
  adminUser: string;
  adminPassword?: string;
}

export interface LogStorageTestResult {
  adminOk: boolean;
  adminMessage?: string;
  version?: string;
  retentionDays?: number;
}

/** path 为日志自带列（time、actor 等）或 data.<路径>；值都以文本传递 */
export interface LogQueryCondition {
  path: string;
  type: string;
  operator: string;
  value?: string;
  value2?: string;
}

/** 日志查询：events 为空表示全部事件；actor、server 精确匹配；keyword 在 data 里搜索；conditions 按字段路径过滤 */
export interface LogQueryParams {
  startTime: number;
  endTime: number;
  events: string[];
  actor?: string;
  server?: string;
  keyword?: string;
  relation: string;
  conditions: LogQueryCondition[];
  page: number;
  pageSize: number;
}

/** 日志源：项目查询日志用的 ClickHouse（只读账号），每个项目一个，密码不返回 */
export interface LogSourceRecord {
  url: string;
  database: string;
  readUser: string;
  readPasswordSet: boolean;
  updatedAt: number;
}

/** 密码留空表示沿用已保存的密码 */
export interface LogSourceWrite {
  url: string;
  database: string;
  readUser: string;
  readPassword?: string;
}

/** 事件字典：fields 是 JSON 文本 [{ path, label, type }] */
export interface LogEventDict {
  event: string;
  label: string;
  description: string;
  fields: string;
  updatedAt?: number;
}

/** 最近有数据的事件 */
export interface EventSummary {
  event: string;
  total: number;
  lastTime: number;
}

/** 事件的字段：types 是 ClickHouse 类型，同一字段可能出现过多种；sample 是最新一条日志的 data */
export interface EventFields {
  fields: { path: string; types: string[] }[];
  sample?: Record<string, unknown>;
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

export interface LogQueryResult {
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

/** 数据源：业务服务器的查询接口，密钥不返回，只返回是否已设置 */
export interface DataSourceRecord {
  id: number;
  name: string;
  type: string;
  url: string;
  secretSet: boolean;
  timeoutMs: number;
  remark: string;
  templateCount: number;
  createdAt: number;
  updatedAt: number;
}

/** 密钥留空表示沿用已保存的密钥 */
export interface DataSourceWrite {
  name: string;
  url: string;
  secret?: string;
  timeoutMs: number;
  remark?: string;
}

/** 查询参数定义；select 的 options 是可选值 */
export interface DataParam {
  name: string;
  label: string;
  type: 'boolean' | 'number' | 'select' | 'string' | 'time';
  required: boolean;
  options?: { label: string; value: string }[];
}

/** 业务服务器查询清单里的一项（GET /admin/queries） */
export interface BusinessQuery {
  name: string;
  label?: string;
  description?: string;
  params?: DataParam[];
  fields?: { key: string; label?: string; type?: string }[];
}

/** 数据查询模板；params、fields 是 JSON 文本 */
export interface DataTemplateRecord {
  id: number;
  sourceId: number;
  sourceName?: string;
  name: string;
  query: string;
  params: string;
  fields: string;
  createdAt: number;
  updatedAt: number;
}

export interface DataTemplateWrite {
  sourceId: number;
  name: string;
  query: string;
  params: string;
  fields: string;
}

/** 业务服务器返回的结果行原样透传 */
export interface DataQueryResult {
  total: number;
  list: Record<string, unknown>[];
}
