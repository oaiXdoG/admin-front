import type {
  DataQueryParams,
  DataQueryResult,
  QueryTemplateRecord,
  QueryTemplateWrite,
} from '#/api/types';

import { requestClient } from '#/api/request';

/** category 为空时是模板管理页面；database 是当前连接的日志库名 */
export async function getQueryTemplatesApi(
  projectId: number,
  category?: 'data' | 'log',
) {
  return requestClient.post<{ database: string; list: QueryTemplateRecord[] }>(
    '/data/template/list',
    { category: category ?? '', projectId },
  );
}

export async function createQueryTemplateApi(
  projectId: number,
  data: QueryTemplateWrite,
) {
  return requestClient.post<QueryTemplateRecord>('/data/template/create', {
    ...data,
    projectId,
  });
}

export async function updateQueryTemplateApi(
  projectId: number,
  templateId: number,
  data: QueryTemplateWrite,
) {
  return requestClient.post<QueryTemplateRecord>('/data/template/update', {
    ...data,
    projectId,
    templateId,
  });
}

export async function removeQueryTemplateApi(
  projectId: number,
  templateId: number,
) {
  return requestClient.post<null>('/data/template/remove', {
    projectId,
    templateId,
  });
}

export async function queryDataApi(projectId: number, params: DataQueryParams) {
  return requestClient.post<DataQueryResult>('/data/query', {
    ...params,
    projectId,
  });
}
