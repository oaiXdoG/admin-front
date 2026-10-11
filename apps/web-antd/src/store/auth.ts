import type { Recordable, UserInfo } from '@vben/types';

import type { LoginResult } from '#/api/types';

import { ref } from 'vue';
import { useRouter } from 'vue-router';

import { LOGIN_PATH } from '@vben/constants';
import { preferences } from '@vben/preferences';
import { resetAllStores, useAccessStore, useUserStore } from '@vben/stores';

import { defineStore } from 'pinia';

import { loginApi } from '#/api';

/** 后端没有用户信息接口，登录返回的账号信息保存在这里，刷新页面后从这里恢复 */
const SESSION_KEY = 'admin-front-session';

function toUserInfo(session: LoginResult): UserInfo {
  return {
    avatar: '',
    desc: session.account,
    homePath: '',
    realName: session.username,
    roles: [],
    token: session.token,
    userId: String(session.id),
    username: session.account,
  };
}

function readSession(): LoginResult | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null');
    return parsed?.token ? (parsed as LoginResult) : null;
  } catch {
    return null;
  }
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

      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      accessStore.setAccessToken(session.token);
      userStore.setUserInfo(toUserInfo(session));

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
    localStorage.removeItem(SESSION_KEY);
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
   * 从本地恢复登录时保存的账号信息；本地没有记录说明登录态不完整，重新登录
   */
  async function fetchUserInfo() {
    const session = readSession();
    if (!session || session.token !== accessStore.accessToken) {
      await logout();
      throw new Error('登录信息已失效，请重新登录');
    }
    const userInfo = toUserInfo(session);
    userStore.setUserInfo(userInfo);
    return userInfo;
  }

  function $reset() {
    loginLoading.value = false;
  }

  return {
    $reset,
    authLogin,
    fetchUserInfo,
    loginLoading,
    logout,
  };
});
