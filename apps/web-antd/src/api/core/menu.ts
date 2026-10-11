import type { MenuRecord } from '#/api/types';

import { requestClient } from '#/api/request';

/**
 * 获取当前账号在当前项目下可访问的菜单（平铺结构）
 */
export async function getAccessMenusApi(projectId: null | number) {
  return requestClient.post<MenuRecord[]>('/access/menu', { projectId });
}
