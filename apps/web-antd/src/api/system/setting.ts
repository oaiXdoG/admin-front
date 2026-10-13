import type { SystemSetting } from '#/api/types';

import { requestClient } from '#/api/request';

/** 不需要登录，登录页也会读取 */
export async function getSystemSettingApi() {
  return requestClient.post<SystemSetting>('/system/setting/get', {});
}

export async function updateSystemSettingApi(data: SystemSetting) {
  return requestClient.post<SystemSetting>('/system/setting/update', {
    ...data,
    appName: data.appName.trim(),
    copyright: data.copyright.trim(),
    loginDescription: data.loginDescription.trim(),
    loginTitle: data.loginTitle.trim(),
  });
}
