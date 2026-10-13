import type { ProjectMember, RoleRecord } from '#/api/types';

import { requestClient } from '#/api/request';

export async function getProjectMembersApi(projectId: number) {
  return requestClient.post<ProjectMember[]>('/project/member/list', {
    projectId,
  });
}

/** 成员管理里可选的本项目角色 */
export async function getMemberRoleOptionsApi(projectId: number) {
  return requestClient.post<RoleRecord[]>('/project/member/roles', {
    projectId,
  });
}

export async function addProjectMemberApi(
  projectId: number,
  account: string,
  roleId: number,
) {
  return requestClient.post<null>('/project/member/add', {
    account: account.trim(),
    projectId,
    roleId,
  });
}

export async function updateProjectMemberApi(
  projectId: number,
  accountId: number,
  roleId: number,
) {
  return requestClient.post<null>('/project/member/update', {
    accountId,
    projectId,
    roleId,
  });
}

export async function removeProjectMemberApi(
  projectId: number,
  accountId: number,
) {
  return requestClient.post<null>('/project/member/remove', {
    accountId,
    projectId,
  });
}
