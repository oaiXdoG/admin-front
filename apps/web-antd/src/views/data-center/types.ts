import type {
  DataParam,
  DataSourceType,
  DataTemplateRecord,
} from '#/api/types';
import type { FieldMapping, ValueType } from '#/components/field-mapping/types';

/** 数据查询模板（前端编辑用）：params、fields 已解析 */
export interface DataTemplate {
  id: number;
  sourceId: number;
  sourceName?: string;
  /** 数据源类型，模板列表没返回时为 undefined */
  sourceType?: DataSourceType;
  name: string;
  query: string;
  params: DataParam[];
  fields: FieldMapping[];
}

/** 结果行里的字段路径：点号分隔，每段字母、数字、_$-，最多 8 段 */
export const DATA_PATH_PATTERN = /^[\w$-]{1,64}(?:\.[\w$-]{1,64}){0,7}$/;

export function parseDataTemplate(record: DataTemplateRecord): DataTemplate {
  const parse = <T>(text: string): T[] => {
    try {
      return JSON.parse(text) as T[];
    } catch {
      return [];
    }
  };
  return {
    fields: parse<FieldMapping>(record.fields),
    id: record.id,
    name: record.name,
    params: parse<DataParam>(record.params),
    query: record.query,
    sourceId: record.sourceId,
    sourceName: record.sourceName,
    sourceType: record.sourceType,
  };
}

/** 业务服务器在查询清单里声明的字段类型，转为展示类型 */
export function toValueType(type?: string): ValueType {
  const types: ValueType[] = [
    'boolean',
    'json',
    'jsonText',
    'number',
    'string',
    'time',
  ];
  return types.includes(type as ValueType) ? (type as ValueType) : 'string';
}
