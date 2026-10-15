import type {
  JvmTemplateRecord,
  MetricPoint,
  ProcessRecord,
  ProcessWrite,
  ServerRecord,
  ServerTaskRecord,
  ServerWrite,
} from '#/api/types';

import { requestClient } from '#/api/request';

export async function getServersApi(projectId: number) {
  return requestClient.post<{ list: ServerRecord[] }>('/server/host/list', {
    projectId,
  });
}

/** 返回服务器和一次性安装命令（10 分钟内有效） */
export async function createServerApi(projectId: number, data: ServerWrite) {
  return requestClient.post<{ installCommand: string; server: ServerRecord }>(
    '/server/host/create',
    { ...data, projectId },
  );
}

export async function updateServerApi(
  projectId: number,
  serverId: number,
  data: ServerWrite,
) {
  return requestClient.post<ServerRecord>('/server/host/update', {
    ...data,
    projectId,
    serverId,
  });
}

export async function removeServerApi(projectId: number, serverId: number) {
  return requestClient.post<null>('/server/host/remove', {
    projectId,
    serverId,
  });
}

/** 生成新的安装命令；已接入的服务器重新安装后更换密钥 */
export async function getInstallCommandApi(projectId: number, serverId: number) {
  return requestClient.post<{ installCommand: string }>(
    '/server/host/install',
    { projectId, serverId },
  );
}

export async function getProcessesApi(projectId: number) {
  return requestClient.post<{ list: ProcessRecord[] }>('/server/process/list', {
    projectId,
  });
}

export async function createProcessApi(
  projectId: number,
  serverId: number,
  name: string,
  data: ProcessWrite,
) {
  return requestClient.post<ProcessRecord>('/server/process/create', {
    ...data,
    name,
    projectId,
    serverId,
  });
}

export async function updateProcessApi(
  projectId: number,
  processId: number,
  data: ProcessWrite,
) {
  return requestClient.post<ProcessRecord>('/server/process/update', {
    ...data,
    processId,
    projectId,
  });
}

export async function removeProcessApi(projectId: number, processId: number) {
  return requestClient.post<null>('/server/process/remove', {
    processId,
    projectId,
  });
}

export async function operateProcessesApi(
  projectId: number,
  processIds: number[],
  action: 'restart' | 'start' | 'stop',
) {
  return requestClient.post<{ taskIds: number[] }>('/server/process/operate', {
    action,
    processIds,
    projectId,
  });
}

/** 监控曲线：processId 为 null 查主机；step 为聚合粒度（秒），每个点是该时间段的平均值 */
export async function getServerMetricsApi(
  projectId: number,
  serverId: number,
  processId: null | number,
  startTime: number,
  endTime: number,
  step: number,
) {
  return requestClient.post<{ list: MetricPoint[] }>('/server/metric/query', {
    endTime,
    processId,
    projectId,
    serverId,
    startTime,
    step,
  });
}

export async function getServerTasksApi(
  projectId: number,
  processId: null | number,
  page: number,
  pageSize: number,
) {
  return requestClient.post<{ list: ServerTaskRecord[]; total: number }>(
    '/server/task/list',
    { page, pageSize, processId, projectId },
  );
}

export async function getJvmTemplatesApi(projectId: number) {
  return requestClient.post<{ list: JvmTemplateRecord[] }>(
    '/server/template/list',
    { projectId },
  );
}

export async function saveJvmTemplateApi(
  projectId: number,
  templateId: null | number,
  name: string,
  options: string,
) {
  return requestClient.post<JvmTemplateRecord>('/server/template/save', {
    name,
    options,
    projectId,
    templateId,
  });
}

export async function removeJvmTemplateApi(projectId: number, templateId: number) {
  return requestClient.post<null>('/server/template/remove', {
    projectId,
    templateId,
  });
}
