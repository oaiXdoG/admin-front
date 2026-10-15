import type { Dayjs } from 'dayjs';

import type { LogQueryCondition, LogRow } from '#/api/types';
import type { FieldMapping, ValueType } from '#/components/field-mapping/types';

import { flattenFields } from '#/components/field-mapping/types';

export * from '#/components/field-mapping/types';

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
  return {
    ...flattenFields(fields, (field) => fieldValue(row, field)),
    _logId: row.logId,
  };
}

/**
 * 按 ClickHouse 类型推荐展示类型：数组、对象为 JSON；有文本时按文本（样例像日期则为日期时间）；
 * 布尔为布尔值；整数、小数为数字；日期类型为日期时间
 */
export function suggestType(types: string[], sample: unknown): ValueType {
  if (types.some((type) => /Array|Tuple|Map|JSON|Object/.test(type))) {
    return 'json';
  }
  if (types.some((type) => /String/.test(type))) {
    return typeof sample === 'string' &&
      /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(sample)
      ? 'time'
      : 'string';
  }
  if (types.length > 0 && types.every((type) => /Bool/.test(type))) {
    return 'boolean';
  }
  if (types.some((type) => /Date/.test(type))) return 'time';
  return 'number';
}

/** 事件字典里的字段说明 */
export interface EventField {
  label: string;
  path: string;
  type: ValueType;
}

/** 解析事件字典的 fields（JSON 文本） */
export function parseEventFields(fields?: string): EventField[] {
  try {
    return fields ? (JSON.parse(fields) as EventField[]) : [];
  } catch {
    return [];
  }
}

/** 字段条件的编辑状态：值按字段类型放在不同属性里 */
export interface ConditionDraft {
  id: number;
  max?: number;
  min?: number;
  number?: number;
  operator: string;
  path?: string;
  range?: [Dayjs, Dayjs];
  text?: string;
  time?: Dayjs;
}

/** 转成接口的条件（path 加 data. 前缀）；值不完整时返回 null */
export function toCondition(
  draft: ConditionDraft,
  fields: EventField[],
): LogQueryCondition | null {
  const field = fields.find((item) => item.path === draft.path);
  if (!field) return null;
  const base = {
    operator: draft.operator,
    path: `data.${field.path}`,
    type: field.type,
  };
  const between = draft.operator === 'between';
  const empty = (value: unknown) => value === undefined || value === null;
  if (field.type === 'time') {
    if (between) {
      return draft.range
        ? {
            ...base,
            value: String(draft.range[0].valueOf()),
            value2: String(draft.range[1].valueOf()),
          }
        : null;
    }
    return draft.time ? { ...base, value: String(draft.time.valueOf()) } : null;
  }
  if (field.type === 'number') {
    if (between) {
      return empty(draft.min) || empty(draft.max)
        ? null
        : { ...base, value: String(draft.min), value2: String(draft.max) };
    }
    return empty(draft.number)
      ? null
      : { ...base, value: String(draft.number) };
  }
  return draft.text === undefined || draft.text === ''
    ? null
    : { ...base, value: draft.text };
}
