import type { SystemSetting } from '#/api/types';

import { ref } from 'vue';

import { updatePreferences } from '@vben/preferences';

import { defineStore } from 'pinia';

import { getSystemSettingApi } from '#/api';

const DEFAULT_LOGO = '/logo.svg';
const DEFAULT_FAVICON = '/favicon.ico';

/**
 * 系统设置（系统名称、Logo、浏览器图标、登录页文字、版权方）：启动时读取并应用，修改后立即生效。
 */
export const useSystemSettingStore = defineStore('system-setting', () => {
  const setting = ref<null | SystemSetting>(null);

  function apply(value: SystemSetting) {
    setting.value = value;
    updatePreferences({
      app: { name: value.appName },
      copyright: {
        companyName: value.copyright,
        companySiteLink: '',
        date: String(new Date().getFullYear()),
        enable: !!value.copyright,
        icp: '',
        settingShow: false,
      },
      footer: { enable: !!value.copyright },
      logo: { source: value.logo || DEFAULT_LOGO },
    });
    let link = document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
    if (!link) {
      link = Object.assign(document.createElement('link'), { rel: 'icon' });
      document.head.append(link);
    }
    link.href = value.favicon || DEFAULT_FAVICON;
  }

  /** 读取失败时沿用默认设置，不影响使用 */
  async function load() {
    try {
      apply(await getSystemSettingApi());
    } catch {
      // 使用 preferences.ts 里的默认值
    }
  }

  /** 退出登录时会重置所有 store；系统设置是全局的，登录页还要用，保留不清空 */
  function $reset() {}

  return { $reset, apply, load, setting };
});
