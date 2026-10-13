import type {
  ProjectCreateResult,
  ProjectListResult,
  ProjectManageItem,
  ProjectWrite,
  RoleRecord,
} from '#/api/types';

import { requestClient } from '#/api/request';

function trimProject(data: ProjectWrite) {
  return {
    appKey: data.appKey.trim(),
    description: (data.description ?? '').trim(),
    name: data.name.trim(),
  };
}

/** 项目切换器：当前账号可进入的未关闭项目 */
export async function getProjectListApi() {
  return requestClient.post<ProjectListResult>('/project/list', {});
}

/** 项目管理：全部项目，包含已关闭项目和成员数 */
export async function getProjectManageListApi() {
  return requestClient.post<ProjectManageItem[]>('/project/manage/list', {});
}

/** 新建项目时可勾选的角色模板 */
export async function getProjectTemplateOptionsApi() {
  return requestClient.post<RoleRecord[]>('/project/templates', {});
}

export async function createProjectApi(
  data: ProjectWrite & { templateIds?: number[] },
) {
  return requestClient.post<ProjectCreateResult>('/project/create', {
    ...trimProject(data),
    templateIds: data.templateIds ?? [],
  });
}

export async function updateProjectApi(projectId: number, data: ProjectWrite) {
  return requestClient.post<null>('/project/update', {
    projectId,
    ...trimProject(data),
  });
}

export async function closeProjectApi(projectId: number) {
  return requestClient.post<null>('/project/close', { projectId });
}

export async function reopenProjectApi(projectId: number) {
  return requestClient.post<null>('/project/reopen', { projectId });
}

export async function switchProjectApi(projectId: number) {
  return requestClient.post<{ currentProjectId: number }>('/project/switch', {
    projectId,
  });
}
