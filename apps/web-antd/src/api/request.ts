/**
 * 该文件可自行根据业务逻辑进行调整
 */
import type { RequestClientOptions } from '@vben/request';

import { useAppConfig } from '@vben/hooks';
import {
  authenticateResponseInterceptor,
  defaultResponseInterceptor,
  errorMessageResponseInterceptor,
  RequestClient,
} from '@vben/request';
import { useAccessStore } from '@vben/stores';

import { message } from 'ant-design-vue';

import { useAuthStore, useProjectStore } from '#/store';

const { apiURL } = useAppConfig(import.meta.env, import.meta.env.PROD);

/** 登录失效 */
const CODE_TOKEN_INVALID = 100_003;
/** 请求的项目与服务器记录的当前项目不一致 */
const CODE_PROJECT_MISMATCH = 100_027;

function createRequestClient(baseURL: string, options?: RequestClientOptions) {
  const client = new RequestClient({
    ...options,
    baseURL,
  });

  /**
   * 重新认证逻辑：后端没有刷新 token 接口，直接退出到登录页
   */
  async function doReAuthenticate() {
    const accessStore = useAccessStore();
    const authStore = useAuthStore();
    if (!accessStore.accessToken) return;
    accessStore.setAccessToken(null);
    await authStore.logout();
  }

  function formatToken(token: null | string) {
    return token ? `Bearer ${token}` : null;
  }

  // 请求头处理
  client.addRequestInterceptor({
    fulfilled: async (config) => {
      const accessStore = useAccessStore();
      config.headers.Authorization = formatToken(accessStore.accessToken);
      return config;
    },
  });

  // 业务错误码处理：登录失效、项目不一致
  client.addResponseInterceptor({
    fulfilled: async (response) => {
      const code = response.data?.code;
      if (code === CODE_TOKEN_INVALID) {
        await doReAuthenticate();
      } else if (code === CODE_PROJECT_MISMATCH) {
        void useProjectStore().recover();
      }
      return response;
    },
  });

  // 处理返回的响应数据格式
  client.addResponseInterceptor(
    defaultResponseInterceptor({
      codeField: 'code',
      dataField: 'data',
      successCode: 0,
    }),
  );

  // HTTP 401 的处理
  client.addResponseInterceptor(
    authenticateResponseInterceptor({
      client,
      doReAuthenticate,
      doRefreshToken: async () => '',
      enableRefreshToken: false,
      formatToken,
    }),
  );

  // 通用的错误处理，后端的错误信息放在 message 字段
  client.addResponseInterceptor(
    errorMessageResponseInterceptor((msg: string, error) => {
      const responseData = error?.response?.data ?? {};
      if (responseData?.code === CODE_TOKEN_INVALID) return;
      message.error(responseData?.message || msg);
    }),
  );

  return client;
}

export const requestClient = createRequestClient(apiURL, {
  responseReturn: 'data',
});

export const baseRequestClient = new RequestClient({ baseURL: apiURL });
