import process from 'node:process';

import { defineConfig } from '@vben/vite-config';

import { loadEnv } from 'vite';

export default defineConfig(async ({ mode }) => {
  // 开发时 /api 开头的请求都转发到后端，地址在 .env.development 的 API_PROXY_TARGET 里配置。
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.API_PROXY_TARGET || 'http://localhost:9050';

  return {
    application: {},
    vite: {
      // monorepo 里 vue-router 因依赖解析不同装了两份，生产打包时布局包会用到另一份，
      // useRouter() 取不到应用注册的路由导致白屏；强制只用一份
      resolve: {
        dedupe: ['vue', 'vue-router', 'pinia'],
      },
      server: {
        proxy: {
          '/api': {
            changeOrigin: true,
            target,
          },
        },
      },
    },
  };
});
