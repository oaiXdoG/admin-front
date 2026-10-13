import type { LoginResult } from '#/api/types';

import { requestClient } from '#/api/request';

/**
 * 登录
 */
export async function loginApi(data: { account: string; password: string }) {
  return requestClient.post<LoginResult>('/login', {
    account: data.account.trim(),
    password: data.password,
  });
}

/**
 * 退出登录：删除服务器上的当前会话
 */
export async function logoutApi() {
  return requestClient.post<null>('/logout', {});
}
