import type {
  BusinessQuery,
  DataQueryResult,
  DataSourceRecord,
  DataSourceWrite,
  DataSourceZone,
  DataTemplateRecord,
  DataTemplateWrite,
} from '#/api/types';

import { requestClient } from '#/api/request';

function trimSource(data: DataSourceWrite) {
  return {
    name: data.name.trim(),
    remark: (data.remark ?? '').trim(),
    secret: data.secret ?? '',
    timeoutMs: data.timeoutMs,
    type: data.type,
    url: data.type === 'zone' ? '' : data.url.trim(),
  };
}

export async function getDataSourcesApi(projectId: number) {
  return requestClient.post<{ list: DataSourceRecord[] }>('/data/source/list', {
    projectId,
  });
}

export async function createDataSourceApi(
  projectId: number,
  data: DataSourceWrite,
) {
  return requestClient.post<DataSourceRecord>('/data/source/create', {
    ...trimSource(data),
    projectId,
  });
}

export async function updateDataSourceApi(
  projectId: number,
  sourceId: number,
  data: DataSourceWrite,
) {
  return requestClient.post<DataSourceRecord>('/data/source/update', {
    ...trimSource(data),
    projectId,
    sourceId,
  });
}

export async function removeDataSourceApi(projectId: number, sourceId: number) {
  return requestClient.post<null>('/data/source/remove', {
    projectId,
    sourceId,
  });
}

/**
 * 用表单里的值测试连接；sourceId 有值且密钥留空时用已保存的密钥。
 * zone 类型调用第一个可用的区，zones 为发现的区（http 类型为空列表）
 */
export async function testDataSourceApi(
  projectId: number,
  data: {
    secret?: string;
    sourceId?: number;
    timeoutMs: number;
    type: DataSourceWrite['type'];
    url: string;
  },
) {
  return requestClient.post<{ queryCount: number; zones: DataSourceZone[] }>(
    '/data/source/test',
    {
      projectId,
      secret: data.secret ?? '',
      sourceId: data.sourceId,
      timeoutMs: data.timeoutMs,
      type: data.type,
      url: data.type === 'zone' ? '' : data.url.trim(),
    },
  );
}

/** zone 类型数据源当前可查询的区，按区 ID 排序；http 类型返回空列表 */
export async function getSourceZonesApi(projectId: number, sourceId: number) {
  return requestClient.post<{ list: DataSourceZone[] }>('/data/source/zones', {
    projectId,
    sourceId,
  });
}

/** 数据源提供的查询清单 */
export async function getSourceQueriesApi(projectId: number, sourceId: number) {
  return requestClient.post<{ queries: BusinessQuery[] }>(
    '/data/source/queries',
    { projectId, sourceId },
  );
}

export async function getDataTemplatesApi(projectId: number) {
  return requestClient.post<{ list: DataTemplateRecord[] }>(
    '/data/template/list',
    { projectId },
  );
}

export async function createDataTemplateApi(
  projectId: number,
  data: DataTemplateWrite,
) {
  return requestClient.post<DataTemplateRecord>('/data/template/create', {
    ...data,
    projectId,
  });
}

export async function updateDataTemplateApi(
  projectId: number,
  templateId: number,
  data: DataTemplateWrite,
) {
  return requestClient.post<DataTemplateRecord>('/data/template/update', {
    ...data,
    projectId,
    templateId,
  });
}

export async function removeDataTemplateApi(
  projectId: number,
  templateId: number,
) {
  return requestClient.post<null>('/data/template/remove', {
    projectId,
    templateId,
  });
}

/** params 是参数值对象，按模板的参数定义提交；zoneIds 只对 zone 类型数据源生效 */
export async function queryDataApi(
  projectId: number,
  templateId: number,
  params: Record<string, unknown>,
  page: number,
  pageSize: number,
  zoneIds: number[] = [],
) {
  return requestClient.post<DataQueryResult>(
    '/data/query',
    {
      page,
      pageSize,
      params: JSON.stringify(params),
      projectId,
      templateId,
      zoneIds,
    },
    { timeout: 70_000 },
  );
}

/** 导出，最多 5 万行 */
export async function exportDataApi(
  projectId: number,
  templateId: number,
  params: Record<string, unknown>,
  zoneIds: number[] = [],
) {
  return requestClient.post<DataQueryResult>(
    '/data/query/export',
    { params: JSON.stringify(params), projectId, templateId, zoneIds },
    { timeout: 300_000 },
  );
}
