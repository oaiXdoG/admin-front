import type { MenuRecord, MenuWrite } from '#/api/types';

import { requestClient } from '#/api/request';

export async function getMenuListApi() {
  const data = await requestClient.post<{ list: MenuRecord[] }>(
    '/menu/list',
    {},
  );
  return data?.list ?? [];
}

/** 菜单 ID 由服务器按顶级目录分段生成 */
export async function createMenuApi(data: MenuWrite) {
  return requestClient.post<MenuRecord>('/menu/create', data);
}

export async function updateMenuApi(menuId: number, data: MenuWrite) {
  return requestClient.post<MenuRecord>('/menu/update', { menuId, ...data });
}

export async function removeMenuApi(menuId: number) {
  return requestClient.post<null>('/menu/remove', { menuId });
}
