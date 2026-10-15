import type { TreeProps } from 'ant-design-vue';
import type { Dayjs } from 'dayjs';

import { toRaw } from 'vue';

import dayjs from 'dayjs';

/** 结果字段映射的公共类型和工具：日志模板和数据查询模板共用 */

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
 * 字段映射：source 是取值来源（日志模板为日志自带列或 data.<路径>，数据查询模板为结果行里的字段路径），
 * key 是结果列标识，json 是 JSON 字段的子字段展示配置
 */
export interface FieldMapping {
  json?: JsonConfig;
  key: string;
  label: string;
  source: string;
  type: ValueType;
}

/** 取值来源的候选：选中时带出类型和列标题；types 限定可选的类型（例如日志的时间列只能是日期时间） */
export interface SourceOption {
  label: string;
  title?: string;
  type?: ValueType;
  types?: ValueType[];
  value: string;
}

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

/** 按「a.b.c」路径读取对象里的值 */
export function readDotPath(value: unknown, path: string): unknown {
  let current = value;
  for (const segment of path.split('.')) {
    if (current === null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

/** 导出 CSV：带 BOM，Excel 打开不乱码 */
export function downloadCsv(
  fileName: string,
  columns: { title: string; value: (row: any) => unknown }[],
  rows: any[],
) {
  const escape = (value: unknown) => {
    const text =
      value === null || value === undefined
        ? ''
        : typeof value === 'object'
          ? JSON.stringify(value)
          : String(value);
    return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  const lines = [
    columns.map((column) => escape(column.title)).join(','),
    ...rows.map((row) =>
      columns.map((column) => escape(column.value(row))).join(','),
    ),
  ];
  const blob = new Blob([`\uFEFF${lines.join('\r\n')}`], {
    type: 'text/csv;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

/** 时间范围快捷选项；用 getter 让快捷选项在点击时才取当前时间 */
export function timePresets() {
  const preset = (label: string, start: () => Dayjs) => ({
    label,
    get value() {
      return [start(), dayjs()];
    },
  });
  return [
    preset('最近 1 小时', () => dayjs().subtract(1, 'hour')),
    preset('今天', () => dayjs().startOf('day')),
    preset('最近 24 小时', () => dayjs().subtract(1, 'day')),
    preset('最近 7 天', () => dayjs().subtract(7, 'day')),
    preset('最近 30 天', () => dayjs().subtract(30, 'day')),
  ];
}

/** 结果表的列：JSON 字段按配置展示原始值和映射出来的子字段（列 key 为「字段 key:路径」） */
export function mappedColumns(fields: FieldMapping[]) {
  return fields.flatMap((field) => {
    const raw = { field: field.key, minWidth: 160, title: field.label };
    if (!isJsonType(field.type)) return [raw];
    const rawColumns = !field.json || field.json.showRaw ? [raw] : [];
    const mapped = field.json?.showMapped
      ? (field.json.mappings ?? []).map((mapping) => ({
          field: `${field.key}:${mapping.path}`,
          minWidth: 160,
          title: mapping.label,
        }))
      : [];
    return [...rawColumns, ...mapped];
  });
}

/** 按字段映射把一行数据展开成表格行；valueOf 取字段的原始值 */
export function flattenFields(
  fields: FieldMapping[],
  valueOf: (field: FieldMapping) => unknown,
) {
  const result: Record<string, string> = {};
  for (const field of fields) {
    const raw = valueOf(field);
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
