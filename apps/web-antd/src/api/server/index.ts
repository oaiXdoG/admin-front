import type {
  JvmTemplateRecord,
  MetricPoint,
  ProcessFileResult,
  ProcessRecord,
  ProcessTypeRecord,
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

/** 部署包分块上传：第一块 uploadId 为 null，之后带上返回的 uploadId；data 为该块的 base64 */
export async function uploadDeployChunkApi(
  projectId: number,
  processId: number,
  uploadId: null | string,
  index: number,
  total: number,
  data: string,
  onProgress?: (ratio: number) => void,
) {
  return requestClient.post<{ uploadId: string }>(
    '/server/process/deploy/upload',
    { data, index, processId, projectId, total, uploadId },
    {
      onUploadProgress: (event) => onProgress?.(event.total ? event.loaded / event.total : 0),
      // 每块约 8MB，上行慢时 30 秒的默认超时不够
      timeout: 300_000,
    },
  );
}

/** 所有块上传完成后生成部署指令（解压覆盖到工作目录后重启进程） */
export async function deployProcessApi(
  projectId: number,
  processId: number,
  uploadId: string,
  fileName: string,
  remark: string,
) {
  return requestClient.post<{ taskId: number }>('/server/process/deploy', {
    fileName,
    processId,
    projectId,
    remark,
    uploadId,
  });
}

/** 发起文件操作，由 Agent 下一次心跳领取执行；path 相对工作目录，空为工作目录本身 */
export async function requestProcessFileApi(
  projectId: number,
  processId: number,
  op: 'delete' | 'list' | 'read' | 'write',
  path: string,
  content?: string,
) {
  return requestClient.post<{ opId: number | string }>('/server/process/file/request', {
    content,
    op,
    path,
    processId,
    projectId,
  });
}

export async function getProcessFileResultApi<T = unknown>(
  projectId: number,
  opId: number | string,
) {
  return requestClient.post<ProcessFileResult<T>>('/server/process/file/result', {
    opId,
    projectId,
  });
}

export async function getProcessTypesApi(projectId: number) {
  return requestClient.post<{ list: ProcessTypeRecord[] }>(
    '/server/process-type/list',
    { projectId },
  );
}

/** typeId 为 null 表示新建 */
export async function saveProcessTypeApi(
  projectId: number,
  typeId: null | number,
  name: string,
) {
  return requestClient.post<ProcessTypeRecord>('/server/process-type/save', {
    name,
    projectId,
    typeId,
  });
}

export async function removeProcessTypeApi(projectId: number, typeId: number) {
  return requestClient.post<null>('/server/process-type/remove', {
    projectId,
    typeId,
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
