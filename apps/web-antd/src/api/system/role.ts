import type { RoleMenuResult, RoleRecord, RoleWrite } from '#/api/types';

import { requestClient } from '#/api/request';

function trimRole(data: RoleWrite): RoleWrite {
  return {
    ...data,
    code: data.code.trim(),
    description: (data.description ?? '').trim(),
    name: data.name.trim(),
  };
}

export async function getRoleListApi() {
  return requestClient.post<RoleRecord[]>('/role/list', {});
}

export async function createRoleApi(data: RoleWrite) {
  return requestClient.post<RoleRecord>('/role/create', trimRole(data));
}

export async function updateRoleApi(roleId: number, data: RoleWrite) {
  return requestClient.post<RoleRecord>('/role/update', {
    roleId,
    ...trimRole(data),
  });
}

export async function removeRoleApi(roleId: number) {
  return requestClient.post<null>('/role/remove', { roleId });
}

export async function getRoleMenusApi(roleId: number) {
  return requestClient.post<RoleMenuResult>('/role/menu/list', { roleId });
}

export async function updateRoleMenusApi(roleId: number, menuIds: number[]) {
  return requestClient.post<null>('/role/menu/update', { roleId, menuIds });
}
