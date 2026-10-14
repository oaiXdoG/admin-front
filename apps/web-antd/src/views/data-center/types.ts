import type { TreeProps } from 'ant-design-vue';

import type { LogRow, QueryTemplateRecord } from '#/api/types';

import { toRaw } from 'vue';

import dayjs from 'dayjs';

export type Category = 'data' | 'log';
export type ValueType =
  | 'boolean'
  | 'json'
  | 'jsonText'
  | 'number'
  | 'string'
  | 'time';

export interface JsonMapping {
  label: string;
  path: string;
  type: ValueType;
}

export interface JsonConfig {
  mappings: JsonMapping[];
  sample?: string;
  showMapped: boolean;
  showRaw: boolean;
}

/**
 * 字段映射：source 是日志自带列（time、server、actor、event、logId、retention）
 * 或业务字段路径 data.<字段>[.<子字段>…]，key 是结果列标识
 */
export interface FieldMapping {
  json?: JsonConfig;
  key: string;
  label: string;
  source: string;
  type: ValueType;
}

export interface TemplateValues {
  category: Category;
  event: string;
  fields: FieldMapping[];
  name: string;
}

export interface Template extends TemplateValues {
  id: number;
}

export function parseTemplate(record: QueryTemplateRecord): Template {
  let fields: FieldMapping[] = [];
  try {
    fields = JSON.parse(record.fields) as FieldMapping[];
  } catch {
    // 字段配置损坏时按无字段处理，编辑保存后恢复
  }
  return {
    category: record.category,
    event: record.event,
    fields,
    id: record.id,
    name: record.name,
  };
}

export const categories: { label: string; value: Category }[] = [
  { label: '数据查询', value: 'data' },
  { label: '日志查询', value: 'log' },
];

/** 日志自带列，其余字段写 data.<字段路径> */
export const columnSources: {
  label: string;
  type: ValueType;
  value: string;
}[] = [
  { label: '时间', type: 'time', value: 'time' },
  { label: '主体 ID', type: 'string', value: 'actor' },
  { label: '服务器', type: 'string', value: 'server' },
  { label: '事件名', type: 'string', value: 'event' },
  { label: '日志 ID', type: 'string', value: 'logId' },
  { label: '保留方式', type: 'string', value: 'retention' },
];

export const SOURCE_PATTERN =
  /^(?:time|server|actor|event|logId|retention|data(?:\.[\w$-]{1,64}){1,8})$/;

export const valueTypes: { label: string; value: ValueType }[] = [
  { label: '文本', value: 'string' },
  { label: '数字', value: 'number' },
  { label: '布尔值', value: 'boolean' },
  { label: '日期时间', value: 'time' },
  { label: 'JSON 对象', value: 'json' },
  { label: 'JSON 文本', value: 'jsonText' },
];

export function isJsonType(type?: ValueType) {
  return type === 'json' || type === 'jsonText';
}

export interface SampleNode {
  label: string;
  path: string;
  type: ValueType;
  value: unknown;
}

export interface SampleTree {
  nodes: NonNullable<TreeProps['treeData']>;
  values: Map<string, SampleNode>;
}

type TreeNode = NonNullable<TreeProps['treeData']>[number];

export function inspectSample(value: unknown): SampleTree {
  const values = new Map<string, SampleNode>();
  function visit(
    raw: unknown,
    path: string,
    label: string,
    depth: number,
  ): TreeNode {
    let value = raw;
    let jsonText = false;
    if (typeof value === 'string') {
      try {
        const decoded: unknown = JSON.parse(value);
        if (decoded !== null && typeof decoded === 'object') {
          value = decoded;
          jsonText = true;
        }
      } catch {
        // 普通文本作为叶子节点
      }
    }
    let type: ValueType = 'string';
    if (jsonText) type = 'jsonText';
    else if (value !== null && typeof value === 'object') type = 'json';
    else if (typeof value === 'number') type = 'number';
    else if (typeof value === 'boolean') type = 'boolean';
    values.set(path, { label, path, type, value });
    const children =
      depth < 16 && value !== null && typeof value === 'object'
        ? Object.entries(value).map(([key, child]) => {
            let childPath = `${path}[${JSON.stringify(key)}]`;
            if (Array.isArray(value)) childPath = `${path}[${key}]`;
            else if (/^[A-Z_$][\w$]*$/i.test(key)) childPath = `${path}.${key}`;
            return visit(child, childPath, key, depth + 1);
          })
        : undefined;
    return { children, key: path, title: label };
  }
  return { nodes: [visit(value, '$', '$', 0)], values };
}

export function displaySample(value: unknown, type: ValueType) {
  if (value === null || value === undefined) return '-';
  if (type === 'boolean') {
    if (value === true) return '是';
    if (value === false) return '否';
    return String(value);
  }
  if (
    type === 'time' &&
    (typeof value === 'string' || typeof value === 'number')
  ) {
    const time = dayjs(value);
    return time.isValid() ? time.format('YYYY-MM-DD HH:mm:ss') : String(value);
  }
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

/**
 * 为列表行生成稳定的渲染 key（对象本身不保存 id）
 */
export function useRowKey() {
  const keys = new WeakMap<object, number>();
  let seed = 0;
  return (item: object) => {
    const raw = toRaw(item);
    let key = keys.get(raw);
    if (key === undefined) {
      key = ++seed;
      keys.set(raw, key);
    }
    return key;
  };
}

/**
 * 按 inspectSample 生成的路径（$、$.key、$["key"]、$[0]）读取值，读不到返回 undefined
 */
export function readPath(value: unknown, path: string): unknown {
  if (!path.startsWith('$')) return undefined;
  const pattern = /\.([A-Z_$][\w$]*)|\[(\d+)\]|\[("(?:[^"\\]|\\.)*")\]/giy;
  pattern.lastIndex = 1;
  let current = value;
  while (pattern.lastIndex < path.length) {
    const match = pattern.exec(path);
    if (!match) return undefined;
    const key =
      match[1] ?? match[2] ?? (JSON.parse(match[3] as string) as string);
    if (current === null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

/** 日志行里某个字段映射的原始值 */
export function fieldValue(row: LogRow, field: FieldMapping): unknown {
  if (!field.source.startsWith('data.')) {
    return (row as unknown as Record<string, unknown>)[field.source];
  }
  let current: unknown = row.data;
  for (const segment of field.source.slice('data.'.length).split('.')) {
    if (current === null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

/**
 * 把日志行按模板字段展开成表格行：列 key 为字段 key，JSON 子字段为 key:路径
 */
export function flattenRow(row: LogRow, fields: FieldMapping[]) {
  const result: Record<string, string> = { _logId: row.logId };
  for (const field of fields) {
    const raw = fieldValue(row, field);
    result[field.key] = displaySample(raw, field.type);
    if (!isJsonType(field.type) || !field.json?.showMapped) continue;
    let parsed = raw;
    if (typeof raw === 'string') {
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = undefined;
      }
    }
    for (const mapping of field.json.mappings ?? []) {
      result[`${field.key}:${mapping.path}`] = displaySample(
        readPath(parsed, mapping.path),
        mapping.type,
      );
    }
  }
  return result;
}
