import type { TreeProps } from 'ant-design-vue';

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

export interface FieldMapping {
  json?: JsonConfig;
  key: string;
  label: string;
  source: string;
  sourceType: string;
  type: ValueType;
}

export interface TemplateValues {
  category: Category;
  fields: FieldMapping[];
  name: string;
  url: string;
}

export interface Template extends TemplateValues {
  id: number;
  projectId: number;
}

export const categories: { label: string; value: Category }[] = [
  { label: '数据查询', value: 'data' },
  { label: '日志查询', value: 'log' },
];

export const sourceTypes = [
  'txt',
  'varchar',
  'int',
  'bigint',
  'decimal',
  'boolean',
  'datetime',
].map((value) => ({ label: value, value }));

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
