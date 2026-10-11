import type { MenuRecord, MenuWrite } from '#/api/types';

import { requestClient } from '#/api/request';

export async function getMenuListApi() {
  const data = await requestClient.post<{ list: MenuRecord[] }>(
    '/menu/list',
    {},
  );
  return data?.list ?? [];
}

export async function createMenuApi(data: MenuWrite & { menuId: number }) {
  return requestClient.post<MenuRecord>('/menu/create', data);
}

export async function updateMenuApi(menuId: number, data: MenuWrite) {
  return requestClient.post<MenuRecord>('/menu/update', { menuId, ...data });
}

export async function removeMenuApi(menuId: number) {
  return requestClient.post<null>('/menu/remove', { menuId });
}
