import { defineOverridesPreferences } from '@vben/preferences';

/**
 * @description 项目配置文件
 * 只需要覆盖项目中的一部分配置，不需要的配置不用覆盖，会自动使用默认配置
 * !!! 更改配置后请清空缓存，否则可能不生效
 */
export const overridesPreferences = defineOverridesPreferences({
  app: {
    // 菜单由后端按项目和角色返回
    accessMode: 'backend',
    defaultHomePath: '/manage/project',
    enableCheckUpdates: false,
    enableRefreshToken: false,
    locale: 'zh-CN',
    loginExpiredMode: 'page',
    name: import.meta.env.VITE_APP_TITLE,
  },
  copyright: {
    enable: false,
  },
  logo: {
    source: '/logo.svg',
  },
  widget: {
    globalSearch: false,
    languageToggle: false,
    lockScreen: false,
    notification: false,
    timezone: false,
  },
});
