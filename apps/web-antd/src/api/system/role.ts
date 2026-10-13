import type { RoleMenuResult, RoleRecord, RoleWrite } from '#/api/types';

import { requestClient } from '#/api/request';

/**
 * 三类角色接口相同，只是路径不同：平台角色、角色模板、当前项目的项目角色。
 * 项目角色的请求都带上当前项目 ID，服务器会校验它与会话当前项目一致。
 */
export type RoleKind = 'platform' | 'project' | 'template';

const PREFIX: Record<RoleKind, string> = {
  platform: '/role',
  project: '/project/role',
  template: '/role-template',
};

function trimRole(data: RoleWrite): RoleWrite {
  return {
    ...data,
    code: data.code.trim(),
    description: (data.description ?? '').trim(),
    name: data.name.trim(),
  };
}

export function useRoleApi(kind: RoleKind, getProjectId?: () => null | number) {
  const prefix = PREFIX[kind];
  const scoped = (body: Record<string, unknown>) =>
    kind === 'project' ? { ...body, projectId: getProjectId?.() } : body;

  return {
    list: () => requestClient.post<RoleRecord[]>(`${prefix}/list`, scoped({})),
    create: (data: RoleWrite) =>
      requestClient.post<RoleRecord>(
        `${prefix}/create`,
        scoped({ ...trimRole(data) }),
      ),
    update: (roleId: number, data: RoleWrite) =>
      requestClient.post<RoleRecord>(
        `${prefix}/update`,
        scoped({ roleId, ...trimRole(data) }),
      ),
    remove: (roleId: number) =>
      requestClient.post<null>(`${prefix}/remove`, scoped({ roleId })),
    menus: (roleId: number) =>
      requestClient.post<RoleMenuResult>(
        `${prefix}/menu/list`,
        scoped({ roleId }),
      ),
    updateMenus: (roleId: number, menuIds: number[]) =>
      requestClient.post<null>(
        `${prefix}/menu/update`,
        scoped({ menuIds, roleId }),
      ),
  };
}

/** 从模板导入可选的模板（需要当前项目的角色管理权限） */
export async function getImportTemplateOptionsApi(projectId: number) {
  return requestClient.post<RoleRecord[]>('/project/role/templates', {
    projectId,
  });
}

/** 把模板复制为当前项目的角色，返回导入数量 */
export async function importProjectRolesApi(
  projectId: number,
  templateIds: number[],
) {
  return requestClient.post<number>('/project/role/import', {
    projectId,
    templateIds,
  });
}
