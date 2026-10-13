import type { Recordable, UserInfo } from '@vben/types';

import type { Profile } from '#/api/types';

import { ref } from 'vue';
import { useRouter } from 'vue-router';

import { LOGIN_PATH } from '@vben/constants';
import { preferences } from '@vben/preferences';
import { resetAllStores, useAccessStore, useUserStore } from '@vben/stores';

import { defineStore } from 'pinia';

import { getProfileApi, loginApi, logoutApi } from '#/api';

function toUserInfo(profile: Profile, token: string): UserInfo {
  return {
    avatar: profile.avatar,
    desc: profile.account,
    homePath: '',
    realName: profile.username,
    roles: [],
    token,
    userId: String(profile.id),
    username: profile.account,
  };
}

export const useAuthStore = defineStore('auth', () => {
  const accessStore = useAccessStore();
  const userStore = useUserStore();
  const router = useRouter();

  const loginLoading = ref(false);

  /**
   * 登录：保存 token 和账号信息，然后进入首页（路由守卫会加载项目和菜单）
   */
  async function authLogin(params: Recordable<any>) {
    try {
      loginLoading.value = true;
      const session = await loginApi({
        account: params.username,
        password: params.password,
      });
      if (!session?.token) return;

      accessStore.setAccessToken(session.token);
      await fetchUserInfo();

      const redirect = router.currentRoute.value.query?.redirect as
        | string
        | undefined;
      await router.push(
        redirect
          ? decodeURIComponent(redirect)
          : preferences.app.defaultHomePath,
      );
    } catch {
      // 错误信息已经由请求拦截器提示
    } finally {
      loginLoading.value = false;
    }
  }

  async function logout(redirect: boolean = true) {
    // 先删除服务器会话；令牌已失效时接口同样成功，网络失败也不影响本地退出
    if (accessStore.accessToken) {
      await logoutApi().catch(() => undefined);
    }
    resetAllStores();
    const { resetRoutes } = await import('#/router');
    resetRoutes();
    accessStore.setLoginExpired(false);

    const currentRoute = router.currentRoute.value;
    const alreadyOnLogin = currentRoute.path === LOGIN_PATH;
    await router.replace({
      path: LOGIN_PATH,
      query:
        redirect && !alreadyOnLogin
          ? { redirect: encodeURIComponent(currentRoute.fullPath) }
          : {},
    });
  }

  /**
   * 从服务器读取当前账号的个人信息；令牌失效时请求拦截器会退出登录
   */
  async function fetchUserInfo() {
    const userInfo = toUserInfo(
      await getProfileApi(),
      accessStore.accessToken ?? '',
    );
    userStore.setUserInfo(userInfo);
    return userInfo;
  }

  /** 个人设置保存后同步头像和昵称 */
  function applyProfile(profile: Profile) {
    userStore.setUserInfo(toUserInfo(profile, accessStore.accessToken ?? ''));
  }

  function $reset() {
    loginLoading.value = false;
  }

  return {
    $reset,
    applyProfile,
    authLogin,
    fetchUserInfo,
    loginLoading,
    logout,
  };
});
