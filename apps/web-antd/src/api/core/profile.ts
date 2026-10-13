import type { Profile } from '#/api/types';

import { requestClient } from '#/api/request';

/** 当前登录账号的个人信息 */
export async function getProfileApi() {
  return requestClient.post<Profile>('/profile/get', {});
}

export async function updateProfileApi(data: {
  avatar: string;
  remark?: string;
  username: string;
}) {
  return requestClient.post<Profile>('/profile/update', {
    avatar: data.avatar,
    remark: (data.remark ?? '').trim(),
    username: data.username.trim(),
  });
}

/** 修改成功后其他会话失效，当前会话保留 */
export async function changePasswordApi(
  oldPassword: string,
  newPassword: string,
) {
  return requestClient.post<null>('/profile/password', {
    newPassword,
    oldPassword,
  });
}
