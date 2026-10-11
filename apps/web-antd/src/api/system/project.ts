import type { ProjectCreateResult, ProjectListResult } from '#/api/types';

import { requestClient } from '#/api/request';

export async function getProjectListApi() {
  return requestClient.post<ProjectListResult>('/project/list', {});
}

export async function createProjectApi(data: { appKey: string; name: string }) {
  return requestClient.post<ProjectCreateResult>('/project/create', {
    appKey: data.appKey.trim(),
    name: data.name.trim(),
  });
}

export async function updateProjectApi(
  projectId: number,
  data: { appKey: string; name: string },
) {
  return requestClient.post<null>('/project/update', {
    projectId,
    appKey: data.appKey.trim(),
    name: data.name.trim(),
  });
}

export async function closeProjectApi(projectId: number) {
  return requestClient.post<null>('/project/close', { projectId });
}

export async function switchProjectApi(projectId: number) {
  return requestClient.post<{ currentProjectId: number }>('/project/switch', {
    projectId,
  });
}
