import type {
  EventFields,
  EventSummary,
  LogEventDict,
  LogQueryParams,
  LogQueryResult,
  LogSourceRecord,
  LogSourceWrite,
} from '#/api/types';

import { requestClient } from '#/api/request';

function trimSource(data: LogSourceWrite) {
  return {
    database: data.database.trim(),
    readPassword: data.readPassword ?? '',
    readUser: data.readUser.trim(),
    url: data.url.trim(),
  };
}

/** 本项目的日志源，未配置时 source 为 null */
export async function getLogSourceApi(projectId: number) {
  return requestClient.post<{ source: LogSourceRecord | null }>(
    '/log/source/get',
    { projectId },
  );
}

/** 新增或覆盖；首次保存密码必填，之后留空沿用 */
export async function saveLogSourceApi(
  projectId: number,
  data: LogSourceWrite,
) {
  return requestClient.post<LogSourceRecord>('/log/source/save', {
    ...trimSource(data),
    projectId,
  });
}

/** 用表单里的值测试，不保存；密码留空时用已保存的密码 */
export async function testLogSourceApi(
  projectId: number,
  data: LogSourceWrite,
) {
  return requestClient.post<{ version: string }>('/log/source/test', {
    ...trimSource(data),
    projectId,
  });
}

/** 事件字典 */
export async function getEventDictApi(projectId: number) {
  return requestClient.post<{ list: LogEventDict[] }>('/log/event/dict/list', {
    projectId,
  });
}

export async function saveEventDictApi(projectId: number, data: LogEventDict) {
  return requestClient.post<LogEventDict>('/log/event/dict/save', {
    description: data.description,
    event: data.event,
    fields: data.fields,
    label: data.label,
    projectId,
  });
}

export async function removeEventDictApi(projectId: number, event: string) {
  return requestClient.post<null>('/log/event/dict/remove', {
    event,
    projectId,
  });
}

/** 日志查询 */
export async function queryLogsApi(projectId: number, params: LogQueryParams) {
  return requestClient.post<LogQueryResult>('/log/query', {
    ...params,
    projectId,
  });
}

/** 导出日志，最多 5 万行 */
export async function exportLogsApi(
  projectId: number,
  params: Omit<LogQueryParams, 'page' | 'pageSize'>,
) {
  return requestClient.post<LogQueryResult>(
    '/log/export',
    { ...params, projectId },
    { timeout: 120_000 },
  );
}

/** 最近 days 天有数据的事件 */
export async function getEventsApi(projectId: number, days = 7) {
  return requestClient.post<{ list: EventSummary[] }>('/log/event/list', {
    days,
    projectId,
  });
}

/** 事件的字段路径、类型和样例 */
export async function getEventFieldsApi(
  projectId: number,
  event: string,
  days = 7,
) {
  return requestClient.post<EventFields>('/log/event/fields', {
    days,
    event,
    projectId,
  });
}
