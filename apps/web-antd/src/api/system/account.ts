import type {
  AccountMembership,
  AccountRecord,
  ProjectManageItem,
  RoleRecord,
} from '#/api/types';

import { requestClient } from '#/api/request';

export async function getAccountListApi() {
  return requestClient.post<AccountRecord[]>('/account/list', {});
}

export async function createAccountApi(data: {
  account: string;
  password: string;
  remark?: string;
  username: string;
}) {
  return requestClient.post<{ account: string; id: number; username: string }>(
    '/account/create',
    {
      account: data.account.trim(),
      password: data.password,
      remark: (data.remark ?? '').trim(),
      username: data.username.trim(),
    },
  );
}

/** 提交 password 时重置密码，该账号已登录的会话会失效 */
export async function updateAccountApi(
  accountId: number,
  data: { password?: string; remark?: string; username: string },
) {
  return requestClient.post<null>('/account/update', {
    accountId,
    remark: (data.remark ?? '').trim(),
    username: data.username.trim(),
    ...(data.password ? { password: data.password } : {}),
  });
}

export async function updateAccountStatusApi(
  accountId: number,
  status: number,
) {
  return requestClient.post<null>('/account/status', { accountId, status });
}

/** 可分配给账号的平台角色 */
export async function getAccountRoleOptionsApi() {
  return requestClient.post<RoleRecord[]>('/account/role/options', {});
}

export async function updateAccountRolesApi(
  accountId: number,
  roleIds: number[],
) {
  return requestClient.post<null>('/account/role/update', {
    accountId,
    roleIds,
  });
}

export async function getAccountProjectsApi(accountId: number) {
  return requestClient.post<AccountMembership[]>('/account/project/list', {
    accountId,
  });
}

/** 关联项目时可选的项目：全部未关闭项目 */
export async function getAccountProjectOptionsApi() {
  return requestClient.post<ProjectManageItem[]>(
    '/account/project/options',
    {},
  );
}

/** 指定项目里可选的项目角色 */
export async function getAccountProjectRolesApi(projectId: number) {
  return requestClient.post<RoleRecord[]>('/account/project/roles', {
    projectId,
  });
}

export async function updateAccountProjectsApi(
  accountId: number,
  memberships: AccountMembership[],
) {
  return requestClient.post<null>('/account/project/update', {
    accountId,
    memberships,
  });
}
